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

      console.log(`❤️ Vida restante de ${target.name}: ${target.life}`);

      if (target.life <= 0) {
        console.log(`☠️ ${attacker.name} mató a ${target.name}`);
        attacker.kills++;
        delete players[targetId];
      }

      io.emit("updatePlayers", players);
    }
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



