// bloodParticle.js
export class BloodParticle {
  constructor(x, y, angle, speed, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.lifetime = lifetime;
    this.age = 0;
    this.size = 2; // tamaño en pixeles (cuadrado pequeño)
  }

  update(deltaTime) {
    this.age += deltaTime;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
  }

  isDead() {
    return this.age >= this.lifetime;
  }

  draw(ctx, camera) {
    const alpha = 1 - this.age / this.lifetime; // para que se desvanezca
    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = "red"; // o un rojo más oscuro, según quieras
    ctx.imageSmoothingEnabled = false; // importante para mantener pixel art nítido

    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.fillRect(screenX, screenY, this.size, this.size);

    ctx.restore();
  }
}
