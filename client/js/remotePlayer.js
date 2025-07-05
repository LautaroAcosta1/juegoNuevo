export class RemotePlayer {
  constructor(x, y, facing = 1, kills = 0, life = 5, name, aimAngle = 0) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.prevX = x;
    this.prevY = y;
    this.radius = 30; // mismo radio que el jugador local


    this.facing = facing;
    this.kills = kills;
    this.life = life;
    this.name = name;
    this.aimAngle = aimAngle;

    this.frameWidth = 64;
    this.frameHeight = 64;
    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 200;
    this.startFrame = 0;
    this.endFrame = 1;
    this.isMoving = false;
  }

  update(deltaTime) {
    const lerpFactor = 0.1;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    this.x += dx * lerpFactor;
    this.y += dy * lerpFactor;

    this.isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;

    this.startFrame = this.isMoving ? 2 : 0;
    this.endFrame = this.isMoving ? 5 : 1;

    this.frameTimer += deltaTime;
    if (this.frameTimer > this.frameInterval) {
      this.frameIndex++;
      if (this.frameIndex > this.endFrame) {
        this.frameIndex = this.startFrame;
      }
      this.frameTimer = 0;
    }
  }

  draw(ctx, camera, sprite) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    if (this.facing === 1) {
      ctx.scale(-1, 1);
    }

    const scale = 2;
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      sprite,
      this.frameIndex * this.frameWidth, 0,
      this.frameWidth, this.frameHeight,
      -this.frameWidth / 2, -this.frameHeight / 2,
      this.frameWidth, this.frameHeight
    );

    ctx.restore();

    // dibujar el nombre
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.fillStyle = "white";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, 0, +this.frameHeight / 2 + 52);
    ctx.restore();

    // 🔫 Dibujar el arma con el ángulo recibido
    const gunLength = 50;
    const originX = this.x;
    const originY = this.y + 45;
    const gunX = originX + Math.cos(this.aimAngle) * gunLength;
    const gunY = originY + Math.sin(this.aimAngle) * gunLength;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX - camera.x, originY - camera.y);
    ctx.lineTo(gunX - camera.x, gunY - camera.y);
    ctx.stroke();

    // --- Barra de vida pequeña debajo del sprite ---
    const barWidth = 40;
    const barHeight = 5;
    const lifeRatio = Math.max(0, Math.min(this.life, 100)) / 100;

    const barX = this.x - barWidth / 2;
    const barY = this.y + this.frameHeight / 2 + 36;

    // Fondo gris
    ctx.fillStyle = "#333";
    ctx.fillRect(barX - camera.x, barY - camera.y, barWidth, barHeight);

    // Vida (verde, amarillo, rojo)
    ctx.fillStyle = lifeRatio > 0.5 ? "#0f0" : lifeRatio > 0.2 ? "#ff0" : "#f00";
    ctx.fillRect(barX - camera.x, barY - camera.y, barWidth * lifeRatio, barHeight);

  }

}
