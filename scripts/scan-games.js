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

const meta = {
	tictactoe: { 
		title: 'Gato - Ateti', 
		description: 'Classic 3-in-a-row against AI', 
		color: '#16213e',
		tags: ['Lógica', 'Inteligencia Artificial']
	},
	connect4: { 
		title: 'Conecta 4', 
		description: 'Connect 4 chips in a row before the AI', 
		color: '#1a2a5e',
		tags: ['Clásico', 'Inteligencia Artificial', 'Estrategia']
	},
	arkanoid: { 
		title: 'Arkanoid', 
		description: 'Break bricks with paddle and ball', 
		color: '#1a1a2e',
		tags: ['Arcade', 'Colisiones', 'Física Básica']
	},
	snake: { 
		title: 'Snake Game', 
		description: 'Grow the snake by eating food', 
		color: '#0f3460',
		tags: ['Clásico', 'Cuadrícula', 'Arrays']
	},
	'butterfly-effect': {
		title: 'Efecto Mariposa',
		description: 'Chaotic visualization of the Lorenz Attractor',
		color: '#0c0a1a',
		tags: ['Simulación', 'Caos', 'Física', 'Fractal']
	},
	hangman: { 
		title: 'Ahorcado', 
		description: 'Guess the word - Modes Random y 1v1',
		color: '#2a2a4a',
		tags: ['Palabras', 'Lógica', 'Multijugador']
	},
	minesweeper: { 
		title: 'Busca Minas', 
		description: 'Find the bombs using logic and arrays', 
		color: '#2a2a4a',
		tags: ['Lógica', 'Clásico', 'Cuadrícula']
	},
	flappybird: { 
		title: 'Flappy Bird', 
		description: 'Fly between pipes without crashing', 
		color: '#0f2244',
		tags: ['Arcade', 'Reacción', 'Clásico']
	},
	lightsout: { 
		title: 'Fuera Luces!', 
		description: 'Turn off all the lights', 
		color: '#0d0d1a',
		tags: ['Lógica', 'Puzle', 'Clásico']
	},
	sudoku: { 
		title: 'Sudoku', 
		description: 'Solve the sudoku puzzle', 
		color: '#1a1a2e',
		tags: ['Lógica', 'Puzle', 'Clásico']
	}
};

const entries = readdirSync(gamesDir, { withFileTypes: true });
const games = entries
.filter(e => e.isDirectory() && existsSync(join(gamesDir, e.name, 'index.html')))
.map(e => ({
	id: e.name,
	title: meta[e.name]?.title || e.name,
	description: meta[e.name]?.description || 'A JavaScript game',
	path: `games/${e.name}/`,
	image: `assets/imgs_games/${e.name}.svg`,
	color: meta[e.name]?.color || '#1a1a2e',
	tags: meta[e.name]?.tags || []
}));

writeFileSync(join(root, 'games.json'), JSON.stringify({ games }, null, 2));
console.log(`Generated games.json with ${games.length} games.`);
