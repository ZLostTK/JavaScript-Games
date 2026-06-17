/* ────────────────────────────────────────────────────────────
Hangman Game - script.js
Modes: Random (palabras aleatorias) | 1v1 (amigo ingresa palabra)
──────────────────────────────────────────────────────────── */

// ────────────────────────────────────────────────────────────
// Keyboard Layout - Alphabetical (ABC) order
// ────────────────────────────────────────────────────────────

const KEYBOARD_LAYOUT = [
    'a','b','c','d','e','f','g','h','i','j','k','l','m',
    'n','ñ','o','p','q','r','s','t','u','v','w','x','y','z'
];

// ────────────────────────────────────────────────────────────
// Game State
// ────────────────────────────────────────────────────────────

const GameState = {
    mode: null, // 'random' | '1v1' | 'online'
    
    // Common state
    word: '',
    guessedLetters: new Set(),
    wrongGuesses: new Set(),
    attempts: 6,
    hintsUsed: 0,
    hints: [],
    currentHintIndex: 0,
    
    // 1v1 specific
    player1Name: '',
    player2Name: '',
    currentPlayer: 1, // 1 or 2
    
    // Online specific
    onlineRole: null, // 'host' | 'guest'
    onlineConnected: false,
    
    reset() {
        this.guessedLetters.clear();
        this.wrongGuesses.clear();
        this.attempts = 6;
        this.hintsUsed = 0;
        this.hints = [];
        this.currentHintIndex = 0;
    }
};

let peer = null;
let conn = null;

function destroyPeer() {
    if (conn) { try { conn.close(); } catch (_) {} conn = null; }
    if (peer) { try { peer.destroy(); } catch (_) {} peer = null; }
}

function genCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
    return c;
}

// ────────────────────────────────────────────────────────────
// DOM References
// ────────────────────────────────────────────────────────────

