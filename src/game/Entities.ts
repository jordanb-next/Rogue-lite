import { Vector } from './Vector';

export abstract class Entity {
  pos: Vector;
  vel: Vector;
  radius: number;
  color: string;
  isDead: boolean = false;
  
  constructor(pos: Vector, radius: number, color: string) {
    this.pos = pos;
    this.vel = new Vector(0, 0);
    this.radius = radius;
    this.color = color;
  }
  
  abstract update(dt: number, game: any): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}

export class Player extends Entity {
  cooldown: number = 0;
  invulnerableTimer: number = 0;
  
  fireRateMultiplier: number = 1;
  speedMultiplier: number = 1;
  weaponType: 'default' | 'shotgun' | 'laser' = 'default';
  damageType: 'default' | 'fire' | 'poison' | 'ice' = 'default';
  
  constructor(pos: Vector) {
    super(pos, 12, '#00ffff');
  }

  get isInvulnerable() {
    return this.invulnerableTimer > 0;
  }

  makeInvulnerable(time: number) {
    this.invulnerableTimer = time;
  }
  
  update(dt: number, game: any) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
    // Input handling
    const maxSpeed = 400 * this.speedMultiplier;
    const accel = 2000 * this.speedMultiplier;
    const friction = Math.pow(0.05, dt); // frame-rate independent friction
    
    let moveDir = new Vector(0, 0);
    if (game.keys['w'] || game.keys['ArrowUp']) moveDir.y -= 1;
    if (game.keys['s'] || game.keys['ArrowDown']) moveDir.y += 1;
    if (game.keys['a'] || game.keys['ArrowLeft']) moveDir.x -= 1;
    if (game.keys['d'] || game.keys['ArrowRight']) moveDir.x += 1;
    
    if (moveDir.magSq() > 0) {
      moveDir = moveDir.normalize();
      this.vel = this.vel.add(moveDir.mult(accel * dt));
      if (this.vel.magSq() > maxSpeed * maxSpeed) {
        this.vel = this.vel.normalize().mult(maxSpeed);
      }
    } else {
      this.vel = this.vel.mult(friction);
    }
    
    this.pos = this.pos.add(this.vel.mult(dt));
    
    // Bounds checking
    this.pos.x = Math.max(this.radius, Math.min(game.width - this.radius, this.pos.x));
    this.pos.y = Math.max(this.radius, Math.min(game.height - this.radius, this.pos.y));
    
    // Shooting
    if (this.cooldown > 0) this.cooldown -= dt;
    
    let shootDir = new Vector(0, 0);
    if (game.mouse.down) {
       shootDir = game.mouse.pos.sub(this.pos).normalize();
    } else {
       // Support for dual stick or arrow keys to shoot
       if (game.keys['i']) shootDir.y -= 1;
       if (game.keys['k']) shootDir.y += 1;
       if (game.keys['j']) shootDir.x -= 1;
       if (game.keys['l']) shootDir.x += 1;
       if (shootDir.magSq() > 0) shootDir = shootDir.normalize();
    }
    
    if (shootDir.magSq() > 0 && this.cooldown <= 0) {
      this.cooldown = 0.1 / this.fireRateMultiplier; // 10 shots per second base
      
      if (this.weaponType === 'shotgun') {
        for (let i = -2; i <= 2; i++) {
           const angle = Math.atan2(shootDir.y, shootDir.x) + i * 0.15;
           const dir = new Vector(Math.cos(angle), Math.sin(angle));
           game.bullets.push(new Bullet(this.pos.copy(), dir.mult(800), this.damageType, this.weaponType));
        }
      } else if (this.weaponType === 'laser') {
        game.bullets.push(new Bullet(this.pos.copy(), shootDir.mult(1500), this.damageType, this.weaponType));
      } else {
        game.bullets.push(new Bullet(this.pos.copy(), shootDir.mult(800), this.damageType, this.weaponType));
      }
      
      game.audio.playShootSound();
      // Recoil effect on grid
      game.grid.applyDirectedForce(shootDir.mult(-50), this.pos, 100);
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    if (this.isInvulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
      return; // Blinking effect
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    if (this.vel.magSq() > 0) {
      ctx.rotate(Math.atan2(this.vel.y, this.vel.x));
    }
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.stroke();
    
    ctx.restore();
  }
}

export class Bullet extends Entity {
  damageType: string;
  weaponType: string;
  piercedEnemies: Set<Enemy> = new Set();
  
  constructor(pos: Vector, vel: Vector, damageType: string = 'default', weaponType: string = 'default') {
    let color = '#ffff00';
    if (damageType === 'fire') color = '#ff4400';
    else if (damageType === 'poison') color = '#00ff44';
    else if (damageType === 'ice') color = '#00ccff';
    else if (weaponType === 'laser') color = '#ff00ff';
    
    super(pos, weaponType === 'laser' ? 2 : 3, color);
    this.vel = vel;
    this.damageType = damageType;
    this.weaponType = weaponType;
  }
  
  update(dt: number, game: any) {
    this.pos = this.pos.add(this.vel.mult(dt));
    if (this.pos.x < 0 || this.pos.x > game.width || this.pos.y < 0 || this.pos.y > game.height) {
      this.isDead = true;
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.weaponType === 'laser' ? 4 : 3;
    ctx.beginPath();
    const tailLength = this.weaponType === 'laser' ? 0.05 : 0.02;
    ctx.moveTo(this.pos.x - this.vel.x * tailLength, this.pos.y - this.vel.y * tailLength);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.stroke();
  }
}

export class Enemy extends Entity {
  type: string;
  value: number;
  health: number = 1;
  maxHealth: number = 1;
  
  fireTimer: number = 0;
  poisonTimer: number = 0;
  iceTimer: number = 0;
  
