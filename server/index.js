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
    life: 100,
    aimAngle: 0,
    name: "jugador"
  };

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

    if (!target || !attacker) return;

    // Evitar múltiples ejecuciones si el jugador ya está muerto
    if (target.life <= 0) return;

    console.log(`💥 ${attacker.name} dañó a ${target.name}. Vida antes: ${target.life}`);

    target.life -= damage;

    io.emit("playerHitVisual", { targetId });

    if (target.life <= 0) {
      console.log(`☠️ ${attacker.name} mató a ${target.name}`);
      attacker.kills++;
      delete players[targetId];
    }
    
    io.emit("updatePlayers", players);
    io.emit("updateRanking", getTopPlayers());
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



