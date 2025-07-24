import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
app.use(express.json());
app.use(cors());

app.post('/register', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ status: 'error', message: 'Nombre requerido' });

  // Por ahora no almacenamos nada, solo devolvemos ok
  return res.json({ status: 'ok' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",  // para desarrollo, permite cualquier origen
    methods: ["GET", "POST"]
  },
});

const PORT = process.env.PORT || 3000;

// Tu endpoint para register, etc.
const players = {};

const weaponTypes = {
  pistol: { name: "pistol", price: 0 },
  shotgun: { name: "shotgun", price: 2 },
  sniper: { name: "sniper", price: 4 },
};

io.on("connection", (socket) => {

  // funciones
  function getTopPlayers() {
    return Object.values(players)
      .filter(p => p.name && p.name !== "jugador") // 👈 Filtra jugadores "fantasma"
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10);
  }

  function getSortedRanking(players) {
    return Object.values(players)
      .filter(p => p.name && p.name !== "jugador")
      .map(p => ({ name: p.name, kills: p.kills }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10);
  }

  console.log("Nuevo jugador conectado:", socket.id);

  players[socket.id] = {
    id: socket.id,
    x: 0,
    y: 0,
    facing: 1,
    kills: 0,
    coins: 0,
    activeWeapon: "pistol",
    inventory: ["pistol"],
    life: 100,
    aimAngle: 0,
    name: "jugador"
  };

  socket.on("change_weapon", (weaponName) => {
    const player = players[socket.id];
    if (!player) return;

    // Verificar que esa arma esté en el inventario del jugador
    if (player.inventory.includes(weaponName)) {
      player.activeWeapon = weaponName;
    }
  });


  socket.on("buy_weapon", (weaponName) => {
    const player = players[socket.id];
    const weapon = weaponTypes[weaponName];

    if (!weapon) return;

    // ya tiene esta arma?
    if (player.inventory.includes(weaponName)) {
      socket.emit("purchase_failed", "Ya tenés esta arma");
      return;
    }

    if (player.coins >= weapon.price) {
      player.coins -= weapon.price;
      player.inventory.push(weaponName);         // ✅ agregar al inventario
      player.activeWeapon = weaponName;          // la selecciona como arma activa

      io.to(socket.id).emit("purchase_success", {
        coins: player.coins,
        activeWeapon: weaponName,
        inventory: player.inventory,             // ✅ enviar inventario actualizado
      });
    } else {
      socket.emit("purchase_failed", "Monedas insuficientes");
    }
  });


  socket.on("playerJoined", ({ name, color }) => {
    if (players[socket.id]) {
      players[socket.id].name = name;
      players[socket.id].color = color;

      io.emit("updatePlayers", players);
      io.emit("updateRanking", getTopPlayers());
    }
  });

  // Enviar ranking actual al nuevo jugador
  socket.emit("updateRanking", getTopPlayers());

  socket.on("playerMove", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].facing = data.facing;
      players[socket.id].kills = data.kills;
      players[socket.id].name = data.name;
      players[socket.id].aimAngle = data.aimAngle;

      // Enviar a todos los demás el estado actualizado
      io.emit("updatePlayers", players);
    }
  });

  socket.on("shootBullet", (bulletData) => {
    // reenviamos la bala a todos MENOS al que disparó
    socket.broadcast.emit("remoteBullet", bulletData);
  });

  socket.on("playerHit", ({ targetId, damage }) => {
    const target = players[targetId];
    const attacker = players[socket.id];

    if (target && attacker) {
      console.log(`💥 ${attacker.name} dañó a ${target.name}. Vida antes: ${target.life}`);

      target.life -= damage;  // ✅ asegurate que sea 'damage' y no '1' o '--'

      io.emit("playerHitVisual", { targetId });

      console.log(`❤️ Vida restante de ${target.name}: ${target.life}`);

      if (target.life <= 0) {
        console.log(`☠️ ${attacker.name} mató a ${target.name}`);
        attacker.kills++;
        attacker.coins += 1;
        delete players[targetId];
      }

      io.emit("updatePlayers", players);
      io.emit("updateRanking", getTopPlayers());
    }
  });


  socket.on("playerLeft", () => {
    console.log("Jugador salió manualmente:", socket.id);
    delete players[socket.id];
    socket.broadcast.emit("playerDisconnected", socket.id);
    io.emit("updatePlayers", players);
    io.emit("updateRanking", getTopPlayers());
  });

  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
    delete players[socket.id];

    // 🚨 Emití actualización del ranking
    io.emit("updatePlayers", players);
    io.emit("rankingUpdate", getSortedRanking(players));

    // También avisá al resto que se desconectó
    socket.broadcast.emit("playerDisconnected", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});



