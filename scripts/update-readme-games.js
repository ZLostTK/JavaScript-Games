import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const gamesJsonPath = join(root, 'games.json');
const readmePath = join(root, 'README.md');

try {
  // Read and parse games.json
  const gamesData = JSON.parse(readFileSync(gamesJsonPath, 'utf8'));
  const games = gamesData.games;

  // Sort games alphabetically by title for a clean README presentation
  const sortedGames = [...games].sort((a, b) => a.title.localeCompare(b.title));

  // Format markdown list
  const gamesListMarkdown = sortedGames.map(g => {
    const formattedPath = g.path.startsWith('./') ? g.path : `./${g.path}`;
    return `- **[${g.title}](${formattedPath})** — ${g.description}`;
  }).join('\n');

  // Read README.md
  let readmeContent = readFileSync(readmePath, 'utf8');

  // Define markers
  const startMarker = '<!-- GAMES_START -->';
  const endMarker = '<!-- GAMES_END -->';

  const startIndex = readmeContent.indexOf(startMarker);
  const endIndex = readmeContent.indexOf(endMarker);

  if (startIndex !== -1 && endIndex !== -1) {
    const before = readmeContent.substring(0, startIndex + startMarker.length);
    const after = readmeContent.substring(endIndex);
    readmeContent = `${before}\n\n${gamesListMarkdown}\n\n${after}`;
    writeFileSync(readmePath, readmeContent, 'utf8');
    console.log('README.md games list updated successfully between markers!');
  } else {
    // Fallback: locate ## Games and next section header (e.g. ## Features)
    const gamesHeader = '## Games';
    const nextHeader = '## Features';
    const gamesHeaderIndex = readmeContent.indexOf(gamesHeader);
    const nextHeaderIndex = readmeContent.indexOf(nextHeader);

    if (gamesHeaderIndex !== -1 && nextHeaderIndex !== -1) {
      const before = readmeContent.substring(0, gamesHeaderIndex + gamesHeader.length);
      const after = readmeContent.substring(nextHeaderIndex);
      readmeContent = `${before}\n\n${startMarker}\n${gamesListMarkdown}\n${endMarker}\n\n${after}`;
      writeFileSync(readmePath, readmeContent, 'utf8');
      console.log('README.md games list updated successfully and markers added!');
    } else {
      console.error('Error: Could not locate standard headers in README.md to perform update.');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('Error during README.md games update:', error);
  process.exit(1);
}
