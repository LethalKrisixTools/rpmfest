// ============================================
// RPM FEST — Admin Panel
// ============================================

const PANEL_PASSWORD = 'admin2026';

const $ = id => document.getElementById(id);
const $$ = (sel, ctx) => (ctx || document).querySelectorAll(sel);

let state = {
  config: {},
  activities: [],
  schedule: [],
  stats: [],
  sponsors: []
};

let currentTab = 'evento';

// ========== LOGIN ==========

$('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const pass = $('login-pass').value;
  if (pass === PANEL_PASSWORD) {
    $('login-screen').classList.add('hidden');
    $('dashboard-screen').classList.remove('hidden');
    $('login-error').textContent = '';
    $('login-pass').value = '';
    init();
  } else {
    $('login-error').textContent = 'Contraseña incorrecta';
  }
});

$('btn-logout').addEventListener('click', () => {
  $('dashboard-screen').classList.add('hidden');
  $('login-screen').classList.remove('hidden');
  $('login-pass').value = '';
  $('login-pass').focus();
});

// ========== LOAD DATA ==========

async function loadData() {
  setStatus('Cargando...', '');
  const hook = localStorage.getItem('rpmfest_deploy_hook') || '';
  if (hook) $('deploy-hook-input').value = hook;

  try {
    const res = await fetch('/data/data.json?_=' + Date.now());
    if (!res.ok) throw new Error('Error al cargar datos');

    const json = await res.json();

    state.config = json.config || {};
    state.activities = json.activities || [];
    state.schedule = json.schedule || [];
    state.stats = json.stats || [];
    state.sponsors = json.sponsors || [];

    setStatus('Conectado', 'online');
  } catch {
    setStatus('Sin conexión (usa datos locales)', 'offline');
    loadDefaults();
  }

  renderTab(currentTab);
}

$('btn-save-hook').addEventListener('click', () => {
  const hook = $('deploy-hook-input').value.trim();
  localStorage.setItem('rpmfest_deploy_hook', hook);
  notify(hook ? 'Deploy hook guardado ✅' : 'Deploy hook eliminado');
});

function loadStoredValues() {
  const hook = localStorage.getItem('rpmfest_deploy_hook') || '';
  if (hook) $('deploy-hook-input').value = hook;
}

function loadDefaults() {
  state.config = {
    name: 'RPM FEST',
    organizer: 'Diamond Squad Events',
    date: 'Sábado 16 de Mayo · 10:00',
    location: 'Circuito Internacional FK1',
    address: 'Ctra. Comarcal, 602, 47465\nVillaverde de Medina, Valladolid',
    status: 'finalizado',
    dressCode: 'Casual',
    badge: 'DIAMOND SQUAD EVENTS',
    title: 'RPM FEST',
    subtitle: 'Sábado 16 de Mayo · 10:00 · Circuito FK1',
    ctaText: 'EXPLORAR EVENTO',
    ctaLink: '#experiencias',
    ctaStatus: 'FINALIZADO',
    descShort: 'RPM Fest no es solo una concentración de coches. Es un festival donde el rugido de los motores, la música en directo y el ambiente brutal se fusionan en un día inolvidable en el Circuito FK1.',
    quote: 'RPM Fest no es solo una concentración… es un festival del motor.'
  };
  state.activities = [
    { icon: '🎤', title: 'Escenario en Directo', description: 'Artistas en vivo durante toda la jornada. Música y actuaciones para que el festival no pare ni un momento.', tag: 'MÚSICA' },
    { icon: '🚗', title: 'Zona Expo', description: 'Coches preparados, deportivos, clásicos y proyectos exclusivos. Ideal para inspirarte, hacer fotos y conocer a otros apasionados.', tag: 'EXPOSICIÓN' },
    { icon: '🏆', title: 'Batalla de Clubs', description: 'Los clubs compiten por demostrar quién tiene el mejor proyecto, más estilo y presencia. Pasión por el motor en estado puro.', tag: 'COMPETICIÓN' },
    { icon: '🚀', title: 'Lanzadas', description: 'Potencia pura en acción. Aceleraciones que ponen los pelos de punta y máquinas sacando todo su potencial en pista.', tag: 'VELOCIDAD' },
    { icon: '🔥', title: 'Grip & Drift', description: 'Tandas de agarre y derrapes espectaculares. Humo, ruido, técnica y espectáculo asegurado para los fans del drifting.', tag: 'DRIFT' },
    { icon: '🎁', title: 'Shows & Sorpresas', description: 'Animación constante, exhibiciones y regalos para el público. Aquí siempre están pasando cosas.', tag: 'SHOW' }
  ];
  state.schedule = [
    { time: '10:00', title: 'Apertura de Puertas', description: 'Comienza la fiesta. Acceso al recinto, acreditaciones y primer contacto con la zona expo.' },
    { time: '11:00', title: 'Inicio Zona Expo', description: 'Apertura oficial de la exposición de coches. Primeros pases por la pista.' },
    { time: '12:00', title: 'Lanzadas — Sesión 1', description: 'Primeras aceleraciones en pista. Potencia pura en acción.' },
    { time: '14:00', title: 'Música en Directo', description: 'Actuaciones musicales. El escenario principal cobra vida.' },
    { time: '16:00', title: 'Batalla de Clubs', description: 'Los clubs compiten por el mejor proyecto y estilo. Ambiente competitivo.' },
    { time: '18:00', title: 'Grip & Drift', description: 'Tandas de derrapes espectaculares. Humo, ruido y espectáculo asegurado.' },
    { time: '20:00', title: 'Show de Clausura', description: 'Gran final con exhibiciones, sorpresas y el cierre por todo lo alto.' }
  ];
  state.stats = [
    { number: '6+', label: 'Actividades' },
    { number: '10h', label: 'Duración' },
    { number: '1', label: 'Circuito' },
    { number: '∞', label: 'Adrenalina' }
  ];
  state.sponsors = [
    { name: 'DIAMOND SQUAD', subtitle: 'ORGANIZA' },
    { name: 'FK1 CIRCUIT', subtitle: 'SEDE' },
    { name: 'RPM FEST', subtitle: 'EVENTO' }
  ];
}

