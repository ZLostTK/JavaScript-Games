import jsdom from 'jsdom';
import fs from 'fs';
import path from 'path';

const { JSDOM } = jsdom;
const games = ['domino', 'voidsector', 'typingspeed', 'wordscramble', 'sky-dash'];

(async () => {
  for (const game of games) {
    console.log(`\n--- Testing ${game} ---`);
    const indexPath = path.join(process.cwd(), `dist/games/${game}/index.html`);
    const html = fs.readFileSync(indexPath, 'utf-8');
    
    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on("error", (err) => {
      console.error(`[${game} ERROR]`, err.message || err);
    });
    virtualConsole.on("jsdomError", (err) => {
      console.error(`[${game} JSDOM ERROR]`, err.message || err);
    });

    try {
      const dom = new JSDOM(html, {
        url: `http://localhost/games/${game}/`,
        runScripts: "dangerously",
        resources: "usable",
        virtualConsole
      });
      
      await new Promise(r => setTimeout(r, 1000));
      console.log(`[${game}] DOM ready.`);
    } catch (e) {
      console.error(`[${game} FATAL]`, e.message || e);
    }
  }
})();
