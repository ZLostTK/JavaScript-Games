import { readdirSync, readFileSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { defineConfig } from 'vite';

const root = resolve(import.meta.dirname);
const games = Object.fromEntries(
	readdirSync(resolve(root, 'games'))
		.filter((dir) => existsSync(resolve(root, 'games', dir, 'index.html')))
		.map((dir) => [dir, resolve(root, 'games', dir, 'index.html')]),
);

export default defineConfig({
	base: './',
	server: {
		port: 5173,
		open: '/',
	},
	plugins: [
		{
			name: 'copy-dist-assets',
			closeBundle() {
				const dist = resolve(root, 'dist');
				const engineDir = resolve(root, 'engine');
				const distEngine = resolve(dist, 'engine');
				if (!existsSync(distEngine)) mkdirSync(distEngine, { recursive: true });
				for (const f of readdirSync(engineDir)) {
					if (f.endsWith('.min.js')) {
						cpSync(resolve(engineDir, f), resolve(distEngine, f));
					}
				}
				const manifestPath = resolve(root, 'public', 'games.json');
				if (!existsSync(manifestPath)) return;
				const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
				const seen = new Set();
				for (const game of manifest.games || []) {
					for (const file of game.extraCacheFiles || []) {
						if (seen.has(file) || file.startsWith('engine/')) continue;
						seen.add(file);
						const src = resolve(root, file);
						const dst = resolve(dist, file);
						if (existsSync(src)) {
							if (!existsSync(dirname(dst))) mkdirSync(dirname(dst), { recursive: true });
							cpSync(src, dst);
						}
					}
				}
			},
		},
	],
	build: {
		target: 'es2020',
		minify: 'esbuild',
		cssMinify: true,
		sourcemap: false,
		reportCompressedSize: true,
		chunkSizeWarningLimit: 600,
		rollupOptions: {
			input: {
				main: resolve(root, 'index.html'),
				...games,
			},
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/peerjs')) return 'peerjs';
				},
			},
		},
	},
});
