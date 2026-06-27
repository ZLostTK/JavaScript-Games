/* ═══════════════════════════════════════════════════════════════
WORD SCRAMBLE - script.js
DOM Engine game - unscramble words ES / EN
═══════════════════════════════════════════════════════════════ */

const ROUND_DURATION = 60;
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const LANGS = ['es', 'en'];
const HINT_COST = 3;
const SKIP_COST = 2;

const DIFF_LABELS = {
	easy:   { name: 'Fácil',  desc: '4–5 letras' },
	medium: { name: 'Medio',  desc: '6–8 letras' },
	hard:   { name: 'Difícil', desc: '9+ letras' },
};

function shuffle(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function normalize(str) {
	return str
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim();
}

function scrambleWord(word) {
	const letters = word.split('');
	let scrambled = shuffle(letters);
	let attempts = 0;
	while (scrambled.join('') === word && attempts < 10) {
		scrambled = shuffle(letters);
		attempts++;
	}
	return scrambled.join('');
}

function pickWord(lang, difficulty, used) {
	const pool = SCRAMBLE_WORDS[lang][difficulty].filter(w => !used.has(w));
	const source = pool.length > 0 ? pool : SCRAMBLE_WORDS[lang][difficulty];
	return source[Math.floor(Math.random() * source.length)];
}

const game = {
	state: 'select',
	lang: 'es',
	difficulty: 'medium',

	word: '',
	scrambled: '',
	usedWords: new Set(),
	score: 0,
	streak: 0,
	bestStreak: 0,
	solved: 0,
	skipped: 0,
	wrong: 0,
	hintsUsed: 0,
	timeLeft: ROUND_DURATION,
	duration: ROUND_DURATION,

	_timerInterval: null,
	_container: null,
	_inputEl: null,

	init() {
		this._container = DOMEngine.el('game-container');
		Audio.resume && Audio.resume();
		this._buildSounds();
		this._renderSelect();
	},

	update() {},

	render() {
		if (this.state === 'select')  return this._renderSelect();
		if (this.state === 'playing') return this._renderPlaying();
		if (this.state === 'results') return this._renderResults();
	},

	_buildSounds() {
		Audio.synth('tick',    'square', 440,  0.03, 0.05);
		Audio.synth('correct', 'sine',   660,  0.12, 0.15);
		Audio.synth('wrong',   'noise',  200,  0.06, 0.10);
		Audio.synth('hint',    'sine',   520,  0.08, 0.10);
		Audio.synth('finish',  'sine',   523,  0.25, 0.20);
	},

	_renderSelect() {
		const c = this._container;
		DOMEngine.clear(c);

		const backBtn = DOMEngine.create('button', '', c);
		backBtn.id = 'back-btn';
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver';
		backBtn.onclick = () => { location.href = '../../'; };

		const screen = DOMEngine.create('div', 'screen', c);

		const title = DOMEngine.create('h1', 'menu-title', screen);
		title.innerHTML = 'Word <span>Scramble</span>';

		const sub = DOMEngine.create('p', 'menu-subtitle', screen);
		sub.textContent = 'Descifra las letras mezcladas antes de que se acabe el tiempo. Elige idioma y dificultad.';

		// Language
		const langSection = DOMEngine.create('div', 'config-section', screen);
		const langLabel = DOMEngine.create('p', 'config-label', langSection);
		langLabel.textContent = 'Idioma';
		const langGroup = DOMEngine.create('div', 'btn-group', langSection);

		const langInfo = { es: '🇪🇸 Español', en: '🇬🇧 English' };
		LANGS.forEach(l => {
			const btn = DOMEngine.create('button', 'btn-option', langGroup);
			btn.textContent = langInfo[l];
			if (l === this.lang) DOMEngine.addClass(btn, 'active');
			btn.onclick = () => {
				this.lang = l;
				langGroup.querySelectorAll('.btn-option').forEach(b => DOMEngine.removeClass(b, 'active'));
				DOMEngine.addClass(btn, 'active');
				Audio.play('tick');
			};
		});

		// Difficulty
		const diffSection = DOMEngine.create('div', 'config-section', screen);
		const diffLabel = DOMEngine.create('p', 'config-label', diffSection);
		diffLabel.textContent = 'Dificultad';
		const diffGroup = DOMEngine.create('div', 'btn-group', diffSection);

		DIFFICULTIES.forEach(d => {
			const info = DIFF_LABELS[d];
			const btn = DOMEngine.create('button', 'btn-option', diffGroup);
			btn.textContent = `${info.name} (${info.desc})`;
			if (d === this.difficulty) DOMEngine.addClass(btn, 'active');
			btn.onclick = () => {
				this.difficulty = d;
				diffGroup.querySelectorAll('.btn-option').forEach(b => DOMEngine.removeClass(b, 'active'));
				DOMEngine.addClass(btn, 'active');
				Audio.play('tick');
			};
		});

		const startBtn = DOMEngine.create('button', 'btn-start', screen);
		startBtn.textContent = 'Comenzar';
		startBtn.onclick = () => {
			Audio.resume();
			this._startGame();
		};
	},

	_renderPlaying() {
		const c = this._container;
		DOMEngine.clear(c);

		const backBtn = DOMEngine.create('button', '', c);
		backBtn.id = 'back-btn';
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver';
		backBtn.onclick = () => {
			this._stopTimer();
			this.state = 'select';
			DOMEngine.render();
		};

		const screen = DOMEngine.create('div', 'screen', c);

		const header = DOMEngine.create('div', 'game-header', screen);

		const scorePill = DOMEngine.create('div', 'stat-pill', header);
		const scoreVal = DOMEngine.create('span', 'stat-value', scorePill);
		scoreVal.id = 'score-val';
		scoreVal.textContent = this.score;
		const scoreLbl = DOMEngine.create('span', 'stat-label', scorePill);
		scoreLbl.textContent = 'Puntos';

		const timerPill = DOMEngine.create('div', 'stat-pill', header);
		timerPill.id = 'timer-pill';
		const timerVal = DOMEngine.create('span', 'stat-value', timerPill);
		timerVal.id = 'timer-val';
		timerVal.textContent = this.timeLeft;
		const timerLbl = DOMEngine.create('span', 'stat-label', timerPill);
		timerLbl.textContent = 'seg';

		const solvedPill = DOMEngine.create('div', 'stat-pill', header);
		const solvedVal = DOMEngine.create('span', 'stat-value', solvedPill);
		solvedVal.id = 'solved-val';
		solvedVal.textContent = this.solved;
		const solvedLbl = DOMEngine.create('span', 'stat-label', solvedPill);
		solvedLbl.textContent = 'Aciertos';

		const progressWrap = DOMEngine.create('div', 'progress-wrap', screen);
		const progressBar = DOMEngine.create('div', 'progress-bar', progressWrap);
		progressBar.id = 'progress-bar';
		progressBar.style.width = (this.timeLeft / this.duration) * 100 + '%';

		if (this.streak >= 2) {
			const streak = DOMEngine.create('div', 'streak-badge', screen);
			streak.id = 'streak-badge';
			streak.innerHTML = `<i class="fa-solid fa-fire"></i> Racha: ${this.streak}`;
		}

		const scrambleDisplay = DOMEngine.create('div', 'scramble-display', screen);
		scrambleDisplay.id = 'scramble-display';
		this.scrambled.split('').forEach((ch, i) => {
			const tile = DOMEngine.create('span', 'letter-tile', scrambleDisplay);
			tile.textContent = ch;
			tile.style.animationDelay = (i * 0.04) + 's';
		});

		const answerRow = DOMEngine.create('div', 'answer-row', screen);
		const input = DOMEngine.create('input', '', answerRow);
		input.id = 'answer-input';
		input.setAttribute('type', 'text');
		input.setAttribute('autocomplete', 'off');
		input.setAttribute('autocorrect', 'off');
		input.setAttribute('autocapitalize', 'off');
		input.setAttribute('spellcheck', 'false');
		input.setAttribute('placeholder', 'Escribe la palabra...');
		this._inputEl = input;

		const submitBtn = DOMEngine.create('button', 'btn-submit', answerRow);
		submitBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
		submitBtn.onclick = () => this._checkAnswer();

		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this._checkAnswer();
			}
		});

		const actionBar = DOMEngine.create('div', 'action-bar', screen);

		const hintBtn = DOMEngine.create('button', 'btn-action', actionBar);
		hintBtn.id = 'hint-btn';
		hintBtn.innerHTML = `<i class="fa-solid fa-lightbulb"></i> Pista (−${HINT_COST})`;
		hintBtn.onclick = () => this._useHint();

		const skipBtn = DOMEngine.create('button', 'btn-action', actionBar);
		skipBtn.innerHTML = `<i class="fa-solid fa-forward"></i> Saltar (−${SKIP_COST})`;
		skipBtn.onclick = () => this._skipWord();

		const hintText = DOMEngine.create('p', 'hint-text', screen);
		hintText.id = 'hint-text';
		hintText.textContent = this._hintVisible ? `Primera letra: "${this.word[0].toUpperCase()}"` : '';

		setTimeout(() => input.focus(), 80);
	},

	_renderResults() {
		const c = this._container;
		DOMEngine.clear(c);

		const backBtn = DOMEngine.create('button', '', c);
		backBtn.id = 'back-btn';
		backBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver';
		backBtn.onclick = () => { location.href = '../../'; };

		const screen = DOMEngine.create('div', 'screen', c);

		const title = DOMEngine.create('h2', 'results-title', screen);
		title.textContent = '¡Tiempo!';

		const grid = DOMEngine.create('div', 'results-grid', screen);
		const stats = [
			{ value: this.score, label: 'Puntos', highlight: true },
			{ value: this.solved, label: 'Aciertos', highlight: false },
			{ value: this.bestStreak, label: 'Mejor racha', highlight: false },
			{ value: this.wrong, label: 'Errores', highlight: false },
		];
		stats.forEach(s => {
			const card = DOMEngine.create('div', 'result-card' + (s.highlight ? ' highlight' : ''), grid);
			const val = DOMEngine.create('span', 'rc-value', card);
			val.textContent = s.value;
			const lbl = DOMEngine.create('span', 'rc-label', card);
			lbl.textContent = s.label;
		});

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

	_startGame() {
		this.score = 0;
		this.streak = 0;
		this.bestStreak = 0;
		this.solved = 0;
		this.skipped = 0;
		this.wrong = 0;
		this.hintsUsed = 0;
		this.usedWords = new Set();
		this.timeLeft = ROUND_DURATION;
		this.duration = ROUND_DURATION;
		this._hintVisible = false;
		this.state = 'playing';

		this._stopTimer();
		this._nextWord();
		DOMEngine.render();
		this._startTimer();
	},

	_nextWord() {
		this.word = pickWord(this.lang, this.difficulty, this.usedWords);
		this.usedWords.add(this.word);
		this.scrambled = scrambleWord(this.word);
		this._hintVisible = false;
	},

	_checkAnswer() {
		if (this.state !== 'playing' || !this._inputEl) return;

		const answer = normalize(this._inputEl.value);
		if (!answer) return;

		if (answer === normalize(this.word)) {
			Audio.play('correct');
			DOMEngine.addClass(this._inputEl, 'correct');

			const timeBonus = Math.max(0, Math.floor(this.timeLeft / 10));
			const streakBonus = this.streak >= 3 ? 5 : 0;
			const base = this.difficulty === 'easy' ? 8 : this.difficulty === 'medium' ? 12 : 18;
			this.score += base + timeBonus + streakBonus;
			this.streak++;
			this.bestStreak = Math.max(this.bestStreak, this.streak);
			this.solved++;

			this._updateHeader();

			setTimeout(() => {
				this._nextWord();
				DOMEngine.render();
			}, 400);
		} else {
			Audio.play('wrong');
			this.wrong++;
			this.streak = 0;
			DOMEngine.addClass(this._inputEl, 'wrong');

			const display = DOMEngine.el('scramble-display');
			if (display) {
				DOMEngine.removeClass(display, 'shake');
				void display.offsetWidth;
				DOMEngine.addClass(display, 'shake');
			}

			setTimeout(() => {
				if (this._inputEl) {
					DOMEngine.removeClass(this._inputEl, 'wrong');
					this._inputEl.value = '';
					this._inputEl.focus();
				}
				const streakBadge = DOMEngine.el('streak-badge');
				if (streakBadge) streakBadge.remove();
			}, 350);
		}
	},

	_useHint() {
		if (this.state !== 'playing' || this._hintVisible) return;
		Audio.play('hint');
		this._hintVisible = true;
		this.hintsUsed++;
		this.score = Math.max(0, this.score - HINT_COST);

		const hintText = DOMEngine.el('hint-text');
		if (hintText) {
			hintText.textContent = `Primera letra: "${this.word[0].toUpperCase()}"`;
		}
		const hintBtn = DOMEngine.el('hint-btn');
		if (hintBtn) hintBtn.disabled = true;

		this._updateHeader();
	},

	_skipWord() {
		if (this.state !== 'playing') return;
		Audio.play('tick');
		this.skipped++;
		this.streak = 0;
		this.score = Math.max(0, this.score - SKIP_COST);
		this._nextWord();
		DOMEngine.render();
	},

	_updateHeader() {
		const scoreEl = DOMEngine.el('score-val');
		const solvedEl = DOMEngine.el('solved-val');
		if (scoreEl) scoreEl.textContent = this.score;
		if (solvedEl) solvedEl.textContent = this.solved;

		const streakBadge = DOMEngine.el('streak-badge');
		if (this.streak >= 2) {
			if (streakBadge) {
				streakBadge.innerHTML = `<i class="fa-solid fa-fire"></i> Racha: ${this.streak}`;
			}
		} else if (streakBadge) {
			streakBadge.remove();
		}
	},

	_startTimer() {
		if (this._timerInterval) return;
		this._timerInterval = setInterval(() => {
			this.timeLeft--;

			const timerEl = DOMEngine.el('timer-val');
			const barEl = DOMEngine.el('progress-bar');
			const pill = DOMEngine.el('timer-pill');

			if (timerEl) timerEl.textContent = this.timeLeft;
			if (barEl) {
				barEl.style.width = (this.timeLeft / this.duration) * 100 + '%';
				if (this.timeLeft <= 10) DOMEngine.addClass(barEl, 'danger');
			}
			if (pill) {
				if (this.timeLeft <= 10) DOMEngine.addClass(pill, 'timer-danger');
				else DOMEngine.removeClass(pill, 'timer-danger');
			}

			if (this.timeLeft <= 0) this._finishGame();
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
		Audio.play('finish');
		this.state = 'results';
		DOMEngine.render();
	},
};

GameBoot.startDOM(game);
