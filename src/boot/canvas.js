import { Engine } from '../core/Engine.js';
import { RenderBridge } from '../core/RenderBridge.js';
import { GameBoot } from '../core/GameBoot.js';
import { EventBus } from '../core/EventBus.js';
import { Events } from '../core/Events.js';
import { Input } from '../modules/Input.js';
import { Audio } from '../modules/Audio.js';
import { Theme } from '../utils/Theme.js';
import { UICanvas } from '../modules/ui/UICanvas.js';
import { UIMenu } from '../modules/ui/UIMenu.js';
import { GameOverlay } from '../modules/ui/GameOverlay.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { installGlobals } from './install-globals.js';

installGlobals({
	Engine,
	RenderBridge,
	GameBoot,
	EventBus,
	Events,
	Input,
	Audio,
	Theme,
	UICanvas,
	UIMenu,
	GameOverlay,
	AnimationSystem,
});
