import { readdirSync, readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } from 'node:fs';
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
				
				// Fix base files for production (remove non-existent source files)
				manifest.cache.gameBaseFiles = ["index.html"]; 
				
				const seen = new Set();
				for (const game of manifest.games || []) {
					// 1. Parse built HTML to find hashed assets
					const gameHtmlPath = resolve(dist, game.path, 'index.html');
					const gameAssets = [];
					if (existsSync(gameHtmlPath)) {
						const html = readFileSync(gameHtmlPath, 'utf-8');
						// Find all href=".../assets/..." and src=".../assets/..."
						const regex = /(?:href|src)="(\.\.\/\.\.\/assets\/[^"]+)"/g;
						let match;
						while ((match = regex.exec(html)) !== null) {
							// Convert ../../assets/foo.js to assets/foo.js
							gameAssets.push(match[1].replace('../../', ''));
						}
					}
					
					// 2. Add found assets to extraCacheFiles
					if (!game.extraCacheFiles) game.extraCacheFiles = [];
					game.extraCacheFiles.push(...gameAssets);
					
					// 3. Process and copy all extraCacheFiles
					for (const file of game.extraCacheFiles) {
						if (seen.has(file)) continue;
						seen.add(file);
						
						// If it's a hashed asset, it's already in dist/assets/, we don't need to copy from src
						if (file.startsWith('assets/')) continue;
						
						const src = resolve(root, file);
						const dst = resolve(dist, file);
						if (existsSync(src)) {
							if (!existsSync(dirname(dst))) mkdirSync(dirname(dst), { recursive: true });
							cpSync(src, dst);
						}
					}
				}
				
				// Save the updated games.json to dist/ so the PWA fetch can see the hashed assets
				writeFileSync(resolve(dist, 'games.json'), JSON.stringify(manifest, null, 2));
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
