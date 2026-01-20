const socket = io();

function show(id) {
  document.querySelectorAll("section").forEach(s => s.hidden = true);
  document.getElementById(id).hidden = false;
}

/* ================= ADMIN ================= */
if (location.pathname.includes("admin")) {

  let code = "";

  document.getElementById("createAuction").onclick = () => {
    socket.emit("admin:create",
      +document.getElementById("roundCount").value
    );
  };

  socket.on("admin:created", c => {
    code = c;
    document.getElementById("code").textContent = c;
    show("lobby");
  });

  socket.on("admin:players", players => {
    document.getElementById("players").innerHTML =
      players.map(p => `<li>${p.name}</li>`).join("");
  });
    document.getElementById("goToMoney").onclick = () => {
    show("money");
  };

  document.getElementById("startRound").onclick = () => {
    socket.emit("admin:startRound", {
      code,
      money: +document.getElementById("moneyInput").value
    });
    show("bids");
  };

  socket.on("round:bids", bids => {
    document.getElementById("bidList").innerHTML =
      bids.map(b => `<li>${b.name}: ${b.amount}</li>`).join("");
  });

  document.getElementById("endRound").onclick = () => {
    socket.emit("admin:endRound", code);
  };

  socket.on("round:end", winner => {
    document.getElementById("winnerText").textContent =
      winner ? `Vincitore: ${winner.name}` : "Nessuna offerta";
    show("winner");
  });

  document.getElementById("nextRound").onclick = () => {
    show("money");
  };

  socket.on("auction:end", () => show("end"));
}

/* ================= PLAYER ================= */
if (location.pathname.includes("player")) {

  let code = "";
  let myName = "";

  document.getElementById("joinBtn").onclick = () => {
    code = document.getElementById("codeInput").value.toUpperCase();
    myName = document.getElementById("nameInput").value;
    socket.emit("player:join", { code, name: myName });
  };

  socket.on("player:joined", () => show("wait"));

  socket.on("round:start", data => {
    document.getElementById("money").textContent = data.money;
    show("bid");
  });

  document.getElementById("bidBtn").onclick = () => {
    socket.emit("player:bid", {
      code,
      amount: +document.getElementById("bidInput").value
    });
  };

  socket.on("round:bids", bids => {
    document.getElementById("others").innerHTML =
      bids.map(b => `<li>${b.name}: ${b.amount}</li>`).join("");
  });

  socket.on("round:end", winner => {
    document.getElementById("resultText").textContent =
      winner && winner.name === myName
        ? "Hai vinto 🎉"
        : winner
        ? `Vincitore: ${winner.name}`
        : "Nessuna offerta";
    show("result");
  });

  socket.on("auction:end", () => show("end"));
}
