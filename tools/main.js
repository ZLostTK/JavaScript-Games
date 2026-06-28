document.addEventListener('DOMContentLoaded', async () => {
	const grid = document.getElementById('tool-grid');
	const searchInput = document.getElementById('search-input');

	try {
		const res = await fetch('tools.json');
		const data = await res.json();
		const allTools = data.tools || [];

		function renderTools(tools) {
			grid.innerHTML = '';
			if (tools.length === 0) {
				grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">No se encontraron herramientas.</p>';
				return;
			}
			tools.forEach(t => {
				const card = document.createElement('article');
				card.className = 'tool-card';

				const tagsHtml = t.tags ? t.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '';

				card.innerHTML = `
					<img class="tool-card-img" src="${t.image}" alt="${t.title}" style="background-color: ${t.color}">
					<div class="tool-card-body">
						<h2>${t.title}</h2>
						<p>${t.description}</p>
						<div class="tags">${tagsHtml}</div>
						<div class="tool-card-footer">
							<a href="${t.path}" class="btn btn-primary"><i class="fa-solid fa-rocket"></i> Abrir</a>
							<a href="https://github.com/ZLostTK/JavaScript-Games" target="_blank" class="btn btn-secondary" title="Código fuente" style="flex: 0 0 auto;"><i class="fa-brands fa-github"></i></a>
						</div>
					</div>
				`;
				grid.appendChild(card);
			});
		}

		renderTools(allTools);

		if (searchInput) {
			searchInput.addEventListener('input', () => {
				const q = searchInput.value.toLowerCase().trim();
				const filtered = q
					? allTools.filter(t =>
						t.title.toLowerCase().includes(q) ||
						t.description.toLowerCase().includes(q) ||
						(t.tags || []).some(tag => tag.toLowerCase().includes(q))
					)
					: allTools;
				renderTools(filtered);
			});
		}
	} catch (e) {
		grid.innerHTML = '<p style="color:#e94560;text-align:center;padding:2rem">Error al cargar las herramientas.</p>';
		console.error(e);
	}
});
