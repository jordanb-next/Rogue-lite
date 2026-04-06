export class Vector {
  constructor(public x: number, public y: number) {}
  
  add(v: Vector) { return new Vector(this.x + v.x, this.y + v.y); }
  sub(v: Vector) { return new Vector(this.x - v.x, this.y - v.y); }
  mult(n: number) { return new Vector(this.x * n, this.y * n); }
  div(n: number) { return new Vector(this.x / n, this.y / n); }
  mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  magSq() { return this.x * this.x + this.y * this.y; }
  normalize() {
    const m = this.mag();
    if (m !== 0) return this.div(m);
    return new Vector(0, 0);
  }
  limit(max: number) {
    if (this.magSq() > max * max) {
      return this.normalize().mult(max);
    }
    return new Vector(this.x, this.y);
  }
  dist(v: Vector) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  copy() { return new Vector(this.x, this.y); }
}
