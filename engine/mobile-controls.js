/** Touch/mobile on-screen control binding */
class MobileControls {
	static bind(game, mapping) {
		if (game._mobileControlsBound) return;
		game._mobileControlsBound = true;

		const bindBtn = (id, prop) => {
			const el = document.getElementById(id);
			if (!el) return;
			const down = (e) => {
				e.preventDefault();
				game[prop] = true;
				if (game.lastPressed !== undefined) game.lastPressed = prop;
			};
			const up = (e) => {
				e.preventDefault();
				game[prop] = false;
				if (game.lastPressed === prop) game.lastPressed = null;
			};
			el.addEventListener('touchstart', down, { passive: false });
			el.addEventListener('touchend', up, { passive: false });
			el.addEventListener('mousedown', down);
			el.addEventListener('mouseup', up);
			el.addEventListener('mouseleave', up);
		};

		for (const [id, prop] of Object.entries(mapping)) bindBtn(id, prop);

		if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
			document.getElementById('mobile-controls')?.classList.remove('hidden');
		}
	}
}
