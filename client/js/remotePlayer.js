export class RemotePlayer {
  constructor(x, y, facing = 1, kills = 0, life = 5) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.prevX = x;
    this.prevY = y;

    this.facing = facing;
    this.kills = kills;
    this.life = life;

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

    // Verificar si está moviéndose
    const moving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
    this.isMoving = moving;

    // Elegir animación
    if (this.isMoving) {
      this.startFrame = 2;
      this.endFrame = 5; // Run
    } else {
      this.startFrame = 0;
      this.endFrame = 1; // Idle
    }

    // Avance de frames
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

    // Flip si está mirando a la derecha
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
  }
}
