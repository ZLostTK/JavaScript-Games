import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
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
