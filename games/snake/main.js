import { GameBoot } from '../../src/core/GameBoot.js';
import { game } from './script.js';

GameBoot.start(game, { canvasId: 'game', width: 400, height: 400 });
