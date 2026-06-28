class Audio {
	static init() {
		this._ctx = new (window.AudioContext || window.webkitAudioContext)();
		this._buffers = {};
		this._muted = false;
	}
	
	static resume() {
		if (this._ctx?.state === 'suspended') this._ctx.resume();
	}
	
	static load(name, url) {
		return fetch(url)
		.then(r => r.arrayBuffer())
		.then(b => this._ctx.decodeAudioData(b))
		.then(b => { this._buffers[name] = b; });
	}
	
	static _createSynthBuffer(type, freq, duration, volume, slideFreq = null) {
		const sr = this._ctx.sampleRate;
		const len = Math.ceil(sr * duration);
		const buf = this._ctx.createBuffer(1, len, sr);
		const d = buf.getChannelData(0);
		for (let i = 0; i < len; i++) {
			const t = i / sr;
			const f = slideFreq != null ? freq + (slideFreq - freq) * (t / duration) : freq;
			let v = 0;
			if (type === 'square') v = Math.sign(Math.sin(2 * Math.PI * f * t));
			else if (type === 'sine') v = Math.sin(2 * Math.PI * f * t);
			else if (type === 'saw') v = 2 * (f * t - Math.floor(f * t + 0.5));
			else if (type === 'noise') v = Math.random() * 2 - 1;
			else v = Math.sin(2 * Math.PI * f * t);
			const env = Math.min(1, 2 * t / duration, 2 * (duration - t) / duration);
			d[i] = v * volume * Math.max(0, env);
		}
		return buf;
	}
	
	static _playBuffer(buf, vol = 1) {
		this.resume();
		const s = this._ctx.createBufferSource();
		s.buffer = buf;
		const g = this._ctx.createGain();
		g.gain.value = vol;
		s.connect(g);
		g.connect(this._ctx.destination);
		s.start();
		return { source: s, gain: g };
	}
	
	static synth(nameOrOpts, type = 'sine', freq = 440, duration = 0.1, volume = 0.3, slideFreq = null) {
		if (typeof nameOrOpts === 'object' && nameOrOpts !== null) {
			const o = nameOrOpts;
			if ((o.duration ?? 0.1) <= 0) return null;
			const buf = this._createSynthBuffer(
				o.type ?? 'sine',
				o.freq ?? 440,
				o.duration ?? 0.1,
				o.volume ?? 0.3,
				o.slideFreq ?? null,
			);
			return this._playBuffer(buf);
		}
		
		if (duration <= 0) return;
		this._buffers[nameOrOpts] = this._createSynthBuffer(type, freq, duration, volume, slideFreq);
	}
	
	static play(name, vol = 1, loop = false) {
		if (this._muted || !this._buffers[name]) return null;
		this.resume();
		const s = this._ctx.createBufferSource();
		s.buffer = this._buffers[name];
		s.loop = loop;
		const g = this._ctx.createGain();
		g.gain.value = vol;
		s.connect(g);
		g.connect(this._ctx.destination);
		s.start();
		return { source: s, gain: g };
	}
	
	static toggleMute() {
		this._muted = !this._muted;
		return this._muted;
	}
}
