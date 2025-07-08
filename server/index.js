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

  socket.on("playerMove", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].facing = data.facing;
      players[socket.id].kills = data.kills;
      players[socket.id].life = data.life;
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

  if (!attacker || !target) {
    console.log("❌ Atacante o víctima no encontrados");
    return;
  }

  // Validar daño
  const validDamage = typeof damage === "number" && damage > 0 && damage <= 50 ? damage : 5;

  console.log(`💥 ${attacker.name} golpeó a ${target.name}. Daño: ${validDamage}`);

  target.life -= validDamage;

  if (target.life <= 0) {
    console.log(`☠️ ${attacker.name} eliminó a ${target.name}`);
    attacker.kills++;
    delete players[targetId];

    // Informar a todos que el jugador fue eliminado
    io.emit("playerKilled", {
      killerId: socket.id,
      killedId: targetId
    });
  }

  io.emit("updatePlayers", players);
});












  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
    delete players[socket.id];
    // Avisar a todos que este jugador se fue
    socket.broadcast.emit("playerDisconnected", socket.id);
  });
});


httpServer.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});



