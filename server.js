const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const auctions = {};

/* ================= UTIL ================= */

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/* ================= SOCKET ================= */

io.on("connection", socket => {

  /* CREATE AUCTION */
  socket.on("admin:create", rounds => {
    const code = generateCode();
    auctions[code] = {
      admin: socket.id,
      roundsTotal: rounds,
      roundCurrent: 0,
      players: [],
      bids: [],
      money: 0
    };
    socket.join(code);
    socket.emit("admin:created", code);
  });

  /* JOIN PLAYER */
  socket.on("player:join", ({ code, name }) => {
    const auction = auctions[code];
    if (!auction) return socket.emit("error", "Asta non trovata");

    if (auction.players.some(p => p.name === name))
      return socket.emit("error", "Nome già usato");

    auction.players.push({ id: socket.id, name });
    socket.join(code);

    io.to(auction.admin).emit("admin:players", auction.players);
    socket.emit("player:joined");
  });

  /* START ROUND */
  socket.on("admin:startRound", ({ code, money }) => {
    const auction = auctions[code];
    if (!auction || socket.id !== auction.admin) return;

    auction.roundCurrent++;
    auction.money = money;
    auction.bids = [];

    io.to(code).emit("round:start", {
      round: auction.roundCurrent,
      money
    });
  });

  /* SUBMIT BID */
  socket.on("player:bid", ({ code, amount }) => {
    const auction = auctions[code];
    if (!auction) return;

    const player = auction.players.find(p => p.id === socket.id);
    if (!player) return;

    auction.bids = auction.bids.filter(b => b.id !== socket.id);
    auction.bids.push({ id: socket.id, name: player.name, amount });

    auction.bids.sort((a, b) => b.amount - a.amount);
    io.to(code).emit("round:bids", auction.bids);
  });

  /* END ROUND */
  socket.on("admin:endRound", code => {
    const auction = auctions[code];
    if (!auction || socket.id !== auction.admin) return;

    const winner = auction.bids[0] || null;

    io.to(code).emit("round:end", winner);

    if (auction.roundCurrent >= auction.roundsTotal) {
      io.to(code).emit("auction:end");
      delete auctions[code];
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

/* ================= START ================= */

const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log("Server attivo su porta", PORT)
);
