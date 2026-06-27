#!/usr/bin/env node
/**
 * Migrates games/ to shared engine architecture modules.
 * Run: node scripts/migrate-games-architecture.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GAMES = path.join(ROOT, 'games');

const CANVAS_GAMES = new Set([
  'snake', 'arkanoid', 'tictactoe', 'connect4', 'flappybird', 'minesweeper',
  'sudoku', 'othello', 'pacman', 'lightsout', 'voidsector', 'spaceinvaders',
  'butterfly-effect',
]);

const DOM_GAMES = new Set(['domino', 'wordscramble', 'typingspeed', 'hangman']);
const PIXI_GAMES = new Set(['playeranimation']);
const ONLINE_GAMES = new Set([
  'tictactoe', 'connect4', 'flappybird', 'minesweeper', 'sudoku', 'othello',
  'spaceinvaders', 'voidsector', 'domino', 'hangman',
]);
const MOBILE_GAMES = new Set(['snake', 'arkanoid']);

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
}

function patchIndexHtml(gameId) {
  const file = path.join(GAMES, gameId, 'index.html');
  let html = read(file);
  if (!html) return;

  if (!html.includes('game-shell.css')) {
    html = html.replace(
      /<link rel="stylesheet" href="style\.css">/,
      '<link rel="stylesheet" href="../../engine/game-shell.css">\n<link rel="stylesheet" href="style.css">'
    );
  }

  const scripts = [];
  scripts.push('<script src="../../engine/theme.js"></script>');
  scripts.push('<script src="../../engine/render-bridge.js"></script>');
  scripts.push('<script src="../../engine/input.js"></script>');
  scripts.push('<script src="../../engine/audio.js"></script>');

  if (PIXI_GAMES.has(gameId)) {
    scripts.push('<script src="../../engine/pixi.min.js"></script>');
    scripts.push('<script src="../../engine/pixi-engine.js"></script>');
    scripts.push('<script src="../../engine/sprite-processor.js"></script>');
  } else if (DOM_GAMES.has(gameId)) {
    scripts.push('<script src="../../engine/dom-engine.js"></script>');
  } else if (CANVAS_GAMES.has(gameId)) {
    scripts.push('<script src="../../engine/engine.js"></script>');
    scripts.push('<script src="../../engine/ui-canvas.js"></script>');
  }

  if (MOBILE_GAMES.has(gameId)) {
    scripts.push('<script src="../../engine/mobile-controls.js"></script>');
  }

  if (ONLINE_GAMES.has(gameId)) {
    scripts.push('<script src="../../engine/peerjs.min.js"></script>');
    scripts.push('<script src="../../engine/online.js"></script>');
    scripts.push('<script src="../../engine/online-lobby.js"></script>');
  }

  if (gameId !== 'butterfly-effect') {
    scripts.push('<script src="../../engine/game-boot.js"></script>');
  }

  scripts.push('<script src="script.js"></script>');

  const block = scripts.join('\n');
  html = html.replace(/<script src="\.\.\/\.\.\/engine\/[^"]+"><\/script>\s*/g, '');
  html = html.replace(/<script src="script\.js"><\/script>/, block);

  write(file, html);
}

const SKIP_SCRIPT = new Set(['tictactoe']);

