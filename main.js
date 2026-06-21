document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('game-grid');
  try {
    const res = await fetch('games.json');
    const data = await res.json();
    
    data.games.forEach(g => {
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

    // Agregar event listeners a los botones de caché
    document.querySelectorAll('.cache-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const path = btn.getAttribute('data-path');
        const image = btn.getAttribute('data-image');
        const cacheState = btn.getAttribute('data-cached');
        
        try {
          const originalHTML = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          btn.disabled = true;

          const cache = await caches.open('js-games-v1');
          const filesToCache = [
            `./${path}`,
            `./${path}index.html`,
            `./${path}style.css`,
            `./${path}script.js`,
            `./${image}`
          ];
          
          if (cacheState === 'true') {
            // Desinstalar (eliminar de caché)
            for (const file of filesToCache) {
              await cache.delete(file);
            }
            btn.setAttribute('data-cached', 'false');
            btn.innerHTML = '<i class="fa-solid fa-download"></i>';
            btn.style.color = '';
            btn.title = 'Guardar para jugar sin conexión';
            btn.disabled = false;
          } else {
            // Instalar o Actualizar (añadir a caché)
            // Si es actualización, borramos lo viejo primero (aunque addAll sobrescribe, es más limpio)
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

    // Inicializar el estado visual de los botones según la caché actual
    if ('caches' in window) {
      caches.open('js-games-v1').then(cache => {
        document.querySelectorAll('.cache-btn').forEach(async btn => {
          const path = btn.getAttribute('data-path');
          const match = await cache.match(`./${path}index.html`);
          if (match) {
            let isDifferent = false;
            try {
              // Fetch HEAD del script principal para ver si ha cambiado
              const headRes = await fetch(`./${path}script.js?_nocache=${Date.now()}`, { method: 'HEAD' });
              if (headRes && headRes.ok) {
                const matchScript = await cache.match(`./${path}script.js`);
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
              btn.style.color = '#3b82f6'; // Azul
              btn.title = 'Actualizar juego (reemplazar caché)';
            } else {
              btn.setAttribute('data-cached', 'true');
              btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
              btn.style.color = '#ef4444'; // Rojo
              btn.title = 'Eliminar de caché';
            }
          } else {
            btn.setAttribute('data-cached', 'false');
          }
        });
      });
    }
  } catch (e) {
    grid.innerHTML = '<p style="color:#e94560;text-align:center;padding:2rem">Error al cargar los juegos.</p>';
    console.error(e);
  }

  // PWA Install Prompt Logic
  let deferredPrompt;
  const pwaBanner = document.getElementById('pwa-banner');
  const installBtn = document.getElementById('install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show banner only if it's likely a mobile device or screen is small
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

  // Registrar Service Worker
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
