import puppeteer from 'puppeteer';

const games = [
  'domino',
  'voidsector',
  'typingspeed',
  'wordscramble',
  'sky-dash'
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  for (const game of games) {
    console.log(`\n--- Testing ${game} ---`);
    const page = await browser.newPage();
    page.on('console', msg => console.log(`[${game} CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[${game} ERROR]`, err.toString()));
    page.on('requestfailed', request => {
      console.log(`[${game} NETWORK FAILED] ${request.url()} - ${request.failure().errorText}`);
    });
    
    // Test the live URL to see the exact production error
    try {
      await page.goto(`https://zlosttk.github.io/JavaScript-Games/games/${game}/`, { waitUntil: 'networkidle2', timeout: 15000 });
      console.log(`[${game}] Loaded.`);
    } catch (e) {
      console.error(`[${game} LOAD ERROR]`, e.message);
    }
    await page.close();
  }
  await browser.close();
})();
