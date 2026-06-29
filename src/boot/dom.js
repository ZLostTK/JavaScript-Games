import { DOMEngine } from '../core/DOMEngine.js';
import { GameBoot } from '../core/GameBoot.js';
import { EventBus } from '../core/EventBus.js';
import { Events } from '../core/Events.js';
import { Input } from '../modules/Input.js';
import { Audio } from '../modules/Audio.js';
import { Theme } from '../utils/Theme.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { installGlobals } from './install-globals.js';

installGlobals({
	DOMEngine,
	GameBoot,
	EventBus,
	Events,
	Input,
	Audio,
	Theme,
	AnimationSystem,
});
