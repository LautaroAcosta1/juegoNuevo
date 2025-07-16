import { weaponTypes } from './weapons.js';
import { Bullet } from './bullet.js';

export class Player {
  constructor(name, color, x, y) {
    this.name = name;
    this.color = color;
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.life = 100;
    this.kills = 0;
    this.xVel = 0;

    this.isDead = false;

    // Animación / sprite
    this.frameWidth = 64;
    this.frameHeight = 64;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 200;
    this.startFrame = 0;
    this.endFrame = 1;
    this.isMoving = false;
    this.facing = 1;

    this.speed = 3;

    // Armas
    this.activeWeapon = "pistol"; // 🔫 arma actual
    this.lastShotTime = 0;        // ⏲️ para cooldown
  }

  update(deltaTime, keys) {
    this.isMoving = false;
    this.xVel = 0;

    if (keys.w || keys.ArrowUp) { this.y -= this.speed; this.isMoving = true; }
    if (keys.s || keys.ArrowDown) { this.y += this.speed; this.isMoving = true; }

    if (keys.a || keys.ArrowLeft) {
      this.x -= this.speed;
      this.isMoving = true;
      this.xVel = -this.speed;
      this.facing = -1;
    }

    if (keys.d || keys.ArrowRight) {
      this.x += this.speed;
      this.isMoving = true;
      this.xVel = this.speed;
      this.facing = 1;
    }

    // Animaciones
    this.startFrame = this.isMoving ? 2 : 0;
    this.endFrame = this.isMoving ? 5 : 1;

    this.frameTimer += deltaTime;
    if (this.frameTimer > this.frameInterval) {
      this.frameIndex = this.frameIndex >= this.endFrame ? this.startFrame : this.frameIndex + 1;
      this.frameTimer = 0;
    }
  }

  getCollisionBox() {
    return {
      x: this.x - 21,
      y: this.y + 14,
      width: 42,
      height: 46
    };
  }

  canShoot() {
    const weapon = weaponTypes[this.activeWeapon];
    return Date.now() - this.lastShotTime >= weapon.cooldown;
  }

  shoot(angle) {
    const weapon = weaponTypes[this.activeWeapon];
    this.lastShotTime = Date.now();

    const bullets = [];

    for (let i = 0; i < weapon.pellets; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread;
      const finalAngle = angle + spread;
      bullets.push(
        new Bullet(this.gunTipX, this.gunTipY, finalAngle, weapon.speed, weapon.radius, this, weapon.damage)
      );
    }

    return bullets;
  }

  getCurrentWeapon() {
    return weaponTypes[this.activeWeapon];
  }

  draw(ctx, camera, mouseWorldX, mouseWorldY, sprite) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    if (this.facing === 1) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.scale(2, 2);

    ctx.drawImage(
      sprite,
      this.frameIndex * this.frameWidth, 0,
      this.frameWidth, this.frameHeight,
      -this.frameWidth / 2, -this.frameHeight / 2,
      this.frameWidth, this.frameHeight
    );

    ctx.restore();

    // Nombre
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.fillStyle = "yellow";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, 0, +this.frameHeight / 2 + 44);
    ctx.restore();
  }



}