function patchScriptJs(gameId) {
  if (SKIP_SCRIPT.has(gameId)) return;
  const file = path.join(GAMES, gameId, 'script.js');
  let js = read(file);
  if (!js) return;

  // Remove local canvas button helpers
  js = js.replace(
    /\/\/ ── (Canvas button helpers|Helper: draw a rounded rect button[^\n]*|Hit-test a button[^\n]*) ─[^\n]*\n(?:function drawBtn[\s\S]*?\n\}\n\n)?(?:function hitBtn[\s\S]*?\n\}\n\n)?/g,
    ''
  );
  js = js.replace(
    /function drawBtn\(ctx[\s\S]*?\n\}\n\n/g,
    ''
  );
  js = js.replace(
    /function hitBtn\(gx, gy, btn\) \{[\s\S]*?\n\}\n\n/g,
    ''
  );

  // Replace usages
  js = js.replace(/\bdrawBtn\(/g, 'UICanvas.drawButton(');
  js = js.replace(/\bhitBtn\(/g, 'UICanvas.hitTest(');

  // Remove duplicate online DOM refs block
  js = js.replace(
    /\/\/ ── DOM refs[^\n]*\n(?:const online[^\n]*\n)+/g,
    ''
  );

  // onlineUI.classList.add('hidden') -> OnlineLobby.hide()
  js = js.replace(/onlineUI\.classList\.add\('hidden'\)/g, 'OnlineLobby.hide()');
  js = js.replace(/onlineUI\.classList\.remove\('hidden'\)/g, 'OnlineLobby.show()');

  // Remove copy/join button wiring at bottom (handled by OnlineLobby)
  js = js.replace(
    /\/\/ ── HTML button wiring ─[\s\S]*?(?=\/\/ ── Boot|Engine\.init|GameBoot|window\.onload|$)/g,
    ''
  );

  // Standardize boot sequences
  const bootMap = {
    snake: "GameBoot.start(game, { canvasId: 'game', width: 400, height: 400 });",
    arkanoid: "GameBoot.start(game, { canvasId: 'game', width: 480, height: 640 });",
    connect4: "OnlineLobby.onCancel(() => game._cancelOnline());\nGameBoot.start(game, { canvasId: 'game', width: 480, height: 580 });",
    minesweeper: "OnlineLobby.onCancel(() => game._cancelOnline());\nGameBoot.start(game, { canvasId: 'game', width: 480, height: 580 });",
    lightsout: "GameBoot.startCanvas(game, { canvasId: 'gameCanvas', width: 480, height: 640, bg: '#0d0d1a' });",
    othello: "GameBoot.startCanvas(game, { canvasId: 'gameCanvas', width: 480, height: 580 });",
    pacman: "GameBoot.startCanvas(game, { canvasId: 'gameCanvas', width: 448, height: 496, bg: '#000' });",
    domino: "GameBoot.startDOM(game);",
    wordscramble: "GameBoot.startDOM(game);",
    typingspeed: "GameBoot.startDOM(game);",
    playeranimation: "GameBoot.startPIXI(game, { width: 640, height: 480 });",
  };

  js = js.replace(
    /Engine\.init\([^)]+\)\.start\(game\);?/g,
    bootMap[gameId] || "GameBoot.start(game);"
  );
  js = js.replace(
    /window\.onload = \(\) => \{\s*Engine\.init\([^)]+\);\s*Engine\.start\(game\);\s*\};?/g,
    bootMap[gameId] || 'GameBoot.start(game);'
  );
  js = js.replace(
    /window\.onload = \(\) => \{\s*DOMEngine\.init\([^)]+\);\s*DOMEngine\.start\(game\);\s*\};?/g,
    bootMap[gameId] || 'GameBoot.startDOM(game);'
  );
  js = js.replace(
    /window\.onload = async \(\) => \{[\s\S]*?PIXIEngine\.start\(game\);\s*\};?/g,
    bootMap[gameId] || 'GameBoot.startPIXI(game);'
  );

  // Mobile controls for snake/arkanoid
  if (MOBILE_GAMES.has(gameId)) {
    const mapping = gameId === 'snake'
      ? "{ 'btn-up': 'btnUp', 'btn-down': 'btnDown', 'btn-left': 'btnLeft', 'btn-right': 'btnRight' }"
      : "{ 'btn-left': 'btnLeft', 'btn-right': 'btnRight', 'btn-action': 'btnAction' }";

    if (!js.includes('MobileControls.bind')) {
      js = js.replace(
        /if \(!this\.buttonsBound\) \{[\s\S]*?this\.buttonsBound = true;\s*\}/,
        `MobileControls.bind(this, ${mapping});`
      );
    }
  }

  write(file, js);
}

function stripShellCss(gameId) {
  const file = path.join(GAMES, gameId, 'style.css');
  let css = read(file);
  if (!css) return;

  // Remove blocks now in game-shell.css (keep game-specific rules)
  css = css.replace(/\*,\s*\*::before,\s*\*::after[\s\S]*?#back-btn:hover[^\}]*\}/, '');
  css = css.replace(/\/\* ── Online UI overlay ─[\s\S]*?#host-view\.hidden[^\}]*\}/, '');
  css = css.replace(/\.mobile-controls[\s\S]*?@media \(min-width: 769px\)[^\}]*\}/, '');

  css = css.trim();
  if (css) write(file, css + '\n');
}

const gameDirs = fs.readdirSync(GAMES).filter(d =>
  fs.statSync(path.join(GAMES, d)).isDirectory() && d !== 'assets'
);

for (const gameId of gameDirs) {
  console.log('Migrating', gameId);
  patchIndexHtml(gameId);
  if (fs.existsSync(path.join(GAMES, gameId, 'script.js'))) {
    patchScriptJs(gameId);
  }
  if (fs.existsSync(path.join(GAMES, gameId, 'style.css'))) {
    stripShellCss(gameId);
  }
}

console.log('Done.');