// ========== STATUS ==========

function setStatus(text, cls) {
  const el = $('conn-status');
  el.textContent = text;
  el.className = 'admin-nav-status' + (cls ? ' ' + cls : '');
}

// ========== NOTIFY ==========

function notify(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ========== COLLECT DATA FROM FORM ==========

function collectData() {
  const tab = currentTab;
  if (tab === 'evento') collectEvento();
  else if (tab === 'hero') collectHero();
  else if (tab === 'actividades') collectActividades();
  else if (tab === 'horarios') collectHorarios();
  else if (tab === 'stats') collectStats();
  else if (tab === 'sponsors') collectSponsors();
}

// ========== SAVE TO GITHUB ==========

$('btn-save').addEventListener('click', async () => {
  $('btn-save').textContent = 'Publicando...';
  $('btn-save').disabled = true;

  try {
    collectData();
    await saveToVercel();
    notify('Cambios publicados en GitHub ✅');

    // Trigger Vercel deploy hook if configured
    const hook = getDeployHook();
    if (hook) {
      notify('Redeploying Vercel...');
      try {
        await fetch(hook, { method: 'POST' });
      } catch {
        // ignore
      }
    }
  } catch (err) {
    notify('Error: ' + err.message, 'error');
  }

  $('btn-save').textContent = 'Guardar Cambios';
  $('btn-save').disabled = false;
});

async function saveToVercel() {
  const payload = {
    config: state.config,
    activities: state.activities,
    schedule: state.schedule,
    stats: state.stats,
    sponsors: state.sponsors
  };

  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error del servidor: ${res.status}`);
  }

  return res.json();
}

// ========== PREVIEW ==========

$('btn-preview').addEventListener('click', () => {
  const overlay = $('preview-overlay');
  overlay.classList.remove('hidden');
    $('preview-iframe').src = 'index.html';
});

$('btn-close-preview').addEventListener('click', () => {
  $('preview-overlay').classList.add('hidden');
  $('preview-iframe').src = '';
});

// ========== TABS ==========

document.querySelectorAll('.sidebar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
    renderTab(currentTab);
  });
});

function renderTab(tab) {
  const titles = {
    evento: 'Evento',
    hero: 'Hero',
    actividades: 'Actividades',
    horarios: 'Horarios',
    stats: 'Estadísticas',
    sponsors: 'Sponsors'
  };
  $('tab-title').textContent = titles[tab] || tab;

  const renderers = {
    evento: renderEvento,
    hero: renderHero,
    actividades: renderActividades,
    horarios: renderHorarios,
    stats: renderStats,
    sponsors: renderSponsors
  };

  $('tab-content').innerHTML = '';
  if (renderers[tab]) renderers[tab]();
}

// ========== RENDER: EVENTO ==========

function renderEvento() {
  const c = state.config;
  $('tab-content').innerHTML = `
    <div class="form-section">
      <div class="form-section-title">Información General</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Nombre del evento</label>
          <input id="f-name" value="${esc(c.name)}">
        </div>
        <div class="form-group">
          <label>Organizador</label>
          <input id="f-organizer" value="${esc(c.organizer)}">
        </div>
        <div class="form-group">
          <label>Fecha</label>
          <input id="f-date" value="${esc(c.date)}">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <input id="f-status" value="${esc(c.status)}">
        </div>
        <div class="form-group">
          <label>Localización</label>
          <input id="f-location" value="${esc(c.location)}">
        </div>
        <div class="form-group">
          <label>Código vestimenta</label>
          <input id="f-dresscode" value="${esc(c.dressCode)}">
        </div>
        <div class="form-group full">
          <label>Dirección</label>
          <textarea id="f-address">${esc(c.address)}</textarea>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">Descripción</div>
      <div class="form-group full">
        <label>Descripción corta</label>
        <textarea id="f-desc">${esc(c.descShort)}</textarea>
      </div>
      <div class="form-group full" style="margin-top:12px">
        <label>Frase destacada (quote)</label>
        <input id="f-quote" value="${esc(c.quote)}">
      </div>
    </div>
  `;
}

function collectEvento() {
  state.config.name = $('f-name').value;
  state.config.organizer = $('f-organizer').value;
  state.config.date = $('f-date').value;
  state.config.status = $('f-status').value;
  state.config.location = $('f-location').value;
  state.config.dressCode = $('f-dresscode').value;
  state.config.address = $('f-address').value;
  state.config.descShort = $('f-desc').value;
  state.config.quote = $('f-quote').value;
}

// ========== RENDER: HERO ==========

function renderHero() {
  const c = state.config;
  $('tab-content').innerHTML = `
    <div class="form-section">
      <div class="form-section-title">Hero Banner</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Badge (arriba del título)</label>
          <input id="f-badge" value="${esc(c.badge)}">
        </div>
        <div class="form-group">
          <label>Título principal</label>
          <input id="f-title" value="${esc(c.title)}">
        </div>
        <div class="form-group">
          <label>Subtítulo</label>
          <input id="f-subtitle" value="${esc(c.subtitle)}">
        </div>
        <div class="form-group">
          <label>Texto CTA</label>
          <input id="f-cta" value="${esc(c.ctaText)}">
        </div>
        <div class="form-group">
          <label>Link CTA</label>
          <input id="f-ctalink" value="${esc(c.ctaLink)}">
        </div>
        <div class="form-group">
          <label>Texto estado (botón derecho)</label>
          <input id="f-ctastatus" value="${esc(c.ctaStatus)}">
        </div>
      </div>
    </div>
  `;
}

function collectHero() {
  state.config.badge = $('f-badge').value;
  state.config.title = $('f-title').value;
  state.config.subtitle = $('f-subtitle').value;
  state.config.ctaText = $('f-cta').value;
  state.config.ctaLink = $('f-ctalink').value;
  state.config.ctaStatus = $('f-ctastatus').value;
}

// ========== RENDER: ACTIVIDADES ==========

function renderActividades() {
  let html = `
    <div class="form-section">
      <div class="form-section-title">Actividades / Experiencias</div>
      <div class="card-list" id="activities-list">
  `;

  state.activities.forEach((a, i) => {
    html += `
      <div class="card-editor" data-index="${i}">
        <input class="a-icon" value="${esc(a.icon)}" placeholder="Icono">
        <input class="a-title" value="${esc(a.title)}" placeholder="Título">
        <textarea class="a-desc" placeholder="Descripción">${esc(a.description)}</textarea>
        <input class="a-tag" value="${esc(a.tag)}" placeholder="Tag">
        <button class="btn-icon" onclick="removeActivity(${i})">✕</button>
      </div>
    `;
  });

  html += `
      </div>
      <button class="btn btn-small" style="margin-top:12px" onclick="addActivity()">+ Añadir actividad</button>
    </div>
  `;

  $('tab-content').innerHTML = html;
}

function addActivity() {
  state.activities.push({ icon: '🏁', title: 'Nueva actividad', description: 'Descripción', tag: 'NUEVO' });
  renderActividades();
}

function removeActivity(i) {
  state.activities.splice(i, 1);
  renderActividades();
}

function collectActividades() {
  const items = $$('.card-editor');
  state.activities = Array.from(items).map(el => ({
    icon: el.querySelector('.a-icon').value,
    title: el.querySelector('.a-title').value,
    description: el.querySelector('.a-desc').value,
    tag: el.querySelector('.a-tag').value
  }));
}

// ========== RENDER: HORARIOS ==========

function renderHorarios() {
  let html = `
    <div class="form-section">
      <div class="form-section-title">Cronograma / Horarios</div>
      <div class="card-list" id="schedule-list">
  `;

  state.schedule.forEach((s, i) => {
    html += `
      <div class="card-editor" data-index="${i}">
        <input class="s-time" value="${esc(s.time)}" placeholder="Hora" style="width:80px">
        <input class="s-title" value="${esc(s.title)}" placeholder="Título">
        <textarea class="s-desc" placeholder="Descripción">${esc(s.description)}</textarea>
        <span></span>
        <button class="btn-icon" onclick="removeSchedule(${i})">✕</button>
      </div>
    `;
  });

  html += `
      </div>
      <button class="btn btn-small" style="margin-top:12px" onclick="addSchedule()">+ Añadir horario</button>
    </div>
  `;

  $('tab-content').innerHTML = html;
}

function addSchedule() {
  state.schedule.push({ time: '00:00', title: 'Nuevo horario', description: 'Descripción' });
  renderHorarios();
}

function removeSchedule(i) {
  state.schedule.splice(i, 1);
  renderHorarios();
}

function collectHorarios() {
  const items = $$('.card-editor');
  state.schedule = Array.from(items).map(el => ({
    time: el.querySelector('.s-time').value,
    title: el.querySelector('.s-title').value,
    description: el.querySelector('.s-desc').value
  }));
}

// ========== RENDER: STATS ==========

function renderStats() {
  let html = `
    <div class="form-section">
      <div class="form-section-title">Estadísticas</div>
      <div class="card-list" id="stats-list">
  `;

  state.stats.forEach((s, i) => {
    html += `
      <div class="card-editor" data-index="${i}" style="grid-template-columns: 100px 1fr auto">
        <input class="st-num" value="${esc(s.number)}" placeholder="Número">
        <input class="st-label" value="${esc(s.label)}" placeholder="Etiqueta">
        <button class="btn-icon" onclick="removeStat(${i})">✕</button>
      </div>
    `;
  });

  html += `
      </div>
      <button class="btn btn-small" style="margin-top:12px" onclick="addStat()">+ Añadir estadística</button>
    </div>
  `;

  $('tab-content').innerHTML = html;
}

function addStat() {
  state.stats.push({ number: '0', label: 'Nueva' });
  renderStats();
}

function removeStat(i) {
  state.stats.splice(i, 1);
  renderStats();
}

function collectStats() {
  const items = $$('.card-editor');
  state.stats = Array.from(items).map(el => ({
    number: el.querySelector('.st-num').value,
    label: el.querySelector('.st-label').value
  }));
}

// ========== RENDER: SPONSORS ==========

function renderSponsors() {
  let html = `
    <div class="form-section">
      <div class="form-section-title">Sponsors / Organizadores</div>
      <div class="sponsor-list" id="sponsors-list">
  `;

  state.sponsors.forEach((s, i) => {
    html += `
      <div class="sponsor-editor" data-index="${i}">
        <input class="sp-name" value="${esc(s.name)}" placeholder="Nombre">
        <input class="sp-sub" value="${esc(s.subtitle)}" placeholder="Rol">
        <button class="btn-icon" onclick="removeSponsor(${i})">✕</button>
      </div>
    `;
  });

  html += `
      </div>
      <button class="btn btn-small" style="margin-top:12px" onclick="addSponsor()">+ Añadir sponsor</button>
    </div>
  `;

  $('tab-content').innerHTML = html;
}

function addSponsor() {
  state.sponsors.push({ name: 'NUEVO', subtitle: 'SPONSOR' });
  renderSponsors();
}

function removeSponsor(i) {
  state.sponsors.splice(i, 1);
  renderSponsors();
}

function collectSponsors() {
  const items = $$('.sponsor-editor');
  state.sponsors = Array.from(items).map(el => ({
    name: el.querySelector('.sp-name').value,
    subtitle: el.querySelector('.sp-sub').value
  }));
}

// ========== UTILS ==========

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ========== INIT ==========

function init() {
  loadStoredValues();
  loadData();
}
