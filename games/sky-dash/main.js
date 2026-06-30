// main.js — boot entry, following the hub's pixi.js shim convention:
// import boot shim (here: local engine-shim.js) + game object, then
// PIXIEngine.init() + PIXIEngine.start(game).

import { PIXIEngine } from './engine-shim.js';
import { game } from './script.js';

(async () => {
  await PIXIEngine.init('game-container', {
    width: 960,
    height: 540,
    bg: 0x0f0f1a,
  });

  PIXIEngine.start(game);
})();
