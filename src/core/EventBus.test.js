import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus } from './EventBus.js';
import { Events } from './Events.js';

describe('EventBus', () => {
	beforeEach(() => EventBus.clear());

	it('entrega eventos a los suscriptores', () => {
		const fn = vi.fn();
		EventBus.on('test', fn);
		EventBus.emit('test', { value: 42 });
		expect(fn).toHaveBeenCalledWith({ value: 42 });
	});

	it('desuscribe con off', () => {
		const fn = vi.fn();
		EventBus.on('test', fn);
		EventBus.off('test', fn);
		EventBus.emit('test');
		expect(fn).not.toHaveBeenCalled();
	});

	it('once solo se ejecuta una vez', () => {
		const fn = vi.fn();
		EventBus.once('test', fn);
		EventBus.emit('test');
		EventBus.emit('test');
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('varios listeners reaccionan al mismo evento', () => {
		const a = vi.fn();
		const b = vi.fn();
		EventBus.on(Events.INPUT_KEY_PRESSED, a);
		EventBus.on(Events.INPUT_KEY_PRESSED, b);
		EventBus.emit(Events.INPUT_KEY_PRESSED, { code: 'Space' });
		expect(a).toHaveBeenCalledWith({ code: 'Space' });
		expect(b).toHaveBeenCalledWith({ code: 'Space' });
	});
});

describe('Audio vía EventBus', () => {
	beforeEach(() => EventBus.clear());

	it('Audio escucha AUDIO_PLAY sin llamada directa', async () => {
		window.AudioContext = class {
			createBuffer() { return { getChannelData: () => new Float32Array(0) }; }
			createBufferSource() { return { connect() {}, start() {} }; }
			createGain() { return { gain: {}, connect() {} }; }
			get sampleRate() { return 44100; }
			get destination() { return {}; }
		};
		const { Audio } = await import('../modules/Audio.js');
		Audio._busReady = false;
		Audio.init();
		const playSpy = vi.spyOn(Audio, 'play').mockReturnValue(null);
		EventBus.emit(Events.AUDIO_PLAY, { name: 'test', vol: 0.5 });
		expect(playSpy).toHaveBeenCalledWith('test', 0.5, false);
	});
});

describe('AnimationSystem vía EventBus', () => {
	beforeEach(() => EventBus.clear());

	it('registra y cambia estado de máquinas', async () => {
		const { AnimationSystem } = await import('../systems/AnimationSystem.js');
		AnimationSystem.init();
		const machine = { setState: vi.fn(), update: vi.fn() };
		EventBus.emit(Events.ANIMATION_REGISTER, { id: 'hero', machine });
		EventBus.emit(Events.ANIMATION_SET_STATE, { id: 'hero', state: 'walk' });
		expect(machine.setState).toHaveBeenCalledWith('walk');
		AnimationSystem.update(0.016);
		expect(machine.update).toHaveBeenCalledWith(0.016);
	});
});