  constructor(pos: Vector, type: string, healthMultiplier: number = 1) {
    let radius = 10;
    let color = '#ff0000';
    let value = 100;
    let baseHealth = 1;
    
    if (type === 'wanderer') {
      color = '#ff00ff';
      radius = 12;
      value = 50;
      baseHealth = 2;
    } else if (type === 'chaser') {
      color = '#00ff00';
      radius = 10;
      value = 100;
      baseHealth = 3;
    } else if (type === 'weaver') {
      color = '#ff8800';
      radius = 8;
      value = 150;
      baseHealth = 4;
    } else if (type === 'blackhole') {
      color = '#8800ff';
      radius = 20;
      value = 500;
      baseHealth = 15;
    }
    
    super(pos, radius, color);
    this.type = type;
    this.value = value;
    this.health = Math.ceil(baseHealth * healthMultiplier);
    this.maxHealth = this.health;
    
    if (this.type === 'wanderer') {
      this.vel = new Vector(Math.random() - 0.5, Math.random() - 0.5).normalize().mult(100);
    }
  }
  
  update(dt: number, game: any) {
    // Apply status effects
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
      this.health -= 5 * dt; // 5 damage per second
      if (Math.random() < 0.1) game.particles.push(new Particle(this.pos.copy(), new Vector(Math.random()-0.5, Math.random()-0.5).mult(50), '#ff4400', 0.5));
    }
    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.health -= 2 * dt; // 2 damage per second, lasts longer
      if (Math.random() < 0.05) game.particles.push(new Particle(this.pos.copy(), new Vector(Math.random()-0.5, Math.random()-0.5).mult(30), '#00ff44', 0.5));
    }
    
    let speedMult = 1;
    if (this.iceTimer > 0) {
      this.iceTimer -= dt;
      speedMult = 0.5; // 50% slower
      if (Math.random() < 0.1) game.particles.push(new Particle(this.pos.copy(), new Vector(Math.random()-0.5, Math.random()-0.5).mult(20), '#00ccff', 0.3));
    }
    
    if (this.health <= 0 && !this.isDead) {
      game.killEnemy(this);
      return;
    }

    if (this.type === 'wanderer') {
      // Bounce off walls
      if (this.pos.x < this.radius || this.pos.x > game.width - this.radius) this.vel.x *= -1;
      if (this.pos.y < this.radius || this.pos.y > game.height - this.radius) this.vel.y *= -1;
      this.pos = this.pos.add(this.vel.mult(dt * speedMult));
    } else if (this.type === 'chaser') {
      const dir = game.player.pos.sub(this.pos).normalize();
      this.vel = this.vel.add(dir.mult(400 * dt)).limit(150);
      this.pos = this.pos.add(this.vel.mult(dt * speedMult));
    } else if (this.type === 'weaver') {
      const dir = game.player.pos.sub(this.pos).normalize();
      // Add some perpendicular movement
      const perp = new Vector(-dir.y, dir.x).mult(Math.sin(Date.now() / 200) * 200);
      this.vel = dir.mult(180).add(perp);
      this.pos = this.pos.add(this.vel.mult(dt * speedMult));
    } else if (this.type === 'blackhole') {
      // Pull player and other enemies
      const playerDistSq = this.pos.dist(game.player.pos) ** 2;
      if (playerDistSq < 90000) { // 300 radius
        const pull = this.pos.sub(game.player.pos).normalize().mult(100000 / (100 + playerDistSq));
        game.player.vel = game.player.vel.add(pull.mult(dt));
      }
      
      for (const enemy of game.enemies) {
        if (enemy === this) continue;
        const distSq = this.pos.dist(enemy.pos) ** 2;
        if (distSq < 90000) {
          const pull = this.pos.sub(enemy.pos).normalize().mult(100000 / (100 + distSq));
          enemy.vel = enemy.vel.add(pull.mult(dt));
        }
      }
      
      // Affect grid
      game.grid.applyImplosiveForce(15, this.pos, 200);
      this.pos = this.pos.add(this.vel.mult(dt * speedMult));
    }
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    
    if (this.type === 'wanderer') {
      ctx.rotate(Date.now() / 500);
      ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    } else if (this.type === 'chaser') {
      ctx.rotate(Math.atan2(this.vel.y, this.vel.x));
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(-this.radius, this.radius);
      ctx.lineTo(-this.radius, -this.radius);
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'weaver') {
      ctx.rotate(Date.now() / 200);
      ctx.beginPath();
      ctx.moveTo(0, -this.radius);
      ctx.lineTo(this.radius, 0);
      ctx.lineTo(0, this.radius);
      ctx.lineTo(-this.radius, 0);
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'blackhole') {
      ctx.rotate(-Date.now() / 300);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw health
      ctx.fillStyle = this.color;
      ctx.globalAlpha = Math.max(0, this.health / this.maxHealth);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    
    ctx.restore();
  }
}

export class Particle extends Entity {
  life: number;
  maxLife: number;
  prevPos: Vector;
  
  constructor(pos: Vector, vel: Vector, color: string, life: number = 0.5) {
    super(pos, 2, color);
    this.vel = vel;
    this.life = life;
    this.maxLife = life;
    this.prevPos = pos.copy();
  }
  
  update(dt: number, game: any) {
    this.prevPos = this.pos.copy();
    this.pos = this.pos.add(this.vel.mult(dt));
    this.vel = this.vel.mult(0.95); // Friction
    this.life -= dt;
    if (this.life <= 0) this.isDead = true;
  }
  
  draw(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.beginPath();
    ctx.moveTo(this.pos.x - this.vel.x * 0.05, this.pos.y - this.vel.y * 0.05);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}
