export class Enemy {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 20;
      this.color = "#e74c3c";
      this.speed = 2;
      this.life = 3;
      this.kills = 0;
      this.name = "Bot" + Math.floor(Math.random() * 1000);
      this.shootCooldown = 0;
    }
  
    moveToward(target) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    }
  
    canShoot() {
      return this.shootCooldown <= 0;
    }
  
    resetShootCooldown() {
      this.shootCooldown = 120;
    }
  
    updateCooldown() {
      if (this.shootCooldown > 0) this.shootCooldown--;
    }
  
    draw(ctx, camera) {
      const drawX = this.x - camera.x;
      const drawY = this.y - camera.y;
  
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
      ctx.fill();
  
      ctx.fillStyle = "#fff";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.name, drawX, drawY - this.radius - 10);
  
      // Vida
      ctx.fillStyle = "red";
      ctx.fillRect(drawX - this.radius, drawY - this.radius - 6, this.radius * 2, 4);
      ctx.fillStyle = "lime";
      ctx.fillRect(drawX - this.radius, drawY - this.radius - 6, (this.life / 3) * this.radius * 2, 4);
    }
  }
  