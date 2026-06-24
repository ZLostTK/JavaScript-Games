/* ═══════════════════════════════════════════════════════════════
TYPING SPEED TEST — script.js
DOM Engine game — no canvas
═══════════════════════════════════════════════════════════════ */

/* ── Config ─────────────────────────────────────────────────── */
const DURATIONS = [15, 30, 60, 120];
const MODES = ['words', 'numbers', 'quotes'];
const LANGS = ['es', 'en'];

/* ── WPM rank table ─────────────────────────────────────────── */
function getRank(wpm) {
	if (wpm >= 120) return { emoji: '<i class="fa-solid fa-rocket"></i>', name: 'Velocidad Luz',  desc: '¡Top 1% mundial!'         };
	if (wpm >= 90)  return { emoji: '<i class="fa-solid fa-bolt"></i>', name: 'Experto',        desc: 'Escritura excepcional'     };
	if (wpm >= 60)  return { emoji: '<i class="fa-solid fa-fire"></i>', name: 'Avanzado',       desc: 'Por encima del promedio'   };
	if (wpm >= 40)  return { emoji: '<i class="fa-solid fa-dumbbell"></i>', name: 'Intermedio',     desc: 'Progresando bien'          };
	if (wpm >= 20)  return { emoji: '<i class="fa-solid fa-book"></i>', name: 'Principiante',   desc: '¡Sigue practicando!'       };
	return               { emoji: '<i class="fa-solid fa-turtle"></i>', name: 'Iniciando',       desc: 'La práctica hace al maestro' };
}

