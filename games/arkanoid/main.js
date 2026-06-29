import '../../src/boot/canvas-mobile.js';
import { GameBoot } from '../../src/core/GameBoot.js';
import { game } from './script.js';

GameBoot.start(game, { canvasId: 'game', width: 480, height: 640 });
