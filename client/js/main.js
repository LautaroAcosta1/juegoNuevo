// main.js
import { Player } from './player.js';
import { Bullet } from './bullet.js';
import { RemotePlayer } from './remotePlayer.js';
import { checkCollision, circleRectCollision } from './utils.js';

const socket = io("http://localhost:3000");  // Cambia la URL si usás otro host o puerto

socket.on("connect", () => {
  console.log("Conectado con id:", socket.id);
});

let topRanking = [];

socket.on("updateRanking", (rankingData) => {
  topRanking = rankingData;

  // Eliminamos jugadores sin nombre válido o con nombre por defecto
  const filteredRanking = rankingData.filter(p => p.name && p.name !== "jugador");

  renderRanking(filteredRanking);
});

function renderRanking(ranking) {
  const list = document.getElementById("rankingList");
  if (!list) return;

  list.innerHTML = "";

  ranking.forEach((p, i) => {
    const item = document.createElement("li");
    item.textContent = `${i + 1}. ${p.name} - ${p.kills} kills`;
    list.appendChild(item);
  });
}

const otherPlayers = {};

socket.on("updatePlayers", (playersData) => {
  // ✅ Verificamos si el jugador local fue eliminado
  if (!playersData[socket.id]) {
    alert("¡Moriste!");
    window.location.reload();  // O podés mostrar un menú, etc.
    return;
  }

  // ✅ Actualizamos los datos del jugador local
  if (playersData[socket.id] && player) {
    const localData = playersData[socket.id];
    player.life = localData.life;
    player.kills = localData.kills;
    player.name = localData.name;
    player.x = localData.x;
    player.y = localData.y;
    player.aimAngle = localData.aimAngle || 0;
    player.facing = localData.facing;
  }

  // ✅ Actualizamos o creamos jugadores remotos
  for (const id in playersData) {
    if (id !== socket.id) {

      if (!playersData[id].name || playersData[id].name === "jugador") continue;

      if (!otherPlayers[id]) {
        otherPlayers[id] = new RemotePlayer(
          playersData[id].x,
          playersData[id].y,
          playersData[id].facing,
          playersData[id].kills,
          playersData[id].life,
          playersData[id].name,
          playersData[id].aimAngle || 0
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

  // ✅ Limpiamos jugadores que se hayan ido (desconectados o muertos)
  for (const id in otherPlayers) {
    if (!playersData[id]) {
      delete otherPlayers[id];
    }
  }
});

socket.on("remoteBullet", (bulletData) => {
  const dummyOwner = otherPlayers[bulletData.ownerId];
  if (!dummyOwner) return;

  bullets.push(new Bullet(
    bulletData.x,
    bulletData.y,
    bulletData.angle,
    bulletData.speed,
    bulletData.radius,
    dummyOwner,
    bulletData.damage
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

  socket.emit("playerJoined", {
    name: name,
  });

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width;
  camera.height = canvas.height;

  bullets = [];

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

let showRanking = false;

document.addEventListener("keydown", (e) => {
  if (e.key === "r" || e.key === "R") {
    showRanking = !showRanking; // Alterna visibilidad
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", () => {
  if (!player.canShoot()) return;

  const worldMouseX = camera.x + mouseX;
  const worldMouseY = camera.y + mouseY;
  const angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

  const newBullets = player.shoot(angle);
  bullets.push(...newBullets);

  for (const bullet of newBullets) {
    const bulletData = {
      x: bullet.x,
      y: bullet.y,
      angle: bullet.angle,
      speed: bullet.speed,
      radius: bullet.radius,
      damage: bullet.damage,
      ownerId: socket.id
    };
    socket.emit("shootBullet", bulletData);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "1") player.activeWeapon = "pistol";
  if (e.key === "2") player.activeWeapon = "shotgun";
  if (e.key === "3") player.activeWeapon = "sniper";
});



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
      player.life -= b.damage;
      if (player.life <= 0) {
        socket.emit("playerLeft"); // 🧠 Avisar al servidor que se fue
        alert("¡Perdiste!");
        window.location.reload();
      }
      continue;
    }

    // ✅ Colisión contra jugadores remotos (daño causado por el jugador local)
    for (const id in otherPlayers) {
      const remote = otherPlayers[id];
      if (b.owner === player && circleRectCollision(b, remote.getCollisionBox())) {
        bullets.splice(i, 1); // Quitar bala solo localmente
        socket.emit("playerHit", {
          targetId: id,
          damage: b.damage
        });
        break;
      }
    }

    // 🧩 Simular visualmente las colisiones entre jugadores remotos
    if (b.owner && b.owner !== player) {
      for (const id in otherPlayers) {
        const remote = otherPlayers[id];
        if (b.owner !== remote && circleRectCollision(b, remote.getCollisionBox())) {
          bullets.splice(i, 1); // Solo eliminar bala visualmente
          break;
        }
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
let rankingAlpha = 0;
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

    // 🔫 Mostrar arma equipada
    if (player) {
      const weapon = player.getCurrentWeapon();
      const x = 20;
      const y = 20;

      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(x - 10, y - 10, 200, 50);

      ctx.fillStyle = "#fff";
      ctx.font = "16px Arial";
      ctx.fillText(`Arma: ${weapon.name}`, x, y + 5);
      ctx.fillText(`Daño: ${weapon.damage}`, x, y + 25);
    }

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


  if (showRanking && rankingAlpha < 1) {
    rankingAlpha += 0.02;
  } else if (!showRanking && rankingAlpha > 0) {
    rankingAlpha -= 0.02;
  }

  if (rankingAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = rankingAlpha;

    if (showRanking) {
      // 🏆 Mostrar ranking global mejorado
      const rankX = canvas.width - 240;
      const rankY = 20;
      const boxWidth = 220;
      const boxHeight = 270;
      const padding = 10;

      // Fondo con opacidad
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(rankX, rankY, boxWidth, boxHeight);

      // Encabezados
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Jugador", rankX + padding, rankY + 25);
      ctx.textAlign = "right";
      ctx.fillText("Kills", rankX + boxWidth - padding, rankY + 25);

      // Jugadores
      ctx.font = "12px Arial";
      topRanking.forEach((player, i) => {
        let color = "#e3e3e3ff";
        if (i === 0) color = "#FFD700"; // Oro
        else if (i === 1) color = "#ffffffa6"; // Plata
        else if (i === 2) color = "#cd8032fd"; // Bronce

        const y = rankY + 45 + i * 20;

        // Posición y nombre
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.fillText(`${i + 1}. ${player.name}`, rankX + padding, y);

        // Kills
        ctx.textAlign = "right";
        ctx.fillText(`${player.kills}`, rankX + boxWidth - padding, y);
      });
    }

    ctx.restore();
  }

  updateBullets();
  for (const bullet of bullets) bullet.draw(ctx, camera);

  requestAnimationFrame(gameLoop);
}



