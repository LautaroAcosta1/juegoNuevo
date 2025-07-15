// main.js
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Bullet } from './bullet.js';
import { RemotePlayer } from './remotePlayer.js';
import { checkCollision, circleRectCollision } from './utils.js';

const socket = io("http://localhost:3000");  // Cambia la URL si usás otro host o puerto

socket.on("connect", () => {
  console.log("Conectado con id:", socket.id);
});

const otherPlayers = {};

socket.on("updatePlayers", (playersData) => {
  for (const id in playersData) {
    if (id !== socket.id) {
      if (!otherPlayers[id]) {
        otherPlayers[id] = new RemotePlayer(
          playersData[id].x,
          playersData[id].y,
          playersData[id].facing,
          playersData[id].kills,
          playersData[id].life,
          playersData[id].name,
          playersData[id].aimAngle || 0 // 👈 Añadir este valor aquí
        );
      } else {
        const p = otherPlayers[id];
        p.targetX = playersData[id].x;
        p.targetY = playersData[id].y;
        p.facing = playersData[id].facing;
        p.kills = playersData[id].kills;
        p.life = playersData[id].life;
        p.aimAngle = playersData[id].aimAngle || 0;
        p.name = playersData[id].name;
      }
    } 
  }
});

socket.on("remoteBullet", (bulletData) => {
  // Crear una bala como si fuera local, pero con un dummy owner
  const dummyOwner = otherPlayers[bulletData.ownerId];
  if (!dummyOwner) return; // Asegurar que el jugador exista

  bullets.push(new Bullet(
    bulletData.x,
    bulletData.y,
    bulletData.angle,
    bulletData.speed,
    bulletData.damage,
    dummyOwner
  ));
});

socket.on("playerDisconnected", (id) => {
  delete otherPlayers[id];
});

const startBtn = document.getElementById("startBtn");
const menu = document.getElementById("menu");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player;
let enemies = [];
let bullets = [];
let keys = {};
let mouseX = 0;
let mouseY = 0;

const world = { width: 3000, height: 3000 };
const camera = { x: 0, y: 0, width: 0, height: 0 };

const images = {
  player: new Image()
};
images.player.src = "./assets/player.png";

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

async function init() {
  const name = document.getElementById("playerName").value.trim();
  const color = document.getElementById("playerColor").value;
  if (!name) return alert("Ingresá tu nombre para jugar");

  // 👉 Enviamos los datos al backend
  try {
    const res = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color })
    });
    const data = await res.json();
    if (data.status !== 'ok') {
      alert('Error al registrar jugador');
      return;
    }
  } catch (err) {
    alert('No se pudo conectar con el servidor');
    return;
  }

  player = new Player(name, color, world.width / 2, world.height / 2);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width;
  camera.height = canvas.height;

  enemies = [];
  bullets = [];

  for (let i = 0; i < 5; i++) {
    const x = Math.random() * world.width;
    const y = Math.random() * world.height;
    enemies.push(new Enemy(x, y));
  }

  menu.style.display = "none";
  canvas.style.display = "block";

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
  resizeCanvas();
  updateCamera();
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width;
  camera.height = canvas.height;
});


images.player.onload = () => {
  startBtn.addEventListener("click", init);
};

document.addEventListener("keydown", (e) => keys[e.key] = true);
document.addEventListener("keyup", (e) => keys[e.key] = false);

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", () => {
  const worldMouseX = camera.x + mouseX;
  const worldMouseY = camera.y + mouseY;
  const angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

  const bullet = new Bullet(player.gunTipX, player.gunTipY, angle, 6, 5, player);
  bullets.push(bullet);

  // 🔧 Definimos bulletData para enviar por socket
  const bulletData = {
    x: bullet.x,
    y: bullet.y,
    angle: bullet.angle,
    speed: bullet.speed,
    damage: bullet.damage,
    ownerId: socket.id
  };

  socket.emit("shootBullet", bulletData);
});

