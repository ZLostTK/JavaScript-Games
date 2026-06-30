document.addEventListener('DOMContentLoaded', async () => {
	const grid = document.getElementById('game-grid');
	const searchInput = document.getElementById('search-input');
	let cacheConfig = { name: 'js-games-v5', alwaysInclude: [] };
	let allGames = [];

	try {
		const res = await fetch('games.json');
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		if (data.cache) cacheConfig = data.cache;
		allGames = data.games;

		const CACHE_NAME = cacheConfig.name || 'js-games-v2';

		/** Lista completa de URLs a cachear para un juego descargado */
		function buildGameCacheUrls(g) {
			const files = new Set([
				`./${g.path}`,
				`./${g.image}`,
			]);

			(cacheConfig.gameBaseFiles || ['index.html', 'style.css', 'main.js']).forEach((f) => {
				files.add(`./${g.path}${f}`);
			});

			(cacheConfig.alwaysInclude || []).forEach((f) => files.add(`./${f}`));

			if (g.extraCacheFiles) {
				g.extraCacheFiles.forEach((f) => files.add(`./${f}`));
			}

			return [...files];
		}

		function renderGames(games) {
			grid.innerHTML = '';
			if (games.length === 0) {
				grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">No se encontraron juegos.</p>';
				return;
			}
			games.forEach(g => {
				const card = document.createElement('article');
				card.className = 'game-card';

				const tagsHtml = g.tags ? g.tags.map(t => `<span class="tag">${t}</span>`).join('') : '';

				card.innerHTML = `
					<img class="game-card-img" src="${g.image}" alt="${g.title}" style="background-color: ${g.color}">
					<div class="game-card-body">
						<h2>${g.title}</h2>
						<p>${g.description}</p>
						<div class="tags">
							${tagsHtml}
						</div>
						<div class="game-card-footer">
							<a href="${g.path}" class="btn btn-primary"><i class="fa-solid fa-play"></i> Jugar</a>
							<button class="btn btn-secondary cache-btn" data-path="${g.path}" data-image="${g.image}" title="Guardar para jugar sin conexión" style="flex: 0 0 auto; cursor: pointer;"><i class="fa-solid fa-download"></i></button>
							<a href="https://github.com/ZLostTK/JavaScript-Games" target="_blank" class="btn btn-secondary" title="Código fuente" style="flex: 0 0 auto;"><i class="fa-brands fa-github"></i></a>
						</div>
					</div>
				`;
				grid.appendChild(card);
			});
		}

		function setupCacheButtons() {
			document.querySelectorAll('.cache-btn').forEach(btn => {
				btn.addEventListener('click', async () => {
					const path = btn.getAttribute('data-path');
					const cacheState = btn.getAttribute('data-cached');

					try {
						btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
						btn.disabled = true;

						const cache = await caches.open(CACHE_NAME);
						const g = allGames.find(game => game.path === path);
						const filesToCache = g ? buildGameCacheUrls(g) : [];

						if (cacheState === 'true') {
							for (const file of filesToCache) {
								await cache.delete(file);
							}
							btn.setAttribute('data-cached', 'false');
							btn.innerHTML = '<i class="fa-solid fa-download"></i>';
							btn.style.color = '';
							btn.title = 'Guardar para jugar sin conexión';
							btn.disabled = false;
						} else {
							if (cacheState === 'update') {
								for (const file of filesToCache) {
									await cache.delete(file);
								}
							}
							await cache.addAll(filesToCache);
							btn.setAttribute('data-cached', 'true');
							btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
							btn.style.color = '#ef4444';
							btn.title = 'Eliminar de caché';
							btn.disabled = false;
						}
					} catch (err) {
						console.error('Error al modificar la caché del juego:', err);
						btn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
						btn.style.color = '#ef4444';
						btn.title = 'Error en la operación';

						setTimeout(() => {
							const currentCacheState = btn.getAttribute('data-cached');
							if (currentCacheState === 'update') {
								btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
								btn.style.color = '#3b82f6';
								btn.title = 'Actualizar juego (reemplazar caché)';
							} else if (currentCacheState === 'true') {
								btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
								btn.style.color = '#ef4444';
								btn.title = 'Eliminar de caché';
							} else {
								btn.innerHTML = '<i class="fa-solid fa-download"></i>';
								btn.style.color = '';
								btn.title = 'Guardar para jugar sin conexión';
							}
							btn.disabled = false;
						}, 2000);
					}
				});
			});
		}

		async function updateCacheStatus() {
			if (!('caches' in window)) return;
			const cache = await caches.open(CACHE_NAME);
			document.querySelectorAll('.cache-btn').forEach(async btn => {
				const path = btn.getAttribute('data-path');
				const match = await cache.match(`./${path}index.html`);
				if (match) {
					let isDifferent = false;
					try {
						const headRes = await fetch(`./${path}main.js?_nocache=${Date.now()}`, { method: 'HEAD' });
						if (headRes && headRes.ok) {
							const matchScript = await cache.match(`./${path}main.js`);
							if (matchScript) {
								const netLastMod = headRes.headers.get('Last-Modified');
								const cachedLastMod = matchScript.headers.get('Last-Modified');
								const netSize = headRes.headers.get('Content-Length');
								const cachedSize = matchScript.headers.get('Content-Length');

								if (netLastMod && cachedLastMod && netLastMod !== cachedLastMod) isDifferent = true;
								else if (netSize && cachedSize && netSize !== cachedSize) isDifferent = true;
							}
						}
					} catch (err) {
						console.log('No se pudo comprobar actualización para', path);
					}

					if (isDifferent) {
						btn.setAttribute('data-cached', 'update');
						btn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
						btn.style.color = '#3b82f6';
						btn.title = 'Actualizar juego (reemplazar caché)';
					} else {
						btn.setAttribute('data-cached', 'true');
						btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
						btn.style.color = '#ef4444';
						btn.title = 'Eliminar de caché';
					}
				} else {
					btn.setAttribute('data-cached', 'false');
				}
			});
		}

		renderGames(allGames);
		setupCacheButtons();
		updateCacheStatus();

		if (searchInput) {
			searchInput.addEventListener('input', () => {
				const q = searchInput.value.toLowerCase().trim();
				const filtered = q
					? allGames.filter(g =>
						g.title.toLowerCase().includes(q) ||
						g.description.toLowerCase().includes(q) ||
						(g.tags || []).some(t => t.toLowerCase().includes(q))
					)
					: allGames;
				renderGames(filtered);
				setupCacheButtons();
				updateCacheStatus();
			});
		}
	} catch (e) {
		grid.innerHTML = '<p style="color:#e94560;text-align:center;padding:2rem">Error al cargar los juegos.</p>';
		console.error(e);
	}

	const modal = document.getElementById('confirm-modal');
	const modalText = document.getElementById('confirm-modal-text');
	const modalCancel = document.getElementById('confirm-modal-cancel');
	const modalOk = document.getElementById('confirm-modal-ok');

	document.getElementById('clear-cache-btn').addEventListener('click', () => {
		modalText.textContent = '¿Borrar toda la caché? Se eliminarán todos los datos descargados y se recargará la página.';
		modal.classList.remove('hidden');
	});

	modalCancel.addEventListener('click', () => {
		modal.classList.add('hidden');
	});

	modalOk.addEventListener('click', async () => {
		modal.classList.add('hidden');
		const btn = document.getElementById('clear-cache-btn');
		btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Borrando...';
		btn.disabled = true;

		try {
			if ('caches' in window) {
				const keys = await caches.keys();
				await Promise.all(keys.map(k => caches.delete(k)));
			}
			localStorage.clear();
			sessionStorage.clear();
		} catch (err) {
			console.error('Error al borrar caché:', err);
		}

		window.location.reload();
	});

	// PWA Install Prompt
	let deferredPrompt;
	const pwaBanner = document.getElementById('pwa-banner');
	const installBtn = document.getElementById('install-btn');

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredPrompt = e;
		if (window.innerWidth <= 768) {
			pwaBanner.classList.remove('hidden');
		}
	});

	installBtn.addEventListener('click', async () => {
		if (deferredPrompt) {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;
			if (outcome === 'accepted') {
				pwaBanner.classList.add('hidden');
			}
			deferredPrompt = null;
		}
	});

	if ('serviceWorker' in navigator) {
		window.addEventListener('load', () => {
			navigator.serviceWorker.register('./sw.js').then(reg => {
				console.log('Service Worker registrado con éxito:', reg.scope);
			}).catch(err => {
				console.log('Error al registrar el Service Worker:', err);
			});
		});
	}
});
