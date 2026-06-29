import { readdirSync, statSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const assetsDir = join(dist, 'assets');

function fileExists(p) {
	try {
		statSync(p);
		return true;
	} catch {
		return false;
	}
}

function walk(dir) {
	const files = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const st = statSync(full);
		if (st.isDirectory()) files.push(...walk(full));
		else files.push(full);
	}
	return files;
}

function formatKb(bytes) {
	return `${(bytes / 1024).toFixed(1)} KB`;
}

if (!fileExists(dist) || !fileExists(assetsDir)) {
	console.error('❌ No existe dist/assets/. Ejecuta: pnpm run build');
	process.exit(1);
}

const jsFiles = walk(assetsDir).filter((f) => f.endsWith('.js'));
const cssFiles = walk(assetsDir).filter((f) => f.endsWith('.css'));

jsFiles.sort((a, b) => statSync(b).size - statSync(a).size);

console.log('\n📦 Build report — dist/\n');
console.log(`JS bundles: ${jsFiles.length} | CSS: ${cssFiles.length}`);
console.log('\nTop 10 JS (minificado con esbuild):\n');

for (const file of jsFiles.slice(0, 10)) {
	const size = statSync(file).size;
	const name = file.replace(`${dist}/`, '');
	const sample = readFileSync(file, 'utf8').slice(0, 200);
	const minified = !sample.includes('\n\n') && !sample.includes('  ');
	console.log(`  ${formatKb(size).padStart(10)}  ${name}${minified ? ' ✓' : ''}`);
}

const allJs = jsFiles.reduce((n, f) => n + statSync(f).size, 0);
console.log(`\nTotal JS en assets/: ${formatKb(allJs)}`);
console.log(`index.html: ${fileExists(join(dist, 'index.html')) ? '✓' : '✗'}`);
console.log(`games.json: ${fileExists(join(dist, 'games.json')) ? '✓' : '✗'}`);
console.log('\n✅ Build verificado\n');
