// ============================================
// RPM Fest — Ganadores Loader from /api/ganadores
// ============================================

(async function loadGanadores() {
  const container = document.getElementById('ganadores-content');
  if (!container) return;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  let data;
  try {
    const res = await fetch('/api/ganadores');
    if (!res.ok) throw new Error('Not found');
    data = await res.json();
  } catch {
    container.innerHTML = '<p class="ganadores-empty">No se pudieron cargar los ganadores.</p>';
    return;
  }

  const editions = data && Array.isArray(data.editions) ? data.editions : [];
  if (editions.length === 0) {
    container.innerHTML = '<p class="ganadores-empty">Todavía no hay ganadores publicados.</p>';
    return;
  }

  container.innerHTML = editions
    .map((edition) => {
      const categoriesHtml = (edition.categories || [])
        .map((cat) => {
          const w = cat.winner;
          const winnerHtml = w
            ? `
              <div class="winner-card">
                ${w.image_url ? `<img src="${w.image_url}" alt="${escapeHtml(w.car_name)}" class="winner-photo">` : ''}
                <div class="winner-info">
                  <p class="winner-person">${escapeHtml(w.person_name)}</p>
                  <p class="winner-car">${escapeHtml(w.car_name)}</p>
                  ${w.car_info ? `<p class="winner-car-info">${escapeHtml(w.car_info)}</p>` : ''}
                </div>
              </div>
            `
            : '<p class="ganadores-empty-category">Sin ganador todavía</p>';

          return `
            <div class="category-block">
              <h4 class="category-name">${escapeHtml(cat.name)}</h4>
              ${winnerHtml}
            </div>
          `;
        })
        .join('');

      return `
        <div class="edition-block">
          <h3 class="edition-name">${escapeHtml(edition.name)}</h3>
          <div class="category-grid">${categoriesHtml}</div>
        </div>
      `;
    })
    .join('');
})();
