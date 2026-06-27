/**
 * Scan games directory and auto-generate games.json
 * Usage: node scripts/scan-games.js
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const gamesDir = join(root, 'games');

/** Manifest de caché offline — fuente única para sw.js y main.js */
const cacheConfig = {
	name: 'js-games-v2',
	hubPrecache: [
		'./',
		'./index.html',
		'./style.css',
		'./main.js',
		'./games.json',
		'./manifest.json',
		'./icon.svg',
		'./engine/game-shell.css',
		'./engine/theme.js',
		'./engine/render-bridge.js',
		'./engine/input.js',
		'./engine/audio.js',
		'./engine/game-boot.js',
	],
	gameBaseFiles: ['index.html', 'style.css', 'script.js'],
	alwaysInclude: ['engine/game-shell.css'],
	legacyCaches: ['js-games-v1'],
};

const meta = {
	tictactoe: {
		title: 'Gato - Ateti',
		description: 'Classic 3-in-a-row against AI',
		color: '#16213e',
		tags: ['Lógica', 'Inteligencia Artificial'],
	},
	connect4: {
		title: 'Conecta 4',
		description: 'Connect 4 chips in a row before the AI',
		color: '#1a2a5e',
		tags: ['Clásico', 'Inteligencia Artificial', 'Estrategia'],
	},
	arkanoid: {
		title: 'Arkanoid',
		description: 'Break bricks with paddle and ball',
		color: '#1a1a2e',
		tags: ['Arcade', 'Colisiones', 'Física Básica'],
	},
	snake: {
		title: 'Snake Game',
		description: 'Grow the snake by eating food',
		color: '#0f3460',
		tags: ['Clásico', 'Cuadrícula', 'Arrays'],
	},
	'butterfly-effect': {
		title: 'Efecto Mariposa',
		description: 'Chaotic visualization of the Lorenz Attractor',
		color: '#0c0a1a',
		tags: ['Simulación', 'Caos', 'Física', 'Fractal'],
	},
	hangman: {
		title: 'Ahorcado',
		description: 'Guess the secret word - Random and 1v1 modes',
		color: '#2a2a4a',
		tags: ['Palabras', 'Lógica', 'Multijugador'],
		extraCacheFiles: [
			'games/hangman/words.js',
			'games/hangman/images/lost.gif',
			'games/hangman/images/victory.gif',
			'games/hangman/images/hangman-0.svg',
			'games/hangman/images/hangman-1.svg',
			'games/hangman/images/hangman-2.svg',
			'games/hangman/images/hangman-3.svg',
			'games/hangman/images/hangman-4.svg',
			'games/hangman/images/hangman-5.svg',
			'games/hangman/images/hangman-6.svg',
		],
	},
	minesweeper: {
		title: 'Busca Minas',
		description: 'Find the bombs using logic and arrays',
		color: '#2a2a4a',
		tags: ['Lógica', 'Clásico', 'Cuadrícula'],
	},
	flappybird: {
		title: 'Flappy Bird',
		description: 'Fly between pipes without crashing',
		color: '#0f2244',
		tags: ['Arcade', 'Reacción', 'Clásico'],
	},
	lightsout: {
		title: 'Fuera Luces!',
		description: 'Turn off all the lights in the fewest possible pulses',
		color: '#0d0d1a',
		tags: ['Lógica', 'Puzle', 'Clásico'],
	},
	sudoku: {
		title: 'Sudoku',
		description: 'Solve the sudoku puzzle',
		color: '#1a1a2e',
		tags: ['Lógica', 'Puzle', 'Clásico'],
	},
	othello: {
		title: 'Othello - Reversi',
		description: 'Classic strategy board game for two players',
		color: '#0f3460',
		tags: ['Clásico', 'Estrategia', 'Tabletop'],
	},
	typingspeed: {
		title: 'Typing Speed',
		description: 'Test your typing speed - ES / EN word pools',
		color: '#0f1117',
		tags: ['Palabras', 'DOM', 'Teclado'],
		extraCacheFiles: ['games/typingspeed/words.js'],
	},
	wordscramble: {
		title: 'Word Scramble',
		description: 'Unscramble the letters - ES / EN',
		color: '#0f1117',
		tags: ['Palabras', 'DOM', 'Puzle'],
		extraCacheFiles: ['games/wordscramble/words.js'],
	},
};

/** Extrae rutas engine/ y games/ referenciadas en index.html */
function extractDepsFromHtml(html) {
	const files = new Set();
	const re = /\.\.\/\.\.\/((?:engine|games)\/[^"'?\s]+)/g;
	for (const m of html.matchAll(re)) {
		files.add(m[1]);
	}
	return [...files];
}

function mergeCacheFiles(fromHtml, fromMeta = []) {
	return [...new Set([...fromHtml, ...fromMeta])].sort();
}

const entries = readdirSync(gamesDir, { withFileTypes: true });
const games = entries
	.filter(e => e.isDirectory() && existsSync(join(gamesDir, e.name, 'index.html')))
	.map(e => {
		const html = readFileSync(join(gamesDir, e.name, 'index.html'), 'utf8');
		const htmlDeps = extractDepsFromHtml(html);
		const metaExtras = meta[e.name]?.extraCacheFiles || [];

		const gameItem = {
			id: e.name,
			title: meta[e.name]?.title || e.name,
			description: meta[e.name]?.description || 'A JavaScript game',
			path: `games/${e.name}/`,
			image: `assets/imgs_games/${e.name}.svg`,
			color: meta[e.name]?.color || '#1a1a2e',
			tags: meta[e.name]?.tags || [],
		};

		const merged = mergeCacheFiles(htmlDeps, metaExtras);
		if (merged.length > 0) {
			gameItem.extraCacheFiles = merged;
		}

		return gameItem;
	});

writeFileSync(
	join(root, 'games.json'),
	JSON.stringify({ cache: cacheConfig, games }, null, 2)
);
console.log(`Generated games.json with ${games.length} games (cache: ${cacheConfig.name}).`);
