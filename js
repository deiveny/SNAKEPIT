const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

let players = {};
let foods = [];

function spawnFood(n) {
  for (let i = 0; i < n; i++) {
    foods.push({
      x: Math.random() * 4000,
      y: Math.random() * 4000,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    });
  }
}
// Começa com 500 comidas
spawnFood(500);

io.on("connection", (socket) => {
  socket.on("join", (data) => {
    // Adiciona o jogador com a skin escolhida
    players[socket.id] = {
      x: 2000,
      y: 2000,
      body: Array(25).fill({ x: 2000, y: 2000 }),
      name: data.name,
      skin: data.skin || "default", // Garante que a skin seja salva
      angle: 0,
    };
  });

  socket.on("setAngle", (angle) => {
    if (players[socket.id]) players[socket.id].angle = angle;
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

// Loop principal de física (30 FPS)
setInterval(() => {
  for (let id in players) {
    let p = players[id];

    // Movimentação
    p.x += Math.cos(p.angle) * 3;
    p.y += Math.sin(p.angle) * 3;

    // Regra da Parede: Morre se sair de 0 a 4000
    if (p.x < 0 || p.x > 4000 || p.y < 0 || p.y > 4000) {
      io.to(id).emit("die"); // Avisa o cliente para redirecionar
      delete players[id];
      continue;
    }

    // Lógica do corpo (Snake)
    p.body.push({ x: p.x, y: p.y });

    // Colisão com comida
    let ate = false;
    foods = foods.filter((f) => {
      if (Math.hypot(f.x - p.x, f.y - p.y) < 25) {
        ate = true;
        return false;
      }
      return true;
    });

    // Se não comeu, remove a ponta da cauda (mantém tamanho)
    if (!ate) p.body.shift();

    // Repõe comida se necessário
    if (foods.length < 500) spawnFood(1);
  }

  // Envia o estado atualizado para todos
  io.emit("update", { players, foods });
}, 1000 / 30);

http.listen(3000, () =>
  console.log("Servidor rodando em http://localhost:3000")
);
