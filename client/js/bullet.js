export class Bullet {
    constructor(x, y, angle, speed, radius = 5, owner = null) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = speed;
      this.radius = radius;
      this.owner = owner;
    }
  
    update() {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
    }
  
    draw(ctx, camera) {
      const drawX = this.x - camera.x;
      const drawY = this.y - camera.y;
  
      ctx.fillStyle = this.owner?.color || "#fff";
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  
    isOutOfBounds(width, height) {
      return (
        this.x < 0 || this.x > width ||
        this.y < 0 || this.y > height
      );
    }
  }
  