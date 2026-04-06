import { Vector } from './Vector';

class PointMass {
  pos: Vector;
  basePos: Vector;
  vel: Vector;
  acc: Vector;
  damping: number = 0.85;
  inverseMass: number;
  
  constructor(x: number, y: number, invMass: number) {
    this.pos = new Vector(x, y);
    this.basePos = new Vector(x, y);
    this.vel = new Vector(0, 0);
    this.acc = new Vector(0, 0);
    this.inverseMass = invMass;
  }
  
  applyForce(force: Vector) {
    this.acc = this.acc.add(force.mult(this.inverseMass));
  }
  
  update() {
    this.vel = this.vel.add(this.acc);
    this.pos = this.pos.add(this.vel);
    this.vel = this.vel.mult(this.damping);
    this.acc = new Vector(0, 0);
  }
}

class Spring {
  end1: PointMass;
  end2: PointMass;
  targetLength: number;
  stiffness: number;
  damping: number;
  
  constructor(end1: PointMass, end2: PointMass, stiffness: number, damping: number) {
    this.end1 = end1;
    this.end2 = end2;
    this.targetLength = end1.pos.dist(end2.pos);
    this.stiffness = stiffness;
    this.damping = damping;
  }
  
  update() {
    const x = this.end1.pos.x - this.end2.pos.x;
    const y = this.end1.pos.y - this.end2.pos.y;
    const length = Math.sqrt(x * x + y * y);
    
    if (length > 0) {
      const xTarget = (x / length) * (length - this.targetLength);
      const yTarget = (y / length) * (length - this.targetLength);
      
      const dvx = this.end2.vel.x - this.end1.vel.x;
      const dvy = this.end2.vel.y - this.end1.vel.y;
      
      const forceX = (xTarget * this.stiffness) - (dvx * this.damping);
      const forceY = (yTarget * this.stiffness) - (dvy * this.damping);
      
      this.end1.applyForce(new Vector(-forceX, -forceY));
      this.end2.applyForce(new Vector(forceX, forceY));
    }
  }
}

export class Grid {
  points: PointMass[][] = [];
  springs: Spring[] = [];
  width: number;
  height: number;
  spacing: number;
  
  constructor(width: number, height: number, spacing: number) {
    this.width = width;
    this.height = height;
    this.spacing = spacing;
    
    const numColumns = Math.floor(width / spacing) + 2;
    const numRows = Math.floor(height / spacing) + 2;
    
    const offsetX = (width - (numColumns - 1) * spacing) / 2;
    const offsetY = (height - (numRows - 1) * spacing) / 2;
    
    for (let y = 0; y < numRows; y++) {
      this.points[y] = [];
      for (let x = 0; x < numColumns; x++) {
        const isEdge = x === 0 || y === 0 || x === numColumns - 1 || y === numRows - 1;
        this.points[y][x] = new PointMass(offsetX + x * spacing, offsetY + y * spacing, isEdge ? 0 : 1);
      }
    }
    
    for (let y = 0; y < numRows; y++) {
      for (let x = 0; x < numColumns; x++) {
        if (x === 0 || y === 0 || x === numColumns - 1 || y === numRows - 1) continue;
        
        if (x > 0) this.springs.push(new Spring(this.points[y][x], this.points[y][x - 1], 0.28, 0.06));
        if (y > 0) this.springs.push(new Spring(this.points[y][x], this.points[y - 1][x], 0.28, 0.06));
      }
    }
  }
  
  applyDirectedForce(force: Vector, position: Vector, radius: number) {
    for (let y = 0; y < this.points.length; y++) {
      for (let x = 0; x < this.points[y].length; x++) {
        const p = this.points[y][x];
        const distSq = position.dist(p.pos) ** 2;
        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const factor = (radius - dist) / radius;
          p.applyForce(force.mult(factor));
        }
      }
    }
  }
  
  applyImplosiveForce(force: number, position: Vector, radius: number) {
    for (let y = 0; y < this.points.length; y++) {
      for (let x = 0; x < this.points[y].length; x++) {
        const p = this.points[y][x];
        const distSq = position.dist(p.pos) ** 2;
        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const factor = (radius - dist) / radius;
          const dir = position.sub(p.pos);
          if (dir.magSq() > 0) {
            p.applyForce(dir.normalize().mult(force * factor));
          }
        }
      }
    }
  }
  
  applyExplosiveForce(force: number, position: Vector, radius: number) {
    for (let y = 0; y < this.points.length; y++) {
      for (let x = 0; x < this.points[y].length; x++) {
        const p = this.points[y][x];
        const distSq = position.dist(p.pos) ** 2;
        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const factor = (radius - dist) / radius;
          const dir = p.pos.sub(position);
          if (dir.magSq() > 0) {
            p.applyForce(dir.normalize().mult(force * factor));
          }
        }
      }
    }
  }
  
  update() {
    for (const spring of this.springs) spring.update();
    for (const row of this.points) {
      for (const p of row) {
        const restore = p.basePos.sub(p.pos).mult(0.05);
        p.applyForce(restore);
        p.update();
      }
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let y = 0; y < this.points.length; y++) {
      for (let x = 0; x < this.points[y].length; x++) {
        const p = this.points[y][x];
        if (x > 0) {
          const pLeft = this.points[y][x - 1];
          ctx.moveTo(p.pos.x, p.pos.y);
          ctx.lineTo(pLeft.pos.x, pLeft.pos.y);
        }
        if (y > 0) {
          const pUp = this.points[y - 1][x];
          ctx.moveTo(p.pos.x, p.pos.y);
          ctx.lineTo(pUp.pos.x, pUp.pos.y);
        }
      }
    }
    ctx.stroke();
  }
}