/* ── Helpers ────────────────────────────────────────────────── */
function shuffle(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function generateText(mode, lang) {
	if (mode === 'quotes') {
		const q = WORD_POOLS[lang].quotes;
		return q[Math.floor(Math.random() * q.length)];
	}
	if (mode === 'numbers') {
		const pool = shuffle(WORD_POOLS.numbers);
		const extended = [...pool, ...pool, ...pool];
		return extended.slice(0, 80).join(' ');
	}
	const pool = shuffle(WORD_POOLS[lang].words);
	const extended = [...pool, ...pool, ...pool];
	return extended.slice(0, 80).join(' ');
}

/* ════════════════════════════════════════════════════════════
GAME OBJECT
════════════════════════════════════════════════════════════ */
const game = {
	/* ── State ── */
	state:    'select',  // 'select' | 'playing' | 'results'
	duration: 30,
	mode:     'words',
	lang:     'es',
	
	text:     '',
	chars:    [],        // array of { char, status } — 'pending'|'correct'|'wrong'|'current'
	inputIdx: 0,         // next char to type
	errors:   0,
	corrections: 0,  // backspace presses — partial penalty recovery
	totalTyped: 0,
	startTime: null,
	timeLeft:  30,
	wpm:       0,
	rawWpm:    0,
	accuracy:  100,
	
	_timerInterval: null,
	_inputEl:       null,
	_charEls:       [],  // span elements for each char
	_container:     null,
	
	/* ════════════════════════════════════
	INIT
	════════════════════════════════════ */
	init() {
		this._container = DOMEngine.el('game-container');
		Audio.resume && Audio.resume();
		this._buildSounds();
		this._renderSelect();
	},
	
	update(dt) {
		// Nothing needed — timer runs via setInterval on start
	},
	
	render() {
		if (this.state === 'select')  return this._renderSelect();
		if (this.state === 'playing') return this._renderPlaying();
		if (this.state === 'results') return this._renderResults();
	},
	
	/* ════════════════════════════════════
	SOUNDS
	════════════════════════════════════ */
	_buildSounds() {
		Audio.synth('key',     'square', 800,  0.04, 0.08);
		Audio.synth('keyWrong','noise',  200,  0.06, 0.10);
		Audio.synth('finish',  'sine',   523,  0.25, 0.20);
		Audio.synth('tick',    'square', 440,  0.03, 0.05);
	},
	
	/* ════════════════════════════════════
	SELECT SCREEN
	════════════════════════════════════ */
	_renderSelect() {
		const c = this._container;
		DOMEngine.clear(c);
		
		// Back btn is fixed — re-append so it stays on top
		const backBtn = DOMEngine.create('button', '', c);
		backBtn.id = 'back-btn';
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver';
		backBtn.onclick = () => { location.href = '../../'; };
		
		const screen = DOMEngine.create('div', 'screen', c);
		
		// Title
		const title = DOMEngine.create('h1', 'menu-title', screen);
		title.innerHTML = 'Typing <span>Speed</span> Test';
		
		const sub = DOMEngine.create('p', 'menu-subtitle', screen);
		sub.textContent = 'Pon a prueba tu velocidad y precisión. Elige idioma, duración y modo de escritura.';
		
		// Language selector
		const langSection = DOMEngine.create('div', 'config-section', screen);
		const langLabel = DOMEngine.create('p', 'config-label', langSection);
		langLabel.textContent = 'Idioma';
		const langGroup = DOMEngine.create('div', 'btn-group', langSection);
		
		const langInfo = {
			es: { flag: '🇪🇸', name: 'Español' },
			en: { flag: '🇬🇧', name: 'English' },
		};
		
		LANGS.forEach(l => {
			const info = langInfo[l];
			const btn = DOMEngine.create('button', 'btn-option btn-lang', langGroup);
			btn.innerHTML = `${info.flag} ${info.name}`;
			if (l === this.lang) DOMEngine.addClass(btn, 'active');
			btn.onclick = () => {
				this.lang = l;
				langGroup.querySelectorAll('.btn-option').forEach(b => DOMEngine.removeClass(b, 'active'));
				DOMEngine.addClass(btn, 'active');
				Audio.play('tick');
				this._updateModeDescriptions(modeGrid);
			};
		});
		
		// Duration selector
		const durSection = DOMEngine.create('div', 'config-section', screen);
		const durLabel = DOMEngine.create('p', 'config-label', durSection);
		durLabel.textContent = 'Duración';
		const durGroup = DOMEngine.create('div', 'btn-group', durSection);
		
		DURATIONS.forEach(d => {
			const btn = DOMEngine.create('button', 'btn-option', durGroup);
			btn.textContent = d + 's';
			if (d === this.duration) DOMEngine.addClass(btn, 'active');
			btn.onclick = () => {
				this.duration = d;
				durGroup.querySelectorAll('.btn-option').forEach(b => DOMEngine.removeClass(b, 'active'));
				DOMEngine.addClass(btn, 'active');
				Audio.play('tick');
			};
		});
		
		// Mode selector
		const modeSection = DOMEngine.create('div', 'config-section', screen);
		const modeLabel = DOMEngine.create('p', 'config-label', modeSection);
		modeLabel.textContent = 'Modo';
		const modeGrid = DOMEngine.create('div', 'mode-grid', modeSection);
		modeGrid.id = 'mode-grid';
		
		MODES.forEach(m => {
			const info = this._getModeInfo(m);
			const btn = DOMEngine.create('button', 'btn-mode', modeGrid);
			btn.dataset.mode = m;
			if (m === this.mode) DOMEngine.addClass(btn, 'active');
			
			const icon = DOMEngine.create('span', 'mode-icon', btn);
			icon.innerHTML = info.icon;
			const name = DOMEngine.create('span', 'mode-name', btn);
			name.textContent = info.name;
			const desc = DOMEngine.create('span', 'mode-desc', btn);
			desc.textContent = info.desc;
			
			btn.onclick = () => {
				this.mode = m;
				modeGrid.querySelectorAll('.btn-mode').forEach(b => DOMEngine.removeClass(b, 'active'));
				DOMEngine.addClass(btn, 'active');
				Audio.play('tick');
			};
		});
		
		// Start button
		const startBtn = DOMEngine.create('button', 'btn-start', screen);
		startBtn.textContent = 'Comenzar Test';
		startBtn.onclick = () => {
			Audio.resume();
			this._startGame();
		};
	},
	
	/* ════════════════════════════════════
	PLAYING SCREEN
	════════════════════════════════════ */
	_renderPlaying() {
		const c = this._container;
		DOMEngine.clear(c);
		
		// Back btn
		const backBtn = DOMEngine.create('button', '', c);
		backBtn.id = 'back-btn';
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver';
		backBtn.onclick = () => {
			this._stopTimer();
			this.state = 'select';
			DOMEngine.render();
		};
		
		const screen = DOMEngine.create('div', 'screen', c);
		
		// ── Header row ──
		const header = DOMEngine.create('div', 'game-header', screen);
		
		// WPM pill
		const wpmPill = DOMEngine.create('div', 'stat-pill', header);
		wpmPill.id = 'wpm-pill';
		const wpmVal = DOMEngine.create('span', 'stat-value', wpmPill);
		wpmVal.id = 'wpm-val';
		wpmVal.textContent = '0';
		const wpmLbl = DOMEngine.create('span', 'stat-label', wpmPill);
		wpmLbl.textContent = 'WPM';
		
		// Timer pill
		const timerPill = DOMEngine.create('div', 'stat-pill', header);
		timerPill.id = 'timer-pill';
		const timerVal = DOMEngine.create('span', 'stat-value', timerPill);
		timerVal.id = 'timer-val';
		timerVal.textContent = this.duration;
		const timerLbl = DOMEngine.create('span', 'stat-label', timerPill);
		timerLbl.textContent = 'seg';
		
		// Accuracy pill
		const accPill = DOMEngine.create('div', 'stat-pill', header);
		const accVal = DOMEngine.create('span', 'stat-value', accPill);
		accVal.id = 'acc-val';
		accVal.textContent = '100%';
		const accLbl = DOMEngine.create('span', 'stat-label', accPill);
		accLbl.textContent = 'Precisión';
		
		// ── Progress bar ──
		const progressWrap = DOMEngine.create('div', 'progress-wrap', screen);
		const progressBar  = DOMEngine.create('div', 'progress-bar',  progressWrap);
		progressBar.id = 'progress-bar';
		progressBar.style.width = '100%';
		
		// ── Text display ──
		const textDisplay = DOMEngine.create('div', 'text-display', screen);
		textDisplay.id = 'text-display';
		textDisplay.setAttribute('tabindex', '0');
		
		// Hidden input for mobile keyboard
		const hiddenInput = DOMEngine.create('input', '', textDisplay);
		hiddenInput.id = 'typing-input';
		hiddenInput.setAttribute('type', 'text');
		hiddenInput.setAttribute('autocomplete', 'off');
		hiddenInput.setAttribute('autocorrect', 'off');
		hiddenInput.setAttribute('autocapitalize', 'off');
		hiddenInput.setAttribute('spellcheck', 'false');
		// Numeric keyboard on mobile for numbers mode
		if (this.mode === 'numbers') {
			hiddenInput.setAttribute('inputmode', 'numeric');
			hiddenInput.setAttribute('pattern', '[0-9]*');
		} else {
			hiddenInput.setAttribute('inputmode', 'text');
		}
		this._inputEl = hiddenInput;
		
		// Build char spans
		this._charEls = [];
		for (let i = 0; i < this.chars.length; i++) {
			const span = DOMEngine.create('span', 'char pending', textDisplay);
			span.textContent = this.chars[i].char;
			this._charEls.push(span);
		}
		// Mark first char as current
		if (this._charEls.length > 0) {
			DOMEngine.removeClass(this._charEls[0], 'pending');
			DOMEngine.addClass(this._charEls[0], 'current');
		}
		
		// ── Input bindings ──
		// Click on text display → focus hidden input (mobile)
		textDisplay.addEventListener('click', () => {
			hiddenInput.focus();
		});
		// Also focus on load for desktop
		setTimeout(() => hiddenInput.focus(), 80);
		
		hiddenInput.addEventListener('input', (e) => this._onInput(e));
		hiddenInput.addEventListener('keydown', (e) => {
			if (e.key === 'Tab') {
				e.preventDefault();
				this._stopTimer();
				this.state = 'select';
				DOMEngine.render();
			} else if (e.key === 'Backspace') {
				this._handleBackspace(e);
			}
		});
		
		// ── Hint ──
		const hint = DOMEngine.create('p', 'kbd-hint', screen);
		hint.innerHTML = 'Escribe el texto de arriba &nbsp;·&nbsp; <kbd>Tab</kbd> para reiniciar';
		
		// Tap hint for mobile
		const tapHint = DOMEngine.create('p', 'tap-hint', screen);
		tapHint.textContent = 'Toca el texto para abrir el teclado en móvil';
	},
	
	/* ════════════════════════════════════
	RESULTS SCREEN
	════════════════════════════════════ */
	_renderResults() {
		const c = this._container;
		DOMEngine.clear(c);
		
		// Back btn
		const backBtn = DOMEngine.create('button', '', c);
		backBtn.id = 'back-btn';
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver';
		backBtn.onclick = () => { location.href = '../../'; };
		
		const screen = DOMEngine.create('div', 'screen', c);
		
		const title = DOMEngine.create('h2', 'results-title', screen);
		title.textContent = '¡Tiempo!';
		
		// Stats grid
		const grid = DOMEngine.create('div', 'results-grid', screen);
		
		const statsData = [
			{ value: this.wpm,                 unit: 'WPM',  label: 'Velocidad neta',    highlight: true },
			{ value: this.rawWpm,              unit: 'WPM',  label: 'Velocidad bruta',   highlight: false },
			{ value: this.accuracy + '%',      unit: '',     label: 'Precisión',         highlight: false },
			{ value: this.errors,              unit: '',     label: 'Errores',           highlight: false },
			{ value: this.totalTyped,          unit: '',     label: 'Caracteres',        highlight: false },
		];
		
		statsData.forEach(s => {
			const card = DOMEngine.create('div', 'result-card' + (s.highlight ? ' highlight' : ''), grid);
			const val  = DOMEngine.create('span', 'rc-value', card);
			val.textContent = s.value;
			if (s.unit) {
				const unit = DOMEngine.create('span', 'rc-unit', card);
				unit.textContent = s.unit;
			}
			const lbl = DOMEngine.create('span', 'rc-label', card);
			lbl.textContent = s.label;
		});
		
		// Rank badge
		const rank = getRank(this.wpm);
		const badge = DOMEngine.create('div', 'rank-badge', screen);
		const emoji = DOMEngine.create('span', 'rank-emoji', badge);
		emoji.innerHTML = rank.emoji;
		const rankText = DOMEngine.create('div', 'rank-text', badge);
		const rankName = DOMEngine.create('span', 'rank-name', rankText);
		rankName.textContent = rank.name;
		const rankDesc = DOMEngine.create('span', 'rank-desc', rankText);
		rankDesc.textContent = rank.desc;
		
		// Action buttons
		const actions = DOMEngine.create('div', 'action-row', screen);
		
		const retryBtn = DOMEngine.create('button', 'btn-retry', actions);
		retryBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Repetir';
		retryBtn.onclick = () => {
			Audio.play('tick');
			this._startGame();
		};
		
		const menuBtn = DOMEngine.create('button', 'btn-menu', actions);
		menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i> Menú';
		menuBtn.onclick = () => {
			this.state = 'select';
			DOMEngine.render();
		};
	},
	
	/* ════════════════════════════════════
	GAME LOGIC
	════════════════════════════════════ */
	_startGame() {
		this.text       = generateText(this.mode, this.lang);
		this.chars      = this.text.split('').map(ch => ({ char: ch, status: 'pending' }));
		this.inputIdx   = 0;
		this.errors     = 0;
		this.corrections = 0;
		this.totalTyped = 0;
		this.startTime  = null;
		this.timeLeft   = this.duration;
		this.wpm        = 0;
		this.rawWpm     = 0;
		this.accuracy   = 100;
		this._charEls   = [];
		this.state      = 'playing';
		
		this._stopTimer();
		DOMEngine.render();
		// After render the DOM is built — skip leading spaces if numbers mode
		if (this.mode === 'numbers') setTimeout(() => this._skipSpaces(), 0);
	},
	
	_onInput(e) {
		if (this.state !== 'playing') return;
		
		Audio.resume();
		
		const input = this._inputEl;
		const typed = input.value;
		if (!typed) return;
		
		// Start timer on first keystroke
		if (!this.startTime) {
			this.startTime = Date.now();
			this._startTimer();
		}
		
		// Process each character typed (handle paste / fast typing)
		for (const ch of typed) {
			if (this.inputIdx >= this.chars.length) break;
			this._processChar(ch);
		}
		
		// Clear the hidden input
		input.value = '';
	},
	
	_handleBackspace(e) {
		if (this.state !== 'playing' || this.inputIdx <= 0) return;
		
		Audio.resume();
		
		if (this.inputIdx < this.chars.length) {
			DOMEngine.removeClass(this._charEls[this.inputIdx], 'current');
		}
		
		this.inputIdx--;
		
		// In numbers mode, also skip back over any auto-passed spaces
		if (this.mode === 'numbers') {
			while (this.inputIdx > 0 && this.chars[this.inputIdx].char === ' ') {
				const spaceSpan = this._charEls[this.inputIdx];
				DOMEngine.removeClass(spaceSpan, 'correct', 'current');
				DOMEngine.addClass(spaceSpan, 'pending');
				this.chars[this.inputIdx].status = 'pending';
				this.inputIdx--;
			}
		}
		
		const prevChar = this.chars[this.inputIdx];
		if (prevChar.status === 'wrong') {
			// Correction noted but errors stay — partial recovery only
			this.corrections++;
		}
		prevChar.status = 'pending';
		
		const span = this._charEls[this.inputIdx];
		DOMEngine.removeClass(span, 'correct', 'wrong');
		DOMEngine.addClass(span, 'pending', 'current');
		
		this.totalTyped = Math.max(0, this.totalTyped - 1);
		this._updateLiveStats();
	},
	
	_processChar(ch) {
		if (this.inputIdx >= this.chars.length) return;
		
		const expected = this.chars[this.inputIdx].char;
		const correct  = ch === expected;
		
		// Update char status
		this.chars[this.inputIdx].status = correct ? 'correct' : 'wrong';
		const span = this._charEls[this.inputIdx];
		DOMEngine.removeClass(span, 'current', 'pending');
		DOMEngine.addClass(span, correct ? 'correct' : 'wrong');
		
		this.totalTyped++;
		if (!correct) {
			this.errors++;
			Audio.play('keyWrong', 0.4);
			
			// Shake animation
			const display = DOMEngine.el('text-display');
			if (display) {
				DOMEngine.removeClass(display, 'shake');
				void display.offsetWidth; // reflow
				DOMEngine.addClass(display, 'shake');
			}
		} else {
			Audio.play('key', 0.3);
		}
		
		this.inputIdx++;
		
		// Mark next char as current
		if (this.inputIdx < this.chars.length) {
			DOMEngine.removeClass(this._charEls[this.inputIdx], 'pending');
			DOMEngine.addClass(this._charEls[this.inputIdx], 'current');
		}
		
		// Update live stats
		this._updateLiveStats();
		
		// In numbers mode auto-advance past spaces
		if (this.mode === 'numbers') this._skipSpaces();
		
		// Check if text completed
		if (this.inputIdx >= this.chars.length) {
			const hasErrors = this.chars.some(c => c.status === 'wrong');
			if (!hasErrors) {
				this._finishGame();
			}
		}
	},
	
	/** Auto-advance past spaces in numbers mode (they show but don't require input). */
	_skipSpaces() {
		while (
			this.inputIdx < this.chars.length &&
			this.chars[this.inputIdx].char === ' '
		) {
			// Mark space as correct silently
			this.chars[this.inputIdx].status = 'correct';
			const span = this._charEls[this.inputIdx];
			if (span) {
				DOMEngine.removeClass(span, 'pending', 'current', 'wrong');
				DOMEngine.addClass(span, 'correct');
			}
			this.inputIdx++;
			// Mark the next real char as current
			if (this.inputIdx < this.chars.length) {
				DOMEngine.removeClass(this._charEls[this.inputIdx], 'pending');
				DOMEngine.addClass(this._charEls[this.inputIdx], 'current');
			}
		}
	},
	
	_updateLiveStats() {
		if (!this.startTime) return;
		
		const elapsed = (Date.now() - this.startTime) / 1000 / 60; // minutes
		const correctChars = this.chars.filter(c => c.status === 'correct').length;
		const rawWpm   = Math.round((this.totalTyped / 5) / Math.max(elapsed, 0.001));
		const netWpm   = Math.round((correctChars  / 5) / Math.max(elapsed, 0.001));
		
		// Accuracy: errors are permanent; corrections recover only 30% of each mistake
		const effectiveErrors = this.errors - (this.corrections * 0.3);
		const base = this.errors > 0 ? this.totalTyped + this.errors : this.totalTyped;
		const accuracy = base > 0
			? Math.max(0, Math.round((base - effectiveErrors) / base * 100))
			: 100;
		
		this.wpm      = Math.max(0, netWpm);
		this.rawWpm   = Math.max(0, rawWpm);
		this.accuracy = accuracy;
		
		const wpmEl = DOMEngine.el('wpm-val');
		const accEl = DOMEngine.el('acc-val');
		if (wpmEl) wpmEl.textContent = this.wpm;
		if (accEl) accEl.textContent = this.accuracy + '%';
	},
	
	_startTimer() {
		this._timerInterval = setInterval(() => {
			this.timeLeft--;
			
			const timerEl = DOMEngine.el('timer-val');
			const barEl   = DOMEngine.el('progress-bar');
			const pill    = DOMEngine.el('timer-pill');
			
			if (timerEl) timerEl.textContent = this.timeLeft;
			
			// Progress bar
			if (barEl) {
				const pct = (this.timeLeft / this.duration) * 100;
				barEl.style.width = pct + '%';
				if (this.timeLeft <= 5) {
					DOMEngine.addClass(barEl, 'danger');
				}
			}
			
			// Danger flash on timer
			if (pill) {
				if (this.timeLeft <= 5) DOMEngine.addClass(pill, 'timer-danger');
				else DOMEngine.removeClass(pill, 'timer-danger');
			}
			
			if (this.timeLeft <= 0) {
				this._finishGame();
			}
		}, 1000);
	},
	
	_stopTimer() {
		if (this._timerInterval) {
			clearInterval(this._timerInterval);
			this._timerInterval = null;
		}
	},
	
	_finishGame() {
		this._stopTimer();
		
		// Final stats
		const elapsed = this.startTime
		? (Date.now() - this.startTime) / 1000 / 60
		: this.duration / 60;
		
		const correctChars = this.chars.filter(c => c.status === 'correct').length;
		this.rawWpm   = Math.round((this.totalTyped / 5) / Math.max(elapsed, 0.001));
		this.wpm      = Math.round((correctChars  / 5) / Math.max(elapsed, 0.001));
		// Same persistent accuracy formula as live stats
		const effectiveErrors = this.errors - (this.corrections * 0.3);
		const base = this.errors > 0 ? this.totalTyped + this.errors : this.totalTyped;
		this.accuracy = base > 0
			? Math.max(0, Math.round((base - effectiveErrors) / base * 100))
			: 100;
		
		Audio.play('finish');
		
		this.state = 'results';
		DOMEngine.render();
	},
	
	_getModeInfo(mode) {
		const langLabel = this.lang === 'es' ? 'español' : 'inglés';
		const infos = {
			words:   { icon: '<i class="fa-solid fa-file-lines"></i>', name: 'Palabras', desc: `Palabras comunes en ${langLabel}` },
			numbers: { icon: '<i class="fa-solid fa-hashtag"></i>',    name: 'Números',  desc: 'Practica con cifras y dígitos' },
			quotes:  { icon: '<i class="fa-solid fa-quote-left"></i>', name: 'Citas',  desc: `Frases y citas en ${langLabel}` },
		};
		return infos[mode];
	},
	
	_updateModeDescriptions(modeGrid) {
		if (!modeGrid) return;
		modeGrid.querySelectorAll('.btn-mode').forEach(btn => {
			const info = this._getModeInfo(btn.dataset.mode);
			const desc = btn.querySelector('.mode-desc');
			if (desc) desc.textContent = info.desc;
		});
	},
};

/* ════════════════════════════════════
BOOT
════════════════════════════════════ */
window.onload = () => {
	DOMEngine.init('game-container', { fps: 60 });
	DOMEngine.start(game);
};