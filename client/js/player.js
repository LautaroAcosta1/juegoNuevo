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


    // SPRITE
    this.frameWidth = 64;
    this.frameHeight = 64;

    this.frameIndex = 0;
    this.frameTimer = 0;
    this.frameInterval = 200; // velocidad de la animación (ms)
    this.startFrame = 0;
    this.endFrame = 1;
    this.isMoving = false;
    this.facing = 1; // 1 = derecha, -1 = izquierda

    this.speed = 3;
  }

  update(deltaTime, keys) {
    this.isMoving = false;
    this.xVel = 0;
  
    if (keys.w || keys.ArrowUp) { this.y -= this.speed; this.isMoving = true; }
    if (keys.s || keys.ArrowDown) { this.y += this.speed; this.isMoving = true; }
    if (keys.a || keys.ArrowLeft) { this.x -= this.speed; this.isMoving = true; this.xVel = -this.speed; }
    if (keys.d || keys.ArrowRight) { this.x += this.speed; this.isMoving = true; this.xVel = this.speed; }

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


    // Animaciones según movimiento
    if (this.isMoving) {
      this.startFrame = 2;
      this.endFrame = 5;  // Run: 2-5
    } else {
      this.startFrame = 0;
      this.endFrame = 1;  // Idle: 0-1
    }

    // Avance de animación
    this.frameTimer += deltaTime;
    if (this.frameTimer > this.frameInterval) {
      this.frameIndex++;
      if (this.frameIndex > this.endFrame) {
        this.frameIndex = this.startFrame;
      }
      this.frameTimer = 0;
    }
  }

  getCollisionBox() {
    return {
      x: this.x - 21,   // Centrado horizontalmente (64 / 2)
      y: this.y + 14,   // Bajamos el rectángulo (ajustalo según el cuerpo)
      width: 42,
      height: 46,        // Alto que cubre el torso/piernas
    };
  }



  draw(ctx, camera, mouseWorldX, mouseWorldY, sprite) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    ctx.save();
    ctx.translate(screenX, screenY);

    if (this.facing === 1) {
      ctx.scale(-1, 1);
    }

    ctx.imageSmoothingEnabled = false;
    const scale = 2;
    ctx.scale(scale, scale);

    // Dibuja el sprite
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
    ctx.fillStyle = "yellow";
    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, 0, +this.frameHeight / 2 + 44);
    ctx.restore();

    // debug para dibujar el rectángulo de colisión en rojo (debug)
    //const collision = this.getCollisionBox();
    //ctx.save();
    //ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    //ctx.fillRect(collision.x - camera.x, collision.y - camera.y, collision.width, collision.height);
    //ctx.restore();
}

}
