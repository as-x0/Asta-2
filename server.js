const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const auctions = {};

/* ========= DISTRIBUZIONE ORIGINALE ========= */

function gaussianRandom(mean = 0, stdev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function distributeMoneyGaussian(total, playersCount) {
  const min = 1;
  const values = [];

  for (let i = 0; i < playersCount; i++) {
    let v = Math.round(gaussianRandom(10, 3));
    v = Math.max(v, min);
    values.push(v);
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const factor = total / sum;

  let normalized = values.map(v =>
    Math.max(min, Math.round(v * factor))
  );

  let diff = total - normalized.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const i = Math.floor(Math.random() * normalized.length);
    if (diff > 0) {
      normalized[i]++;
      diff--;
    } else if (normalized[i] > min) {
      normalized[i]--;
      diff++;
    }
  }

  return normalized.sort(() => Math.random() - 0.5);
}

/* ========= UTILS ========= */

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ========= SOCKET ========= */

io.on("connection", socket => {

  /* ADMIN CREA ASTA */
  socket.on("admin:create", rounds => {
    const code = generateCode();

    auctions[code] = {
      admin: socket.id,
      roundsTotal: rounds,
      roundCurrent: 0,
      players: [],   // {id, name, money}
      bids: []
    };

    socket.join(code);
    socket.emit("admin:created", code);
  });

  /* PLAYER ENTRA */
  socket.on("player:join", ({ code, name }) => {
    const auction = auctions[code];
    if (!auction) return socket.emit("error", "Asta non trovata");

    if (auction.players.some(p => p.name === name))
      return socket.emit("error", "Nome già usato");

    auction.players.push({
      id: socket.id,
      name,
      money: 0
    });

    socket.join(code);
    io.to(auction.admin).emit("admin:players", auction.players);
    socket.emit("player:joined");
  });

  /* ADMIN AVVIA ROUND */
  socket.on("admin:startRound", ({ code, money }) => {
    const auction = auctions[code];
    if (!auction || socket.id !== auction.admin) return;

    auction.roundCurrent++;
    auction.bids = [];

    const distribution = distributeMoneyGaussian(
      money,
      auction.players.length
    );

    auction.players.forEach((p, i) => {
      p.money += distribution[i]; // 🔑 accumulo
      io.to(p.id).emit("round:start", {
        round: auction.roundCurrent,
        money: p.money
      });
    });

    io.to(auction.admin).emit("round:start");
  });

  /* PLAYER OFFERTA */
  socket.on("player:bid", ({ code, amount }) => {
    const auction = auctions[code];
    if (!auction) return;

    const player = auction.players.find(p => p.id === socket.id);
    if (!player) return;

    if (amount < 1 || amount > player.money)
      return socket.emit("error", "Offerta non valida");

    auction.bids = auction.bids.filter(b => b.id !== socket.id);
    auction.bids.push({
      id: player.id,
      name: player.name,
      amount
    });

    auction.bids.sort((a, b) => b.amount - a.amount);
    io.to(code).emit("round:bids", auction.bids);
  });

  /* ADMIN TERMINA ROUND */
  socket.on("admin:endRound", code => {
    const auction = auctions[code];
    if (!auction || socket.id !== auction.admin) return;

    const winner = auction.bids[0] || null;
    const isLast = auction.roundCurrent >= auction.roundsTotal;

    // 🔑 solo il vincitore paga
    if (winner) {
      const player = auction.players.find(p => p.id === winner.id);
      if (player) player.money -= winner.amount;
    }

    io.to(code).emit("round:ended", { winner, isLast });
  });

  /* ADMIN CONFERMA */
  socket.on("admin:confirmNext", code => {
    const auction = auctions[code];
    if (!auction || socket.id !== auction.admin) return;

    if (auction.roundCurrent >= auction.roundsTotal) {
      io.to(code).emit("auction:end");
      delete auctions[code];
    } else {
      socket.emit("admin:nextRound");
      io.to(code).emit("round:wait");
    }
  });

  /* DISCONNECT */
  socket.on("disconnect", () => {
    for (const code in auctions) {
      const a = auctions[code];
      a.players = a.players.filter(p => p.id !== socket.id);
      io.to(a.admin).emit("admin:players", a.players);
    }
  });
});

/* ========= START ========= */

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("✅ Server attivo su porta", PORT)
);
