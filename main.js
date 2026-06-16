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
            <a href="https://github.com/ZLostTK/JavaScript-Games" target="_blank" class="btn btn-secondary"><i class="fa-brands fa-github"></i> Código</a>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
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
});
