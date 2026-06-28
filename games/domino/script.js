const game = {
  state: "select", // 'select' | 'playing' | 'gameover'
  mode: null, // 'ai' | 'online'
  myRole: null, // 'host' | 'guest'

  players: [], // 4 players
  drawPile: [], // Montón de fichas restantes
  boardTiles: [], // Tiles on the board [{ values: [a,b], isReversed: false, position: 'center'|'left'|'right' }]
  boardEnds: { left: null, right: null },
  turn: 0,
  roundWinner: null,
  startPlayer: null, // Player who holds 6-6 in round 1, or won last round

  // HUD selection
  selectedTileIndex: -1,

  // Online specific
  onlineConnected: false,
  networkPlayers: [], // mapping for online guests
  maxPlayers: 4, // online player count (2-4)

  init() {
    this._buildMenu();
  },

  update(dt) {
    if (this.state === "playing") {
      const currentPlayer = this.players[this.turn];
      if (currentPlayer && currentPlayer.isAI) {
        if (!this._aiTimer) this._aiTimer = 0;
        this._aiTimer += dt;
        if (this._aiTimer > 1.5) {
          // 1.5s AI delay
          this._aiTimer = 0;
          this._playAITurn();
        }
      }
    }
  },

  render() {
    if (this.state === "select") return this._renderMenu();
    if (this.state === "playing") return this._renderGame();
  },

  /* ─────────────────────────────────────────
	Menu & Setup
	───────────────────────────────────────── */
  _buildMenu() {
    DOMEngine.clear(DOMEngine.container);

    const menuScreen = DOMEngine.create("div", "screen", DOMEngine.container);
    menuScreen.id = "menu-screen";

    // Hero Section
    const hero = DOMEngine.create("div", "", menuScreen);
    hero.id = "menu-hero";

    // Floating background dominos
    for (let i = 0; i < 10; i++) {
      const d = DOMEngine.create("div", "hero-domino", hero);
      const val1 = Math.floor(Math.random() * 6) + 1;
      const val2 = Math.floor(Math.random() * 6);
      d.appendChild(this._createDominoElement(val1, val2, false, "black"));
      const x = Math.random() * 80 - 40 + "vw";
      const y = Math.random() * 40 - 20 + "px";
      const r0 = Math.random() * 60 - 30 + "deg";
      const r1 = Math.random() * 120 - 60 + "deg";
      const dur = Math.random() * 4 + 4 + "s";
      d.style.cssText = `left: calc(50% + ${x}); top: ${y}; --r0: ${r0}; --r1: ${r1}; animation-duration: ${dur}; animation-delay: -${Math.random() * 4}s;`;
    }

    const titleContainer = DOMEngine.create("div", "", hero);
    titleContainer.style.textAlign = "center";

    const title = DOMEngine.create("h1", "", titleContainer);
    title.textContent = "DOMINO";

    const tagline = DOMEngine.create("div", "menu-tagline", titleContainer);
    tagline.textContent = "Clásico juego de mesa";

    const dots = DOMEngine.create("div", "menu-dots-row", menuScreen);
    for (let i = 0; i < 5; i++) DOMEngine.create("div", "menu-dot", dots);

    const btnAi = DOMEngine.create(
      "button",
      "menu-btn accent-green",
      menuScreen,
    );
    btnAi.textContent = "Un Jugador (vs IA)";
    btnAi.onclick = () => this._startGame("ai");

    const btnOnline = DOMEngine.create("button", "menu-btn", menuScreen);
    btnOnline.textContent = "Multijugador Online";
    btnOnline.onclick = () => this._showOnlineMenu();

    const divider = DOMEngine.create("div", "menu-divider", menuScreen);

    const backBtn = DOMEngine.create(
      "button",
      "menu-btn accent-ghost",
      menuScreen,
    );
    backBtn.textContent = "← Menú Principal";
    backBtn.onclick = () => (location.href = "../../");

    const footer = DOMEngine.create("div", "menu-footer", menuScreen);
    footer.textContent = "DOMINO · VANILLA JS";

    DOMEngine.render();
  },

  _renderMenu() {
    // Menu is static, built once
  },

  _showOnlineMenu() {
    DOMEngine.clear(DOMEngine.container);
    const menuScreen = DOMEngine.create("div", "screen", DOMEngine.container);
    menuScreen.id = "online-menu-screen";

    const title = DOMEngine.create("h1", "", menuScreen);
    title.textContent = "EN LÍNEA";

    const dots = DOMEngine.create("div", "menu-dots-row", menuScreen);
    for (let i = 0; i < 3; i++) DOMEngine.create("div", "menu-dot", dots);

    // Player count selector
    const countLabel = DOMEngine.create("p", "menu-section-label", menuScreen);
    countLabel.textContent = "Cantidad de jugadores";

    const countDiv = DOMEngine.create("div", "", menuScreen);
    countDiv.style.cssText =
      "display: flex; gap: 12px; margin-bottom: 24px; justify-content: center;";

    this.maxPlayers = 4;

    [2, 3, 4].forEach((c) => {
      const btn = DOMEngine.create("button", "count-btn", countDiv);
      if (c === 4) btn.classList.add("active");
      btn.textContent = String(c);
      btn.onclick = () => {
        countDiv
          .querySelectorAll("button")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.maxPlayers = c;
      };
    });

    const btnHost = DOMEngine.create(
      "button",
      "menu-btn accent-green",
      menuScreen,
    );
    btnHost.textContent = "Crear Partida (Host)";
    btnHost.onclick = () => this._hostGame();

    const btnJoin = DOMEngine.create("button", "menu-btn", menuScreen);
    btnJoin.textContent = "Unirse a Partida";
    btnJoin.onclick = () => this._joinGame();

    const divider = DOMEngine.create("div", "menu-divider", menuScreen);

    const btnBack = DOMEngine.create(
      "button",
      "menu-btn accent-ghost",
      menuScreen,
    );
    btnBack.textContent = "← Volver";
    btnBack.onclick = () => {
      this.state = "select";
      this._buildMenu();
    };
  },

  /* ─────────────────────────────────────────
	Online Networking
	───────────────────────────────────────── */
  _hostGame() {
    this.networkPlayers = [];
    const max = this.maxPlayers;
    const maxGuests = max - 1;

    Online.on("onHostReady", () => {
      OnlineLobby.setStatus(`Esperando jugadores... (1/${max})`);
      this._updateLobbyList(["Tú (Host)"]);
    });

    Online.on("onData", (data, connId) => {
      if (data.type === "join") {
        if (this.state === "playing") {
          Online.send({ type: "error", msg: "La partida ya inició" }, connId);
        } else if (this.networkPlayers.length < maxGuests) {
          this.networkPlayers.push(connId);
          this._updateLobbyList([
            "Tú (Host)",
            ...this.networkPlayers.map((_, i) => `Jugador ${i + 2}`),
          ]);
          OnlineLobby.setStatus(
            `Esperando jugadores... (${this.networkPlayers.length + 1}/${max})`,
          );

          if (this.networkPlayers.length === maxGuests) {
            OnlineLobby.enableStart(true, "Iniciar Partida");
            OnlineLobby.setStatus("¡Sala llena!");
          }

          this._broadcast({
            type: "lobby_update",
            count: this.networkPlayers.length + 1,
            max,
          });
        } else {
          Online.send({ type: "error", msg: "Sala llena" }, connId);
        }
      } else {
        this._handleNetData(data, connId);
      }
    });

    Online.on("onDisconnect", () => {
      this._onDisconnect();
    });

    Online.host((code) => {
      OnlineLobby.setTitle("Crear partida");
      OnlineLobby.setStatus("Creando sala...");
      OnlineLobby.setCode(code);
      OnlineLobby.setLobbyLabel(`Jugadores (1/${max})`);
      OnlineLobby.enableStart(false, "Iniciar Partida (Faltan jugadores)");

      const hint = document.querySelector("#host-view .hint");
      if (hint) {
        hint.textContent = `Comparte este código para que hasta ${maxGuests} jugador${maxGuests > 1 ? "es" : ""} se unan`;
      }

      OnlineLobby.onStartClick(() => {
        OnlineLobby.hide();
        this.onlineConnected = true;
        this._broadcast({ type: "start" });
        this._startGame("online", "host");
      });

      OnlineLobby.showHostView();
      OnlineLobby.show();
    });
  },

  _joinGame() {
    Online.destroy();
    this.myRole = "guest";
    OnlineLobby.setTitle("Unirse a partida");
    OnlineLobby.setStatus("Introduce el código");
    OnlineLobby.showJoinView();
    OnlineLobby.show();
    OnlineLobby.enableJoin(true);

    OnlineLobby.wireDefaultJoin((code) => {
      OnlineLobby.setStatus(`Conectando a ${code}...`);
      Online.join(code);
    });

    Online.on("onConnected", () => {
      OnlineLobby.setStatus("Conectado. Esperando al Host...");
      Online.send({ type: "join" });
    });

    Online.on("onData", (data) => this._handleNetData(data));
    Online.on("onDisconnect", () => this._onDisconnect());
    Online.on("onError", (err) => {
      OnlineLobby.setStatus("Error: " + err.type);
      OnlineLobby.enableJoin(true);
    });
  },

  _updateLobbyList(list) {
    OnlineLobby.updateLobbyList(list);
  },

  _broadcast(data, excludeConnId = null) {
    if (this.myRole === "host") {
      this.networkPlayers.forEach((p) => {
        if (p !== excludeConnId) {
          Online.send(data, p);
        }
      });
    }
  },

  _handleNetData(data, connId) {
    switch (data.type) {
      case "lobby_update":
        if (this.myRole === "guest") {
          OnlineLobby.setStatus(
            `Conectado. Esperando al Host... (${data.count}/${data.max || 4})`,
          );
        }
        break;
      case "start":
        // Just a signal; actual game setup happens when 'init' arrives
        console.log("[Domino] guest received start signal");
        break;
      case "init":
        console.log(
          "[Domino] guest received init, assignedId:",
          data.assignedId,
        );
        this._myAssignedId = data.assignedId;
        this._applyInitState(data.state);
        break;
      case "play":
        this._applyPlay(data.playerIndex, data.tileIndex, data.side);
        if (this.myRole === "host") this._broadcast(data, connId);
        DOMEngine.render();
        break;
      case "pass":
        this._applyPass(data.playerIndex);
        if (this.myRole === "host") this._broadcast(data, connId);
        DOMEngine.render();
        break;
      case "draw":
        this._applyDraw(data.playerIndex);
        if (this.myRole === "host") this._broadcast(data, connId);
        DOMEngine.render();
        break;
      case "error":
        OnlineLobby.setStatus(data.msg);
        if (this.myRole === "guest") {
          OnlineLobby.enableJoin(true);
          Online.destroy();
        }
        break;
    }
  },

  _onDisconnect() {
    Online.destroy();
    OnlineLobby.hide();
    DOMEngine.showOverlay(
      "Desconectado",
      "La conexión con la partida se ha perdido.",
      () => {
        this.state = "select";
        this._buildMenu();
      },
    );
  },

  /* ─────────────────────────────────────────
	Game Core
	───────────────────────────────────────── */
  _startGame(mode, role = null) {
    this.mode = mode;
    this.myRole = role;
    this.state = "playing";

    const playerCount = mode === "online" ? this.maxPlayers : 4;

    this.players = [];
    for (let i = 0; i < playerCount; i++) {
      this.players.push({
        id: i,
        score: 0,
        name: `Jugador ${i + 1}`,
        hand: [],
        isLocal: i === 0 && role !== "guest",
        isAI: mode === "ai" && i > 0,
      });
    }

    if (mode === "online") {
      if (role === "host") {
        this.players.forEach((p) => {
          p.isLocal = false;
        });
        this.players[0].isLocal = true;
        this._startRound(true);
      }
    } else {
      this.startPlayer = null;
      this._startRound();
    }

    this._buildGameUI();
    DOMEngine.render();
  },

  _startRound(isHostFirstTime = false) {
    this.boardTiles = [];
    this.boardEnds = { left: null, right: null };
    this.drawPile = [];
    this.selectedTileIndex = -1;
    this.roundWinner = null;

    const tiles = [];
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        tiles.push([i, j]);
      }
    }

    // Shuffle
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }

    // Deal: 8 per player for 2 players, 6 otherwise
    const dealCount = this.players.length === 2 ? 8 : 6;
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].hand = tiles.splice(0, dealCount);
    }
    this.drawPile = tiles;

    // Determine first turn
    if (this.startPlayer !== null) {
      this.turn = this.startPlayer;
    } else {
      // Find 6-6
      for (let i = 0; i < this.players.length; i++) {
        const hasDoubleSix = this.players[i].hand.some(
          (t) => t[0] === 6 && t[1] === 6,
        );
        if (hasDoubleSix) {
          this.turn = i;
          this.startPlayer = i;
          break;
        }
      }
    }

    if (this.mode === "online" && this.myRole === "host") {
      const state = {
        players: this.players.map((p) => ({ hand: p.hand, score: p.score })),
        drawPileCount: this.drawPile.length,
        turn: this.turn,
        startPlayer: this.startPlayer,
        maxPlayers: this.players.length,
      };

      this.networkPlayers.forEach((connId, idx) => {
        Online.send({ type: "init", state, assignedId: idx + 1 }, connId);
      });
    }
  },

  _applyInitState(stateData) {
    this.maxPlayers = stateData.maxPlayers || stateData.players.length;
    this.players = stateData.players.map((p, i) => ({
      id: i,
      score: p.score,
      name: `Jugador ${i + 1}`,
      hand: p.hand,
      isLocal: i === this._myAssignedId,
      isAI: false,
    }));
    this.turn = stateData.turn;
    this.startPlayer = stateData.startPlayer;
    this.drawPile = Array(stateData.drawPileCount || 0).fill(null);
    this.boardTiles = [];
    this.boardEnds = { left: null, right: null };
    // Ensure guest state is fully set before building UI
    this.state = "playing";
    this.mode = "online";
    this.myRole = "guest";
    this.onlineConnected = true;
    // Hide lobby overlay - this is the definitive start signal for the guest
    OnlineLobby.hide();
    console.log(
      "[Domino] guest _applyInitState: building game UI, myIndex=",
      this._myAssignedId,
    );
    this._buildGameUI();
    DOMEngine.render();
    console.log(
      "[Domino] guest UI built, state=",
      this.state,
      "mode=",
      this.mode,
    );
  },

  _isMyTurn() {
    return this.players[this.turn].isLocal;
  },

  _getValidMoves(hand) {
    if (this.boardTiles.length === 0) {
      if (
        this.startPlayer === this.turn &&
        this.players[this.turn].hand.some((t) => t[0] === 6 && t[1] === 6)
      ) {
        return [
          {
            tileIndex: this.players[this.turn].hand.findIndex(
              (t) => t[0] === 6 && t[1] === 6,
            ),
            sides: ["center"],
          },
        ];
      }
      return hand.map((_, i) => ({ tileIndex: i, sides: ["center"] })); // Any tile  start if not round 1
    }

    const moves = [];
    hand.forEach((tile, i) => {
      const sides = [];
      if (tile[0] === this.boardEnds.left || tile[1] === this.boardEnds.left)
        sides.push("left");
      if (
        tile[0] === this.boardEnds.right ||
        tile[1] === this.boardEnds.right
      ) {
        if (!sides.includes("right")) sides.push("right");
      }
      if (sides.length > 0) moves.push({ tileIndex: i, sides });
    });
    return moves;
  },

  _canPlay(playerIndex) {
    return this._getValidMoves(this.players[playerIndex].hand).length > 0;
  },

  _playTile(playerIndex, tileIndex, side) {
    const tile = this.players[playerIndex].hand.splice(tileIndex, 1)[0];

    let isReversed = false;

    if (this.boardTiles.length === 0) {
      this.boardEnds = { left: tile[0], right: tile[1] };
      this.boardTiles.push({ tile, isReversed: false, position: "center" });
    } else {
      if (side === "left") {
        if (tile[1] === this.boardEnds.left) {
          isReversed = false; // [a, b] attaches b to left. So new left is a
          this.boardEnds.left = tile[0];
        } else if (tile[0] === this.boardEnds.left) {
          isReversed = true; // [a, b] reversed becomes [b, a]. attaches a to left. new left is b
          this.boardEnds.left = tile[1];
        }
        this.boardTiles.unshift({ tile, isReversed, position: "left" });
      } else if (side === "right") {
        if (tile[0] === this.boardEnds.right) {
          isReversed = false; // [a, b] attaches a to right. new right is b
          this.boardEnds.right = tile[1];
        } else if (tile[1] === this.boardEnds.right) {
          isReversed = true; // [a, b] reversed becomes [b, a]. attaches b to right. new right is a
          this.boardEnds.right = tile[0];
        }
        this.boardTiles.push({ tile, isReversed, position: "right" });
      }
    }

    this._nextTurn();
  },

  _applyPlay(playerIndex, tileIndex, side) {
    this._playTile(playerIndex, tileIndex, side);
  },

  _applyPass(playerIndex) {
    this._nextTurn();
  },

  _drawTile(playerIndex) {
    if (this.drawPile.length === 0) return false;
    const tile = this.drawPile.pop();
    this.players[playerIndex].hand.push(tile);
    return true;
  },

  _applyDraw(playerIndex) {
    this._drawTile(playerIndex);
    this.selectedTileIndex = -1;
  },

  _canDraw() {
    return this.drawPile.length > 0;
  },

  _nextTurn() {
    this.selectedTileIndex = -1;
    this.turn = (this.turn + 1) % this.players.length;
    this._checkRoundEnd();
  },

  _checkRoundEnd() {
    // 1. Domino
    for (let i = 0; i < this.players.length; i++) {
      if (this.players[i].hand.length === 0) {
        this._endRound(i, "domino");
        return;
      }
    }

    // 2. Lock
    if (!this._canDraw()) {
      let allBlocked = true;
      for (let i = 0; i < this.players.length; i++) {
        if (this._canPlay(i)) {
          allBlocked = false;
          break;
        }
      }

      if (allBlocked) {
        // Find player with min points
        let minPoints = Infinity;
        let minPlayers = [];
        this.players.forEach((p, idx) => {
          const pts = p.hand.reduce((sum, t) => sum + t[0] + t[1], 0);
          if (pts < minPoints) {
            minPoints = pts;
            minPlayers = [idx];
          } else if (pts === minPoints) {
            minPlayers.push(idx);
          }
        });

        if (minPlayers.length === 1) {
          this._endRound(minPlayers[0], "lock");
        } else {
          // Tie - no points awarded or starter wins?
          // Rules say: canceled, or player who locked wins. Let's give it to whoever caused lock (turn before this check)
          // Actually simplest is round canceled (nobody gets points).
          this._endRound(null, "tie");
        }
      }
    }
  },

  _endRound(winnerIndex, reason) {
    if (winnerIndex !== null) {
      let totalPoints = 0;
      this.players.forEach((p, idx) => {
        if (idx !== winnerIndex) {
          totalPoints += p.hand.reduce((sum, t) => sum + t[0] + t[1], 0);
        }
      });
      this.players[winnerIndex].score += totalPoints;
      this.startPlayer = winnerIndex;

      const pName = this.players[winnerIndex].name;

      if (this.players[winnerIndex].score >= 100) {
        DOMEngine.showOverlay(
          `${pName} GANA LA PARTIDA!`,
          `Puntuación total: ${this.players[winnerIndex].score}`,
          () => {
            this.state = "select";
            this._buildMenu();
          },
        );
      } else {
        const msg = reason === "domino" ? "¡Dominó!" : "¡Trancado!";
        DOMEngine.showOverlay(
          msg,
          `${pName} gana la ronda (+${totalPoints} pts).`,
          () => {
            this._startRound();
            DOMEngine.render();
          },
        );
      }
    } else {
      // Tie
      DOMEngine.showOverlay(
        "Empate",
        "Juego trancado con empate. Nadie puntúa.",
        () => {
          this._startRound();
          DOMEngine.render();
        },
      );
    }
  },

  _playAITurn() {
    let moves = this._getValidMoves(this.players[this.turn].hand);

    while (moves.length === 0 && this._canDraw()) {
      this._drawTile(this.turn);
      if (this.mode === "online" && this.myRole === "host") {
        this._broadcast({ type: "draw", playerIndex: this.turn });
      }
      moves = this._getValidMoves(this.players[this.turn].hand);
    }

    if (moves.length === 0) {
      if (this.mode === "online" && this.myRole === "host") {
        this._broadcast({ type: "pass", playerIndex: this.turn });
      }
      this._applyPass(this.turn);
    } else {
      // Pick random valid move
      const move = moves[Math.floor(Math.random() * moves.length)];
      const side = move.sides[Math.floor(Math.random() * move.sides.length)];

      if (this.mode === "online" && this.myRole === "host") {
        this._broadcast({
          type: "play",
          playerIndex: this.turn,
          tileIndex: move.tileIndex,
          side,
        });
      }
      this._applyPlay(this.turn, move.tileIndex, side);
    }
    DOMEngine.render();
  },

  /* ─────────────────────────────────────────
	Rendering
	───────────────────────────────────────── */
  _buildGameUI() {
    DOMEngine.clear(DOMEngine.container);

    const backBtn = DOMEngine.create("button", "", DOMEngine.container);
    backBtn.id = "back-btn";
    backBtn.textContent = "← Salir";
    backBtn.onclick = () => {
      if (this.mode === "online") Online.destroy();
      this.state = "select";
      this._buildMenu();
    };

    const hud = DOMEngine.create("div", "", DOMEngine.container);
    hud.id = "game-hud";
    hud.innerHTML = `<h3>Puntuación</h3><div id="hud-scores"></div>`;

    const playScreen = DOMEngine.create("div", "", DOMEngine.container);
    playScreen.id = "play-screen";

    const boardFrame = DOMEngine.create("div", "", playScreen);
    boardFrame.id = "board-frame";

    const opponentsBar = DOMEngine.create("div", "", boardFrame);
    opponentsBar.id = "opponents-bar";

    const posOrder =
      this.players.length === 2
        ? ["top"]
        : this.players.length === 3
          ? ["left", "top"]
          : ["left", "top", "right"];

    posOrder.forEach((pos) => {
      const slot = DOMEngine.create("div", "opponent-slot", opponentsBar);
      slot.id = `player-${pos}-area`;
      DOMEngine.create("div", "player-info", slot);
      DOMEngine.create("div", "hand", slot);
    });

    const boardArea = DOMEngine.create("div", "", boardFrame);
    boardArea.id = "board-area";
    const boardTrack = DOMEngine.create("div", "", boardArea);
    boardTrack.id = "board-track";

    const drawPileArea = DOMEngine.create("div", "", boardFrame);
    drawPileArea.id = "draw-pile-area";
    const drawStack = DOMEngine.create("div", "", drawPileArea);
    drawStack.id = "draw-pile-stack";
    const drawCount = DOMEngine.create("span", "", drawPileArea);
    drawCount.id = "draw-pile-count";

    const handSection = DOMEngine.create("div", "", playScreen);
    handSection.id = "player-hand-section";

    const bottomArea = DOMEngine.create("div", "", handSection);
    bottomArea.id = "player-bottom-area";
    DOMEngine.create("div", "player-info", bottomArea);
    DOMEngine.create("div", "hand", bottomArea);

    const actions = DOMEngine.create("div", "", playScreen);
    actions.id = "game-actions";

    const drawBtnMobile = DOMEngine.create(
      "button",
      "game-action-btn",
      actions,
    );
    drawBtnMobile.id = "draw-btn-mobile";
    drawBtnMobile.innerHTML = '<span class="btn-icon">+</span> COMER FICHA';
    drawBtnMobile.style.display = "none";

    const passBtn = DOMEngine.create("button", "game-action-btn", actions);
    passBtn.id = "pass-btn";
    passBtn.innerHTML = 'PASAR DE TURNO <span class="btn-icon">→</span>';
    passBtn.style.display = "none";
  },

  _renderGame() {
    let myIndex = 0;
    if (this.mode === "online" && this.myRole === "guest") {
      myIndex = this._myAssignedId || 0;
    }

    const playerCount = this.players.length;
    const allPos = ["bottom", "left", "top", "right"];
    const posList =
      playerCount === 2
        ? ["bottom", "top"]
        : playerCount === 3
          ? ["bottom", "left", "top"]
          : allPos;

    const posMap = {};
    for (let i = 0; i < playerCount; i++) {
      posMap[(myIndex + i) % playerCount] = posList[i];
    }

    const scoreDiv = document.getElementById("hud-scores");
    DOMEngine.clear(scoreDiv);
    this.players.forEach((p) => {
      const entry = DOMEngine.create("div", "hud-score-entry", scoreDiv);
      entry.textContent = `${p.name}: ${p.score}`;
      if (p.id === this.turn) DOMEngine.addClass(entry, "active-turn");
    });

    this.players.forEach((p) => {
      const pos = posMap[p.id];
      if (pos === "bottom") return;

      const area = document.getElementById(`player-${pos}-area`);
      const info = area.querySelector(".player-info");
      const handContainer = area.querySelector(".hand");

      DOMEngine.clear(handContainer);
      const tileCount = p.hand.length;
      info.textContent = `${p.name}${p.id === this.turn ? " ●" : ""} (${tileCount})`;
      if (p.id === this.turn) DOMEngine.addClass(info, "active-turn");
      else DOMEngine.removeClass(info, "active-turn");

      for (let i = 0; i < tileCount; i++) {
        const dom = this._createDominoElement(0, 0, true, "black");
        handContainer.appendChild(dom);
      }
    });

    const bottomArea = document.getElementById("player-bottom-area");
    const bottomInfo = bottomArea.querySelector(".player-info");
    const bottomHand = bottomArea.querySelector(".hand");
    const myPlayer = this.players[myIndex];

    DOMEngine.clear(bottomHand);
    bottomInfo.textContent =
      myPlayer.name + (myPlayer.id === this.turn ? " - Tu turno" : "");
    if (myPlayer.id === this.turn)
      DOMEngine.addClass(bottomInfo, "active-turn");
    else DOMEngine.removeClass(bottomInfo, "active-turn");

    const isCurrentLocalTurn = this.turn === myPlayer.id && myPlayer.isLocal;
    const validMoves = isCurrentLocalTurn
      ? this._getValidMoves(myPlayer.hand)
      : [];

    myPlayer.hand.forEach((tile, index) => {
      const dom = this._createDominoElement(tile[0], tile[1], false, "cream");
      if (isCurrentLocalTurn) {
        const move = validMoves.find((m) => m.tileIndex === index);
        if (move) {
          DOMEngine.addClass(dom, "playable");
          if (this.selectedTileIndex === index) {
            DOMEngine.addClass(dom, "selected");
          }
          dom.onclick = () => {
            this.selectedTileIndex = index;
            if (move.sides.length === 1) {
              this._doPlayerMove(myPlayer.id, index, move.sides[0]);
            } else {
              DOMEngine.render();
            }
          };
        }
      }
      bottomHand.appendChild(dom);
    });

    const track = document.getElementById("board-track");
    DOMEngine.clear(track);

    if (this.boardTiles.length === 0) {
      if (this._isMyTurn() && this.selectedTileIndex !== -1) {
        const selMove = validMoves.find(
          (m) => m.tileIndex === this.selectedTileIndex,
        );
        if (selMove) {
          const ind = DOMEngine.create("div", "play-indicator", track);
          ind.textContent = "JUGAR";
          ind.style.cssText =
            "position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 20;";
          ind.onclick = () =>
            this._doPlayerMove(this.turn, this.selectedTileIndex, "center");
        }
      }
      const boardAreaEl = document.getElementById("board-area");
      if (boardAreaEl) {
        track.style.cssText = `position: relative; width: ${boardAreaEl.clientWidth}px; height: ${boardAreaEl.clientHeight}px;`;
      }
      return;
    }

    const isMobile = window.innerWidth <= 480;
    const isSmall = window.innerWidth <= 768;
    const W = isMobile ? 28 : isSmall ? 32 : 36;
    const H = isMobile ? 56 : isSmall ? 64 : 72;
    const G = 2;

    const boardArea = document.getElementById("board-area");
    const areaW = boardArea ? boardArea.clientWidth : 300;
    const areaH = boardArea ? boardArea.clientHeight : 200;
    const limitX = Math.max(60, areaW / 2 - W - G * 2);
    const limitY = Math.max(40, areaH / 2 - W - G * 2);

    const placements = [];
    const centerIdx = this.boardTiles.findIndex((b) => b.position === "center");
    let rightEnd = { cx: 0, cy: 0, dir: 0 };
    let leftEnd = { cx: 0, cy: 0, dir: 2 };

    if (centerIdx !== -1) {
      const cb = this.boardTiles[centerIdx];
      let t1 = cb.tile[0],
        t2 = cb.tile[1];
      if (cb.isReversed) {
        t1 = cb.tile[1];
        t2 = cb.tile[0];
      }
      const isDouble = t1 === t2;
      const rot = isDouble ? 0 : -90;
      placements.push({
        b: cb,
        x: 0,
        y: 0,
        rot,
        t1,
        t2,
        isDouble,
        skin: "cream",
      });

      /* ── placeChain: cursor = open connection point, dir: 0=right 1=down 2=left 3=up ── */
      const placeChain = (tiles, startX, startY, startDir, isRightChain) => {
        let cx = startX,
          cy = startY,
          dir = startDir;
        tiles.forEach((b) => {
          let temp1 = b.tile[0],
            temp2 = b.tile[1];
          if (b.isReversed) {
            temp1 = b.tile[1];
            temp2 = b.tile[0];
          }
          const dbl = temp1 === temp2;
          const extent = dbl ? W : H;

          let newDir = dir;
          if (dir === 0 && cx + extent > limitX) newDir = 1;
          else if (dir === 1 && cy + extent > limitY) newDir = 2;
          else if (dir === 2 && cx - extent < -limitX) newDir = 3;
          else if (dir === 3 && cy - extent < -limitY) newDir = 0;

          if (newDir !== dir) {
            if (dir === 0 && newDir === 1) {
              cx -= G + W / 2;
              cy += W / 2 + G;
            }
            if (dir === 1 && newDir === 2) {
              cy -= G + W / 2;
              cx -= W / 2 + G;
            }
            if (dir === 2 && newDir === 3) {
              cx += G + W / 2;
              cy -= W / 2 + G;
            }
            if (dir === 3 && newDir === 0) {
              cy += G + W / 2;
              cx += W / 2 + G;
            }
            dir = newDir;
          }

          let M = isRightChain ? temp1 : temp2;
          let O = isRightChain ? temp2 : temp1;

          let bt1 = M;
          let bt2 = O;

          let r = 0;
          if (dbl) {
            r = dir === 0 || dir === 2 ? 0 : 90;
          } else {
            if (dir === 0) r = -90;
            else if (dir === 1) r = 0;
            else if (dir === 2) r = 90;
            else if (dir === 3) r = 180;
          }

          let tx, ty;
          if (dir === 0) {
            tx = cx + extent / 2;
            ty = cy;
            cx += extent + G;
          } else if (dir === 1) {
            tx = cx;
            ty = cy + extent / 2;
            cy += extent + G;
          } else if (dir === 2) {
            tx = cx - extent / 2;
            ty = cy;
            cx -= extent + G;
          } else {
            tx = cx;
            ty = cy - extent / 2;
            cy -= extent + G;
          }

          placements.push({
            b,
            x: tx,
            y: ty,
            rot: r,
            t1: bt1,
            t2: bt2,
            isDouble: dbl,
            skin: "cream",
          });
        });
        return { cx, cy, dir };
      };

      const rStart = isDouble ? W / 2 + G : H / 2 + G;
      const lStart = isDouble ? -(W / 2 + G) : -(H / 2 + G);
      rightEnd = placeChain(
        this.boardTiles.slice(centerIdx + 1),
        rStart,
        0,
        0,
        true,
      );
      leftEnd = placeChain(
        [...this.boardTiles.slice(0, centerIdx)].reverse(),
        lStart,
        0,
        2,
        false,
      );
    }

    let minX = -areaW / 2,
      maxX = areaW / 2;
    let minY = -areaH / 2,
      maxY = areaH / 2;
    const PAD = Math.max(H, 60);
    placements.forEach((p) => {
      const hw = p.isDouble ? W / 2 : H / 2;
      const hh = p.isDouble ? H / 2 : W / 2;
      minX = Math.min(minX, p.x - hw - PAD);
      maxX = Math.max(maxX, p.x + hw + PAD);
      minY = Math.min(minY, p.y - hh - PAD);
      maxY = Math.max(maxY, p.y + hh + PAD);
    });

    const trackW = maxX - minX;
    const trackH = maxY - minY;
    const originX = -minX;
    const originY = -minY;

    track.style.cssText = `position: relative; width: ${trackW}px; height: ${trackH}px; left: 0; top: 0; transform: none;`;

    placements.forEach((p) => {
      const dom = this._createDominoElement(p.t1, p.t2, false, p.skin);
      const px = originX + p.x;
      const py = originY + p.y;
      dom.style.cssText = `position: absolute; left: ${px}px; top: ${py}px; transform: translate(-50%, -50%) rotate(${p.rot}deg); margin: 0;`;
      track.appendChild(dom);
    });

    if (this._isMyTurn() && this.selectedTileIndex !== -1) {
      const selMove = validMoves.find(
        (m) => m.tileIndex === this.selectedTileIndex,
      );
      if (selMove) {
        const getIndPos = (end) => {
          let { cx, cy, dir } = end;
          // Offset slightly outward from the open end
          if (dir === 0) cx += H / 2;
          if (dir === 1) cy += H / 2;
          if (dir === 2) cx -= H / 2;
          if (dir === 3) cy -= H / 2;
          return { x: cx, y: cy };
        };

        if (selMove.sides.includes("right")) {
          const rPos = getIndPos(rightEnd);
          const ind = DOMEngine.create("div", "play-indicator", track);
          ind.textContent = "DER";
          ind.style.cssText = `position: absolute; left: ${originX + rPos.x}px; top: ${originY + rPos.y}px; transform: translate(-50%, -50%); z-index: 20;`;
          ind.onclick = () =>
            this._doPlayerMove(this.turn, this.selectedTileIndex, "right");
        }
        if (selMove.sides.includes("left")) {
          const lPos = getIndPos(leftEnd);
          const ind = DOMEngine.create("div", "play-indicator", track);
          ind.textContent = "IZQ";
          ind.style.cssText = `position: absolute; left: ${originX + lPos.x}px; top: ${originY + lPos.y}px; transform: translate(-50%, -50%); z-index: 20;`;
          ind.onclick = () =>
            this._doPlayerMove(this.turn, this.selectedTileIndex, "left");
        }
      }
    }

    // Center-scroll so the logical origin (0,0) = board centre is visible
    requestAnimationFrame(() => {
      if (boardArea) {
        boardArea.scrollLeft = originX - boardArea.clientWidth / 2;
        boardArea.scrollTop = originY - boardArea.clientHeight / 2;
      }
    });

    this._renderDrawPile();
    this._renderActionButtons(validMoves);
  },

  _renderDrawPile() {
    const stack = document.getElementById("draw-pile-stack");
    const countEl = document.getElementById("draw-pile-count");
    if (!stack || !countEl) return;

    DOMEngine.clear(stack);
    const count = this.drawPile.length;
    countEl.textContent = count > 0 ? `${count} fichas` : "Vacío";

    const layers = Math.min(count, 3);
    for (let i = 0; i < layers; i++) {
      const tile = this._createDominoElement(0, 0, true, "black");
      DOMEngine.addClass(tile, "pile-tile");
      stack.appendChild(tile);
    }

    const canDraw = this._isMyTurn() && !this._canPlay(this.turn) && count > 0;
    if (canDraw) {
      DOMEngine.addClass(stack, "highlight");
      stack.onclick = () => this._doPlayerDraw();
      stack.style.cursor = "pointer";
    } else {
      DOMEngine.removeClass(stack, "highlight");
      stack.onclick = null;
      stack.style.cursor = "default";
    }
  },

  _renderActionButtons(validMoves) {
    const passBtn = document.getElementById("pass-btn");
    const drawBtnMobile = document.getElementById("draw-btn-mobile");
    const isMyTurn = this._isMyTurn();
    const moves = isMyTurn
      ? validMoves || this._getValidMoves(this.players[this.turn].hand)
      : [];
    const canDraw = isMyTurn && moves.length === 0 && this._canDraw();
    const canPass = isMyTurn && moves.length === 0 && !this._canDraw();

    if (drawBtnMobile) {
      drawBtnMobile.style.display = canDraw ? "inline-flex" : "none";
      drawBtnMobile.onclick = () => this._doPlayerDraw();
    }

    if (passBtn) {
      passBtn.style.display = canPass ? "inline-flex" : "none";
      passBtn.onclick = () => {
        if (this.mode === "online") {
          Online.send({ type: "pass", playerIndex: this.turn });
        }
        this._applyPass(this.turn);
        DOMEngine.render();
      };
    }
  },

  _doPlayerDraw() {
    if (!this._isMyTurn() || this._canDraw() === false) return;
    if (this._getValidMoves(this.players[this.turn].hand).length > 0) return;

    if (this.mode === "online") {
      Online.send({ type: "draw", playerIndex: this.turn });
    }
    this._applyDraw(this.turn);
    DOMEngine.render();
  },

  _doPlayerMove(playerIndex, tileIndex, side) {
    if (this.mode === "online") {
      Online.send({ type: "play", playerIndex, tileIndex, side });
    }
    this._applyPlay(playerIndex, tileIndex, side);
    DOMEngine.render();
  },

  /* ─────────────────────────────────────────
	Helpers
	───────────────────────────────────────── */
  _createDominoElement(val1, val2, isFacedown, skin = "cream") {
    const el = document.createElement("div");
    el.className = "domino " + skin + (isFacedown ? " facedown" : "");

    if (!isFacedown) {
      const h1 = document.createElement("div");
      h1.className = `half val-${val1}`;
      for (let i = 0; i < val1; i++) {
        const dot = document.createElement("div");
        dot.className = "dot";
        h1.appendChild(dot);
      }

      const h2 = document.createElement("div");
      h2.className = `half val-${val2}`;
      for (let i = 0; i < val2; i++) {
        const dot = document.createElement("div");
        dot.className = "dot";
        h2.appendChild(dot);
      }

      el.appendChild(h1);
      el.appendChild(h2);
    }

    return el;
  },
};

// Patch net handler for guest assigned ID
const originalHandle = game._handleNetData.bind(game);
game._handleNetData = function (data, connId) {
  if (data.type === "init" && data.assignedId !== undefined) {
    this._myAssignedId = data.assignedId;
  }
  originalHandle(data, connId);
};

GameBoot.startDOM(game);

OnlineLobby.onCancel(() => {
  game._showOnlineMenu();
});
