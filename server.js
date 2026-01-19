const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

const auctions = {};

/* =======================
   UTILITIES
======================= */

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function gaussianRandom(mean, stdev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function distributeMoney(total, players) {
  const min = 1;
  const max = total * 0.3;
  let values = players.map(() =>
    Math.max(min, Math.round(gaussianRandom(10, 3)))
  );

  let sum = values.reduce((a, b) => a + b, 0);
  let factor = total / sum;

  values = values.map(v =>
    Math.min(max, Math.max(min, Math.round(v * factor)))
  );

  let diff = total - values.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const i = Math.floor(Math.random() * values.length);
    if (diff > 0) {
      values[i]++;
      diff--;
    } else if (values[i] > min) {
      values[i]--;
      diff++;
    }
  }

  return values;
}

/* =======================
   ROUTES
======================= */

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

/* =======================
   SOCKET LOGIC
======================= */

io.on("connection", socket => {

  socket.on("createAuction", rounds => {
    const code = generateCode();

    auctions[code] = {
      admin: socket.id,
      players: [],
      offers: [],
      currentRound: 0,
      totalRounds: rounds
    };

    socket.join(code);
    socket.emit("auctionCreated", code);
  });

  socket.on("joinAuction", ({ code, nickname }) => {
    const auction = auctions[code];
    if (!auction) return;

    auction.players.push({
      id: socket.id,
      nickname,
      money: 0,
      offer: null
    });

    socket.join(code);
    io.to(auction.admin).emit("playerListUpdate", auction.players);
    socket.emit("joinedAuction", code);
  });

  socket.on("startRound", ({ code, income }) => {
    const auction = auctions[code];
    if (!auction || socket.id !== auction.admin) return;

    auction.currentRound++;
    auction.offers = [];

    const distribution = distributeMoney(
      income,
      auction.players
    );

    auction.players.forEach((p, i) => {
      p.money += distribution[i];
      p.offer = null;
      io.to(p.id).emit("roundStarted", {
        round: auction.currentRound,
        money: p.money
      });
    });
  });

  socket.on("submitOffer", ({ code, amount }) => {
    const auction = auctions[code];
    const player = auction?.players.find(p => p.id === socket.id);
    if (!player || amount > player.money) return;

    player.offer = amount;
    auction.offers.push({ nickname: player.nickname, amount });

    io.to(code).emit("updateOffers", auction.offers);
  });

  socket.on("endRound", code => {
    const auction = auctions[code];
    if (!auction) return;

    const winner = auction.offers.reduce(
      (best, curr) => (curr.amount > best.amount ? curr : best),
      { amount: -1 }
    );

    const winnerPlayer = auction.players.find(
      p => p.nickname === winner.nickname
    );

    if (winnerPlayer) {
      winnerPlayer.money -= winner.amount;
    }

    io.to(code).emit("roundEnded", winner);

    if (auction.currentRound >= auction.totalRounds) {
      io.to(code).emit("gameEnded");
      delete auctions[code];
    }
  });
});

/* =======================
   START SERVER
======================= */

const PORT = process.env.PORT || 3000;
http.listen(PORT, () =>
  console.log("Server attivo sulla porta", PORT)
);