/*
function updateEnemies() {
  for (const enemy of enemies) {
    enemy.moveToward(player);
    enemy.updateCooldown();
    if (enemy.canShoot()) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      const bulletData = {
        x: player.gunTipX,
        y: player.gunTipY,
        angle: angle,
        speed: 6,
        damage: 5,
        ownerId: socket.id
      };
      bullets.push(new Bullet(bulletData.x, bulletData.y, bulletData.angle, bulletData.speed, bulletData.damage, player));

      enemy.resetShootCooldown();
    }
  }
}
*/

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.update();

    if (b.isOutOfBounds(world.width, world.height)) {
      bullets.splice(i, 1);
      continue;
    }

    // ✅ Colisión contra el jugador local (daño recibido)
    if (b.owner !== player && circleRectCollision(b, player.getCollisionBox())) {
      bullets.splice(i, 1);
      player.life--;
      if (player.life <= 0) {
        alert("¡Perdiste!");
        window.location.reload();
      }
      continue;
    }

    // ✅ Colisión contra jugadores remotos (daño causado)
    for (const id in otherPlayers) {
      const remote = otherPlayers[id];
      if (b.owner === player && circleRectCollision(b, remote.getCollisionBox())) {
        bullets.splice(i, 1); // Quitar bala solo localmente

        // Avisar al servidor que se dañó al jugador remoto
        socket.emit("playerHit", {
          targetId: id,
          damage: b.damage
        });

        break; // Salir del bucle, ya golpeó a un jugador
      }
    }
  }
}

function updateCamera() {
  if (!player) return; // <-- evita el error si player no está aún

  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
  camera.x = Math.max(0, Math.min(world.width - camera.width, camera.x));
  camera.y = Math.max(0, Math.min(world.height - camera.height, camera.y));
}

let lastTime = 0;
function gameLoop(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  updateCamera();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (player) {
    // 🧠 1. Mover jugador
    player.update(deltaTime, keys);

    // 🧱 2. Limitar movimiento dentro del mundo
    player.x = Math.max(player.radius, Math.min(world.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(world.height - player.radius, player.y));

    // 🔁 3. Colisión con otros jugadores
    for (const id in otherPlayers) {
      const other = otherPlayers[id];
      const dx = player.x - other.x;
      const dy = player.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = player.radius + other.radius;

      if (dist < minDist && dist !== 0) {
        const overlap = minDist - dist;
        const pushX = (dx / dist) * overlap;
        const pushY = (dy / dist) * overlap;

        player.x += pushX * 0.5; // suaviza el empuje
        player.y += pushY * 0.5;
      }
    }

    // 🎨 4. Dibujar jugador local
    player.draw(ctx, camera, mouseX + camera.x, mouseY + camera.y, images.player);

    /*
    // Ahora dibujamos el rectángulo de colisión para visualizarlo
    const colBox = player.getCollisionBox();
    ctx.save();
    ctx.strokeStyle = "blue";  // Color del rectángulo para que sea visible
    ctx.lineWidth = 2;
    ctx.strokeRect(
      colBox.x - camera.x,
      colBox.y - camera.y,
      colBox.width,
      colBox.height
    );
    ctx.restore();
    */

    // 🎯 5. Calcular ángulo de disparo
    const angleGun = Math.atan2((camera.y + mouseY) - player.y, (camera.x + mouseX) - player.x);

    // 📤 6. Enviar datos al servidor
    socket.emit("playerMove", {
      id: socket.id,
      x: player.x,
      y: player.y,
      facing: player.facing,
      kills: player.kills,
      life: player.life,
      name: player.name,
      aimAngle: angleGun
    });

    // 👥 7. Dibujar otros jugadores
    for (const id in otherPlayers) {
      const p = otherPlayers[id];
      p.update(deltaTime);
      p.draw(ctx, camera, images.player);
    }

    // 🔫 8. Dibujar arma local
    const angle = angleGun;
    const gunLength = 50;
    const originX = player.x;
    const originY = player.y + 45;
    const gunX = originX + Math.cos(angle) * gunLength;
    const gunY = originY + Math.sin(angle) * gunLength;

    player.gunTipX = gunX;
    player.gunTipY = gunY;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX - camera.x, originY - camera.y);
    ctx.lineTo(gunX - camera.x, gunY - camera.y);
    ctx.stroke();

    // ❤️ 9. Barra de vida del jugador local
    const barWidth = 200;
    const barHeight = 20;
    const x = 20;
    const y = canvas.height - barHeight - 20;
    const lifePercentage = Math.max(0, Math.min(player.life, 100)) / 100;

    ctx.fillStyle = "#555";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = lifePercentage > 0.5 ? "#0f0" : lifePercentage > 0.2 ? "#ff0" : "#f00";
    ctx.fillRect(x, y, barWidth * lifePercentage, barHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`Vida: ${player.life}`, x + 8, y + 15);
  }

  // 🧟‍♂️ Enemigos (por ahora siguen hasta que los saques)
  
  //updateEnemies();


  for (const enemy of enemies) enemy.draw(ctx, camera);

  updateBullets();
  for (const bullet of bullets) bullet.draw(ctx, camera);

  requestAnimationFrame(gameLoop);
}



