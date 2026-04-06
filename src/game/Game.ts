import { Vector } from './Vector';
import { Grid } from './Grid';
import { Player, Enemy, Bullet, Particle } from './Entities';
import { AudioEngine } from './AudioEngine';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  
  grid: Grid;
  player: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  particles: Particle[] = [];
  
  keys: { [key: string]: boolean } = {};
  mouse = { pos: new Vector(0, 0), down: false };
  
  lastTime: number = 0;
  score: number = 0;
  multiplier: number = 1;
  multiplierTimer: number = 0;
  lives: number = 3;
  level: number = 1;
  xp: number = 0;
  maxXp: number = 100;
  isGameOver: boolean = false;
  isDestroyed: boolean = false;
  isPaused: boolean = false;
  
  spawnTimer: number = 0;
  spawnRate: number = 2.0;
  
  audio: AudioEngine;
  
  onGameOver: (score: number) => void;
  onStateUpdate: (score: number, multiplier: number, lives: number, level: number, xp: number, maxXp: number) => void;
  onLevelUpCallback?: () => void;
  
  constructor(canvas: HTMLCanvasElement, onGameOver: (score: number) => void, onStateUpdate: (score: number, mult: number, lives: number, level: number, xp: number, maxXp: number) => void, onLevelUpCallback?: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.onGameOver = onGameOver;
    this.onStateUpdate = onStateUpdate;
    this.onLevelUpCallback = onLevelUpCallback;
    
    this.audio = new AudioEngine();
    
    this.grid = new Grid(this.width, this.height, 40);
    this.player = new Player(new Vector(this.width / 2, this.height / 2));
    
    // Event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mouseup', this.handleMouseUp);
  }
  
  destroy() {
    this.isDestroyed = true;
    this.audio.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
  }
  
  handleKeyDown = (e: KeyboardEvent) => { this.keys[e.key] = true; }
  handleKeyUp = (e: KeyboardEvent) => { this.keys[e.key] = false; }
  handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.pos.x = e.clientX - rect.left;
    this.mouse.pos.y = e.clientY - rect.top;
  }
  handleMouseDown = () => { this.mouse.down = true; }
  handleMouseUp = () => { this.mouse.down = false; }
  
  start() {
    this.audio.play();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }
  
  loop = (time: number) => {
    if (this.isDestroyed) return;
    
    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    
    this.update(dt);
    this.draw();
    
    requestAnimationFrame(this.loop);
  }
  
  spawnEnemy() {
    const types = ['wanderer', 'chaser', 'weaver', 'blackhole'];
    // Make blackhole less common
    const type = Math.random() < 0.05 ? 'blackhole' : types[Math.floor(Math.random() * 3)];
    
    // Spawn outside player radius
    let pos: Vector;
    do {
      pos = new Vector(Math.random() * this.width, Math.random() * this.height);
    } while (pos.dist(this.player.pos) < 300);
    
    const healthMultiplier = 1 + (this.level - 1) * 0.4; // 40% more health per level
    
    // Sometimes spawn a group
    if (Math.random() < 0.2) {
      const count = Math.floor(Math.random() * 4) + 3; // 3 to 6 enemies
      for (let i = 0; i < count; i++) {
        const offset = new Vector((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100);
        this.enemies.push(new Enemy(pos.add(offset), type, healthMultiplier));
      }
    } else {
      this.enemies.push(new Enemy(pos, type, healthMultiplier));
    }
  }
  
  createExplosion(pos: Vector, color: string, count: number) {
    this.audio.playExplosionSound();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 50;
      const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.particles.push(new Particle(pos.copy(), vel, color, Math.random() * 0.5 + 0.2));
    }
    this.grid.applyExplosiveForce(150, pos, 150);
  }
  
  applyUpgrade(upgradeId: string) {
    switch (upgradeId) {
      case 'fire_rate':
        this.player.fireRateMultiplier *= 1.5;
        break;
      case 'speed':
        this.player.speedMultiplier *= 1.3;
        break;
      case 'shotgun':
        this.player.weaponType = 'shotgun';
        break;
      case 'laser':
        this.player.weaponType = 'laser';
        break;
      case 'fire_damage':
        this.player.damageType = 'fire';
        break;
      case 'poison_damage':
        this.player.damageType = 'poison';
        break;
      case 'ice_damage':
        this.player.damageType = 'ice';
        break;
    }
  }

  killEnemy(enemy: Enemy) {
    if (enemy.isDead) return;
    enemy.isDead = true;
    
    this.score += enemy.value * this.multiplier;
    this.multiplier = Math.min(10, this.multiplier + 1);
    this.multiplierTimer = 2.0; // 2 seconds to keep multiplier
    
    this.xp += Math.floor(enemy.value / 10);
    while (this.xp >= this.maxXp) {
      this.xp -= this.maxXp;
      this.level += 1;
      this.maxXp = Math.floor(this.maxXp * 1.5);
      this.isPaused = true;
      if (this.onLevelUpCallback) this.onLevelUpCallback();
    }
    
    this.onStateUpdate(this.score, this.multiplier, this.lives, this.level, this.xp, this.maxXp);
    
    this.createExplosion(enemy.pos, enemy.color, 20);
  }

  update(dt: number) {
    if (this.isDestroyed || this.isPaused) return;
    if (this.width !== this.canvas.width || this.height !== this.canvas.height) {
      this.width = this.canvas.width;
      this.height = this.canvas.height;
      this.grid = new Grid(this.width, this.height, 40);
    }
    
    this.grid.update();
    
    if (!this.isGameOver) {
      this.player.update(dt, this);
      
      // Spawn enemies
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnRate = Math.max(0.2, this.spawnRate * 0.98); // Get faster over time
        this.spawnTimer = this.spawnRate;
      }
      
      // Multiplier decay
      if (this.multiplier > 1) {
        this.multiplierTimer -= dt;
        if (this.multiplierTimer <= 0) {
          this.multiplier = 1;
          this.onStateUpdate(this.score, this.multiplier, this.lives, this.level, this.xp, this.maxXp);
        }
      }
    }
    
    for (const bullet of this.bullets) bullet.update(dt, this);
    for (const enemy of this.enemies) enemy.update(dt, this);
    for (const particle of this.particles) particle.update(dt, this);
    
    if (!this.isGameOver) {
      // Collisions
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        
        // Player vs Enemy
        if (!this.player.isInvulnerable && enemy.pos.dist(this.player.pos) < enemy.radius + this.player.radius) {
          this.createExplosion(this.player.pos, this.player.color, 100);
          this.lives -= 1;
          this.onStateUpdate(this.score, this.multiplier, this.lives, this.level, this.xp, this.maxXp);
          
          if (this.lives <= 0) {
            this.isGameOver = true;
            this.onGameOver(this.score);
          } else {
            // Respawn
            this.player.pos = new Vector(this.width / 2, this.height / 2);
            this.player.vel = new Vector(0, 0);
            this.player.makeInvulnerable(2.0);
            this.enemies = []; // Clear enemies on death
            this.bullets = [];
            this.particles = [];
            this.multiplier = 1;
            this.onStateUpdate(this.score, this.multiplier, this.lives, this.level, this.xp, this.maxXp);
          }
          return;
        }
        
        // Bullet vs Enemy
        for (let j = this.bullets.length - 1; j >= 0; j--) {
          const bullet = this.bullets[j];
          if (bullet.pos.dist(enemy.pos) < bullet.radius + enemy.radius) {
            if (bullet.weaponType === 'laser') {
              if (bullet.piercedEnemies.has(enemy)) continue;
              bullet.piercedEnemies.add(enemy);
            } else {
              bullet.isDead = true;
            }
            
            enemy.health -= 1;
            
            if (bullet.damageType === 'fire') enemy.fireTimer = 3.0;
            if (bullet.damageType === 'poison') enemy.poisonTimer = 5.0;
            if (bullet.damageType === 'ice') enemy.iceTimer = 2.0;
            
            if (enemy.health <= 0) {
              this.killEnemy(enemy);
            } else {
              // Small explosion for hit
              this.createExplosion(enemy.pos, enemy.color, 5);
            }
            if (bullet.isDead) break;
          }
        }
      }
    }
    
    // Cleanup dead entities
    this.bullets = this.bullets.filter(b => !b.isDead);
    this.enemies = this.enemies.filter(e => !e.isDead);
    this.particles = this.particles.filter(p => !p.isDead);
  }
  
  draw() {
    // Clear with dark background and slight trail effect
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Add bloom effect
    this.ctx.globalCompositeOperation = 'lighter';
    
    this.grid.draw(this.ctx);
    
    for (const particle of this.particles) particle.draw(this.ctx);
    for (const bullet of this.bullets) bullet.draw(this.ctx);
    for (const enemy of this.enemies) enemy.draw(this.ctx);
    if (!this.isGameOver) this.player.draw(this.ctx);
    
    // Draw crosshair
    if (!this.isGameOver && !this.isPaused) {
      this.ctx.save();
      this.ctx.translate(this.mouse.pos.x, this.mouse.pos.y);
      this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(-10, 0);
      this.ctx.lineTo(-3, 0);
      this.ctx.moveTo(3, 0);
      this.ctx.lineTo(10, 0);
      this.ctx.moveTo(0, -10);
      this.ctx.lineTo(0, -3);
      this.ctx.moveTo(0, 3);
      this.ctx.lineTo(0, 10);
      this.ctx.moveTo(4, 0);
      this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
  }
}