const DOM = {
    // Overlays
    modeOverlay: document.getElementById('mode-overlay'),
    setup1v1Overlay: document.getElementById('setup-1v1-overlay'),
    playerSwitchOverlay: document.getElementById('player-switch-overlay'),
    gameOverOverlay: document.getElementById('game-over-overlay'),
    
    // Buttons
    randomModeBtn: document.getElementById('random-mode-btn'),
    pvpModeBtn: document.getElementById('pvp-mode-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),
    menuBtn: document.getElementById('menu-btn'),
    cancelSetupBtn: document.getElementById('cancel-setup-btn'),
    continueBtn: document.getElementById('continue-btn'),
    hintBtn: document.getElementById('hint-btn'),
    
    // Forms & Inputs
    setup1v1Form: document.getElementById('setup-1v1-form'),
    playerNameInput: document.getElementById('player-name'),
    opponentNameInput: document.getElementById('opponent-name-input'),
    secretWordInput: document.getElementById('secret-word'),
    hintInputs: [
        document.getElementById('hint-1'),
        document.getElementById('hint-2'),
        document.getElementById('hint-3')
    ],
    
    // Game Display
    hangmanImage: document.getElementById('hangman-image'),
    wordContainer: document.getElementById('word-container'),
    keyboard: document.getElementById('keyboard'),
    attempts: document.getElementById('attempts'),
    correctLetters: document.getElementById('correct-letters'),
    modeDisplay: document.getElementById('mode-display'),
    opponentInfo: document.getElementById('opponent-info'),
    opponentNameDisplay: document.getElementById('opponent-name'),
    
    // Hint Display
    hintDisplay: document.getElementById('hint-display'),
    hintText: document.getElementById('hint-text'),
    closeHintBtn: document.getElementById('close-hint-btn'),
    hintItem: document.getElementById('hint-item'),
    
    // Game Over Content
    gameOverContent: document.getElementById('game-over-content'),
    
    // Info Displays
    switchTitle: document.getElementById('switch-title'),
    switchMessage: document.getElementById('switch-message'),
    switchInstruction: document.getElementById('switch-instruction')
};

// ────────────────────────────────────────────────────────────
// Event Listeners
// ────────────────────────────────────────────────────────────

DOM.randomModeBtn.addEventListener('click', () => startRandomMode());
DOM.pvpModeBtn.addEventListener('click', () => startPvpMode());
DOM.cancelSetupBtn.addEventListener('click', () => backToModeSelection());
DOM.setup1v1Form.addEventListener('submit', (e) => {
    e.preventDefault();
    start1v1Game();
});
DOM.playAgainBtn.addEventListener('click', () => {
    GameState.reset();
    showModeSelection();
});
DOM.menuBtn.addEventListener('click', () => location.href = '../../');
DOM.hintBtn.addEventListener('click', () => showHint());
DOM.closeHintBtn.addEventListener('click', () => hideHint());

// Keyboard input
document.addEventListener('keydown', (e) => {
    const letter = e.key.toLowerCase();
    if (/^[a-zñ]$/.test(letter) && GameState.mode) {
        makeGuess(letter);
    }
});

// ────────────────────────────────────────────────────────────
// Initialize Game
// ────────────────────────────────────────────────────────────

function init() {
    showModeSelection();
}

// ────────────────────────────────────────────────────────────
// Mode Selection
// ────────────────────────────────────────────────────────────

function showModeSelection() {
    destroyPeer();
    DOM.modeOverlay.classList.remove('hidden');
    DOM.setup1v1Overlay.classList.add('hidden');
    DOM.playerSwitchOverlay.classList.add('hidden');
    DOM.gameOverOverlay.classList.add('hidden');
    if (DOM.onlineSetupOverlay) DOM.onlineSetupOverlay.classList.add('hidden');
    if (DOM.onlineLobbyOverlay) DOM.onlineLobbyOverlay.classList.add('hidden');
    GameState.mode = null;
}

function startRandomMode() {
    GameState.mode = 'random';
    GameState.reset();
    
    // Get random word from database
    const categories = Object.values(WORD_DATABASE);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomWordObj = randomCategory[Math.floor(Math.random() * randomCategory.length)];
    
    GameState.word = randomWordObj.word;
    GameState.hints = [randomWordObj.hint];
    
    DOM.modeOverlay.classList.add('hidden');
    renderGame();
    updateDisplay();
}

function startPvpMode() {
    GameState.mode = '1v1';
    DOM.modeOverlay.classList.add('hidden');
    DOM.setup1v1Overlay.classList.remove('hidden');
    // Clear previous form
    DOM.setup1v1Form.reset();
}

function backToModeSelection() {
    DOM.setup1v1Overlay.classList.add('hidden');
    showModeSelection();
}

// ────────────────────────────────────────────────────────────
// 1v1 Setup & Game
// ────────────────────────────────────────────────────────────

function start1v1Game() {
    GameState.reset();
    
    const p1 = DOM.playerNameInput.value.trim() || 'Host';
    const secretWord = DOM.secretWordInput.value.trim().toLowerCase();
    const hints = [
        DOM.hintInputs[0].value.trim(),
        DOM.hintInputs[1].value.trim(),
        DOM.hintInputs[2].value.trim()
    ];
    
    if (GameState.mode === 'online') {
        GameState.word = secretWord;
        GameState.hints = hints;
        GameState.player1Name = p1;
        GameState.player2Name = 'Adivinador';
        GameState.currentPlayer = 2; // Guest guesses
        
        if (conn) {
            conn.send(JSON.stringify({
                type: 'start',
                word: secretWord,
                hints: hints,
                hostName: p1
            }));
        }
        
        DOM.setup1v1Overlay.classList.add('hidden');
        renderGame();
        updateDisplay();
        return;
    }
    
    GameState.player1Name = p1;
    GameState.player2Name = DOM.opponentNameInput.value.trim();
    GameState.word = secretWord;
    GameState.hints = hints;
    GameState.currentPlayer = 2; // Player 2 guesses first
    
    DOM.setup1v1Overlay.classList.add('hidden');
    DOM.opponentInfo.classList.remove('hidden');
    
    // Show player switch screen
    showPlayerSwitchScreen();
}

function showPlayerSwitchScreen() {
    const currentPlayerName = GameState.currentPlayer === 1 ? GameState.player1Name : GameState.player2Name;
    const nextPlayerName = GameState.currentPlayer === 1 ? GameState.player2Name : GameState.player1Name;
    
    DOM.switchTitle.textContent = `Turno de ${nextPlayerName}`;
    DOM.switchMessage.textContent = `${currentPlayerName} ingresó la palabra y pistas...`;
    DOM.switchInstruction.textContent = 'Pasa el dispositivo';
    
    DOM.playerSwitchOverlay.classList.remove('hidden');
    DOM.gameOverOverlay.classList.add('hidden');
}

function continueFromPlayerSwitch() {
    GameState.currentPlayer = 3 - GameState.currentPlayer; // Toggle: 1->2 or 2->1
    DOM.playerSwitchOverlay.classList.add('hidden');
    renderGame();
    updateDisplay();
}

DOM.continueBtn.addEventListener('click', () => continueFromPlayerSwitch());

// ────────────────────────────────────────────────────────────
// Game Rendering
// ────────────────────────────────────────────────────────────

function renderGame() {
    renderWord();
    renderKeyboard();
    updateDisplay();
}

function renderWord() {
    const word = GameState.word;
    DOM.wordContainer.innerHTML = '';
    
    for (let i = 0; i < word.length; i++) {
        const letter = word[i];
        const div = document.createElement('div');
        div.className = 'word-letter';
        
        if (GameState.guessedLetters.has(letter) || letter === ' ') {
            div.textContent = letter === ' ' ? '·' : letter;
        } else {
            div.textContent = '_';
        }
        
        DOM.wordContainer.appendChild(div);
    }
}

function renderKeyboard() {
    DOM.keyboard.innerHTML = '';
    
    for (const letter of KEYBOARD_LAYOUT) {
        const button = document.createElement('button');
        button.className = 'key-btn';
        button.textContent = letter.toUpperCase();
        button.dataset.letter = letter;
        
        if (GameState.guessedLetters.has(letter) || GameState.wrongGuesses.has(letter) || (GameState.mode === 'online' && GameState.onlineRole === 'host')) {
            button.disabled = true;
            
            if (GameState.guessedLetters.has(letter)) {
                button.classList.add('correct');
            } else {
                button.classList.add('wrong');
            }
        }
        
        button.addEventListener('click', () => makeGuess(letter));
        DOM.keyboard.appendChild(button);
    }
}

function updateDisplay() {
    // Update hangman image
    const wrongCount = GameState.wrongGuesses.size;
    DOM.hangmanImage.src = `./images/hangman-${wrongCount}.svg`;
    
    // Update stats
    DOM.attempts.textContent = GameState.attempts;
    
    const correctCount = Array.from(GameState.guessedLetters).filter(l => 
        GameState.word.toLowerCase().includes(l)
    ).length;
    DOM.correctLetters.textContent = correctCount;
    
    // Update mode display
    if (GameState.mode === 'random') {
        DOM.modeDisplay.textContent = 'Random';
        DOM.opponentInfo.classList.add('hidden');
        DOM.hintItem.classList.remove('hidden');
    } else if (GameState.mode === '1v1') {
        const currentPlayerName = GameState.currentPlayer === 1 ? GameState.player1Name : GameState.player2Name;
        DOM.modeDisplay.textContent = `1v1 - Turno de ${currentPlayerName}`;
        DOM.opponentNameDisplay.textContent = GameState.currentPlayer === 1 ? GameState.player2Name : GameState.player1Name;
        
        // Hint logic for 1v1
        if (GameState.hintsUsed < 3) {
            DOM.hintBtn.disabled = false;
            DOM.hintItem.classList.remove('hidden');
        } else {
            DOM.hintBtn.disabled = true;
            DOM.hintItem.classList.add('hidden');
        }
    } else if (GameState.mode === 'online') {
        const isHost = GameState.onlineRole === 'host';
        DOM.modeDisplay.textContent = `Online - ${isHost ? 'Observando' : 'Adivinando'}`;
        DOM.opponentInfo.classList.remove('hidden');
        DOM.opponentNameDisplay.textContent = isHost ? 'Rival' : (GameState.player1Name || 'Host');
        
        DOM.hintItem.classList.remove('hidden');
        if (isHost) {
            DOM.hintBtn.disabled = true;
        } else {
            DOM.hintBtn.disabled = GameState.hintsUsed >= 3;
        }
    }
}

// ────────────────────────────────────────────────────────────
// Game Logic
// ────────────────────────────────────────────────────────────

function makeGuess(letter, isLocal = true) {
    if (!GameState.mode || GameState.guessedLetters.has(letter) || GameState.wrongGuesses.has(letter)) {
        return;
    }
    
    if (GameState.mode === 'online') {
        if (GameState.onlineRole === 'host' && isLocal) return; // Host cannot guess locally
    }
    
    const word = GameState.word.toLowerCase();
    
    if (word.includes(letter)) {
        GameState.guessedLetters.add(letter);
    } else {
        GameState.wrongGuesses.add(letter);
        GameState.attempts--;
    }
    
    if (isLocal && GameState.mode === 'online' && conn) {
        conn.send(JSON.stringify({ type: 'guess', letter: letter }));
    }
    
    renderWord();
    renderKeyboard();
    updateDisplay();
    
    // Check win/loss
    checkGameStatus();
}

function checkGameStatus() {
    const word = GameState.word.toLowerCase();
    
    // Check if word is completed
    let isWordComplete = true;
    for (const letter of word) {
        if (letter !== ' ' && !GameState.guessedLetters.has(letter)) {
            isWordComplete = false;
            break;
        }
    }
    
    if (isWordComplete) {
        endGame(true);
    } else if (GameState.attempts <= 0) {
        endGame(false);
    }
}

function endGame(won, disconnected = false) {
    let content = '';
    
    if (disconnected) {
        content = `
      <div class="defeat">
        <img src="./images/lost.gif" alt="Derrota" class="result-gif">
        <h3>Rival desconectado</h3>
        <p>Se ha perdido la conexión con el rival.</p>
      </div>
    `;
    } else if (won) {
        content = `
      <div class="victory">
        <img src="./images/victory.gif" alt="Victoria" class="result-gif">
        <h3>¡Ganaste!</h3>
        ${GameState.mode === '1v1' ? `<p>${GameState.currentPlayer === 1 ? GameState.player1Name : GameState.player2Name} adivinó la palabra</p>` : ''}
        ${GameState.mode === 'online' ? `<p>La palabra fue adivinada con éxito.</p>` : ''}
        <p><strong>Palabra:</strong> ${GameState.word}</p>
      </div>
    `;
    } else {
        content = `
      <div class="defeat">
        <img src="./images/lost.gif" alt="Derrota" class="result-gif">
        <h3>¡Game Over!</h3>
        ${GameState.mode === '1v1' ? `<p>${GameState.currentPlayer === 1 ? GameState.player1Name : GameState.player2Name} no adivinó la palabra</p>` : ''}
        ${GameState.mode === 'online' ? `<p>No se logró adivinar la palabra.</p>` : ''}
        <p><strong>Palabra:</strong> ${GameState.word}</p>
      </div>
    `;
    }
    
    DOM.gameOverContent.innerHTML = content;
    DOM.gameOverOverlay.classList.remove('hidden');
    
    // Disable keyboard
    const buttons = document.querySelectorAll('.key-btn');
    buttons.forEach(btn => btn.disabled = true);
}

// ────────────────────────────────────────────────────────────
// Hint System
// ────────────────────────────────────────────────────────────

function showHint() {
    if (GameState.mode === 'random') {
        // Random mode: 1 hint only
        if (GameState.hintsUsed === 0) {
            DOM.hintText.textContent = GameState.hints[0];
            DOM.hintDisplay.classList.remove('hidden');
            GameState.hintsUsed = 1;
            DOM.hintBtn.disabled = true;
        }
    } else if (GameState.mode === '1v1' || GameState.mode === 'online') {
        // 1v1 or online mode: 3 hints, 4th attempt allows new hint
        const wrongCount = GameState.wrongGuesses.size;
        const canChangeHint = wrongCount >= 4;
        
        if (canChangeHint && GameState.currentHintIndex < 3) {
            // Can show next hint if wrong >= 4
            DOM.hintText.textContent = GameState.hints[GameState.currentHintIndex];
            DOM.hintDisplay.classList.remove('hidden');
            GameState.currentHintIndex++;
        } else if (GameState.currentHintIndex < 3 && GameState.hintsUsed < 3) {
            // Show current hint
            const hintIdx = Math.min(GameState.hintsUsed, 2);
            DOM.hintText.textContent = GameState.hints[hintIdx];
            DOM.hintDisplay.classList.remove('hidden');
            GameState.hintsUsed++;
        }
    }
}

function hideHint() {
    DOM.hintDisplay.classList.add('hidden');
}

// ────────────────────────────────────────────────────────────
// Online Bindings & PeerJS
// ────────────────────────────────────────────────────────────

DOM.onlineModeBtn = document.getElementById('online-mode-btn');
DOM.onlineSetupOverlay = document.getElementById('online-setup-overlay');
DOM.onlineLobbyOverlay = document.getElementById('online-lobby-overlay');
DOM.hostModeBtn = document.getElementById('host-mode-btn');
DOM.joinModeBtn = document.getElementById('join-mode-btn');
DOM.onlineCancelBtn = document.getElementById('online-cancel-btn');
DOM.connectBtn = document.getElementById('connect-btn');
DOM.lobbyBackBtn = document.getElementById('lobby-back-btn');
DOM.roomCodeInput = document.getElementById('room-code-input');
DOM.roomCodeDisplay = document.getElementById('room-code-display');
DOM.copyBtn = document.getElementById('copy-btn');
DOM.onlineLobbyTitle = document.getElementById('online-lobby-title');
DOM.onlineLobbyStatus = document.getElementById('online-lobby-status');
DOM.hostView = document.getElementById('host-view');
DOM.joinView = document.getElementById('join-view');

DOM.onlineModeBtn.addEventListener('click', () => {
    DOM.modeOverlay.classList.add('hidden');
    DOM.onlineSetupOverlay.classList.remove('hidden');
});

DOM.onlineCancelBtn.addEventListener('click', () => {
    DOM.onlineSetupOverlay.classList.add('hidden');
    showModeSelection();
});

DOM.hostModeBtn.addEventListener('click', () => {
    DOM.onlineSetupOverlay.classList.add('hidden');
    DOM.onlineLobbyOverlay.classList.remove('hidden');
    hostGame();
});

DOM.joinModeBtn.addEventListener('click', () => {
    DOM.onlineSetupOverlay.classList.add('hidden');
    DOM.onlineLobbyOverlay.classList.remove('hidden');
    joinGame();
});

DOM.lobbyBackBtn.addEventListener('click', () => {
    DOM.onlineLobbyOverlay.classList.add('hidden');
    showModeSelection();
});

DOM.copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(DOM.roomCodeDisplay.textContent).then(() => {
        DOM.copyBtn.textContent = '¡Copiado!';
        setTimeout(() => { DOM.copyBtn.textContent = 'Copiar código'; }, 1800);
    });
});

