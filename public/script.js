const socket = io();

function show(id) {
  document.querySelectorAll("section").forEach(s => s.hidden = true);
  document.getElementById(id).hidden = false;
}

/* ========== ADMIN ========== */
if (location.pathname.includes("admin")) {

  let code = "";

  document.getElementById("createAuction").onclick = () => {
    socket.emit(
      "admin:create",
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

  document.getElementById("goToMoney").onclick = () => show("money");

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

  document.getElementById("endRound").onclick = () =>
    socket.emit("admin:endRound", code);

  socket.on("round:ended", data => {
    document.getElementById("winnerText").textContent =
      data.winner
        ? `Vincitore: ${data.winner.name}`
        : "Nessuna offerta";

    document.getElementById("nextRound").textContent =
      data.isLast ? "Termina asta" : "Prossimo round";

    show("winner");
  });

  document.getElementById("nextRound").onclick = () =>
    socket.emit("admin:confirmNext", code);

  socket.on("admin:nextRound", () => show("money"));
  socket.on("auction:end", () => show("end"));
}

/* ===== PLAYER ===== */
if (location.pathname.includes("player")) {

  let code = "";
  let myMoney = 0;
  let myName = "";

  joinBtn.onclick = () => {
    code = codeInput.value.toUpperCase();
    myName = nameInput.value;
    socket.emit("player:join", { code, name: myName });
  };

  socket.on("player:joined", () => show("wait"));

  socket.on("round:start", data => {
    myMoney = data.money;
    money.textContent = myMoney;
    show("bid");
  });

  bidBtn.onclick = () => {
    const amount = +bidInput.value;

    if (amount < 1 || amount > myMoney) {
      alert("Offerta non valida");
      return;
    }

    socket.emit("player:bid", { code, amount });
  };

  socket.on("round:bids", bids => {
    others.innerHTML =
      bids.map(b => `<li>${b.name}: ${b.amount}</li>`).join("");
  });

  socket.on("round:ended", data => {
    resultText.textContent =
      data.winner && data.winner.name === myName
        ? "Hai vinto 🎉"
        : data.winner
        ? `Il vincitore è ${data.winner.name}`
        : "Nessuna offerta";

    show("result");
  });

  socket.on("round:wait", () => show("wait"));
  socket.on("auction:end", () => show("end"));

  socket.on("error", msg => alert(msg));
}
