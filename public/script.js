const socket = io();
const path = window.location.pathname;

/* ========= ADMIN ========= */

if (path.includes("admin")) {
  const codeEl = document.getElementById("code");
  const playersEl = document.getElementById("players");
  const offersEl = document.getElementById("offers");

  document.getElementById("create").onclick = () => {
    const rounds = parseInt(document.getElementById("rounds").value);
    socket.emit("createAuction", rounds);
  };

  socket.on("auctionCreated", code => {
    codeEl.textContent = code;
    new QRCode(document.getElementById("qr"), code);
  });

  socket.on("playerListUpdate", players => {
    playersEl.innerHTML = players.map(p => `<li>${p.nickname}</li>`).join("");
  });

  document.getElementById("startRound").onclick = () => {
    socket.emit("startRound", {
      code: codeEl.textContent,
      income: parseInt(document.getElementById("income").value)
    });
  };

  document.getElementById("endRound").onclick = () => {
    socket.emit("endRound", codeEl.textContent);
  };

  socket.on("updateOffers", offers => {
    offersEl.innerHTML = offers
      .sort((a, b) => b.amount - a.amount)
      .map(o => `<li>${o.nickname}: ${o.amount}</li>`)
      .join("");
  });
}

/* ========= PLAYER ========= */

if (path.includes("player")) {
  let auctionCode = "";

  document.getElementById("join").onclick = () => {
    auctionCode = document.getElementById("code").value.toUpperCase();
    const nickname = document.getElementById("nickname").value;
    socket.emit("joinAuction", { code: auctionCode, nickname });
  };

  socket.on("roundStarted", data => {
    document.getElementById("round").textContent = data.round;
    document.getElementById("money").textContent = data.money;
  });

  document.getElementById("sendOffer").onclick = () => {
    const amount = parseInt(document.getElementById("offer").value);
    socket.emit("submitOffer", { code: auctionCode, amount });
  };

  socket.on("updateOffers", offers => {
    document.getElementById("offers").innerHTML =
      offers.map(o => `<li>${o.nickname}: ${o.amount}</li>`).join("");
  });

  socket.on("roundEnded", winner => {
    document.getElementById("result").innerHTML =
      `Vincitore round: ${winner.nickname} (${winner.amount})`;
  });

  socket.on("gameEnded", () => {
    document.getElementById("result").innerHTML += "<br>Gioco terminato";
  });
}