function hostGame() {
    destroyPeer();
    const code = genCode();
    DOM.onlineLobbyTitle.textContent = 'Crear partida';
    DOM.onlineLobbyStatus.textContent = 'Esperando conexión...';
    DOM.hostView.classList.remove('hidden');
    DOM.joinView.classList.add('hidden');
    DOM.roomCodeDisplay.textContent = code;
    
    peer = new Peer(code, { debug: 0 });
    peer.on('connection', (c) => {
        conn = c;
        setupConnection();
    });
    peer.on('error', (err) => {
        DOM.onlineLobbyStatus.textContent = 'Error: ' + err.type;
    });
}

function joinGame() {
    destroyPeer();
    DOM.onlineLobbyTitle.textContent = 'Unirse a partida';
    DOM.onlineLobbyStatus.textContent = 'Introduce el código del host';
    DOM.hostView.classList.add('hidden');
    DOM.joinView.classList.remove('hidden');
    DOM.roomCodeInput.value = '';
    
    peer = new Peer({ debug: 0 });
    peer.on('error', (err) => {
        DOM.onlineLobbyStatus.textContent = 'Error: ' + err.type;
    });
    
    DOM.connectBtn.onclick = () => {
        const code = DOM.roomCodeInput.value.trim().toUpperCase();
        if (code.length < 4) {
            DOM.onlineLobbyStatus.textContent = 'Código demasiado corto';
            return;
        }
        DOM.onlineLobbyStatus.textContent = 'Conectando...';
        conn = peer.connect(code, { reliable: true });
        setupConnection();
    };
}

function setupConnection() {
    conn.on('open', () => {
        DOM.onlineLobbyOverlay.classList.add('hidden');
        GameState.mode = 'online';
        GameState.onlineConnected = true;
        
        // Host has Peer ID equal to room code
        if (peer.id === DOM.roomCodeDisplay.textContent) {
            GameState.onlineRole = 'host';
            document.getElementById('setup-title').textContent = 'Configura el Ahorcado';
            document.getElementById('opponent-name-group').classList.add('hidden');
            DOM.opponentNameInput.required = false;
            DOM.playerNameInput.value = 'Anfitrión';
            DOM.setup1v1Overlay.classList.remove('hidden');
        } else {
            GameState.onlineRole = 'guest';
            DOM.onlineLobbyOverlay.classList.remove('hidden');
            DOM.onlineLobbyStatus.textContent = 'El host está configurando la palabra...';
            DOM.hostView.classList.add('hidden');
            DOM.joinView.classList.add('hidden');
        }
    });
    
    conn.on('data', (raw) => {
        const data = JSON.parse(raw);
        if (data.type === 'start') {
            DOM.onlineLobbyOverlay.classList.add('hidden');
            GameState.reset();
            GameState.word = data.word;
            GameState.hints = data.hints;
            GameState.player1Name = data.hostName;
            GameState.player2Name = 'Adivinador';
            GameState.currentPlayer = 2; // Guest
            renderGame();
            updateDisplay();
        } else if (data.type === 'guess') {
            makeGuess(data.letter, false);
        }
    });
    
    conn.on('close', () => onPeerDisconnect());
    conn.on('error', () => onPeerDisconnect());
}

function onPeerDisconnect() {
    if (GameState.mode === 'online') {
        endGame(false, true);
    }
}

// ────────────────────────────────────────────────────────────
// Start Game
// ────────────────────────────────────────────────────────────

init();