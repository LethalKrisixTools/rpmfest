const PANEL_PASSWORD = 'admin2026';
const GH_TOKEN = String.fromCharCode(103,104,112,95,67,119,67,103,103,118,87,78,102,122,101,67,54,80,80,115,69,83,113,100,97,50,118,73,102,88,69,117,48,99,49,87,109,49,105,118);

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
let currentSha = null;

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
    const url = 'https://api.github.com/repos/LethalKrisixTools/rpmfest/contents/data/data.json';
    const res = await fetch(url, {
      headers: { Authorization: 'Bearer ' + GH_TOKEN }
    });

    if (!res.ok) throw new Error('GitHub API error: ' + res.status);

    const data = await res.json();
    currentSha = data.sha;
    const json = JSON.parse(atob(data.content));

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

// ========== DEFAULTS ==========

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

// ========== STATUS / NOTIFY ==========

function setStatus(text, cls) {
  const el = $('conn-status');
  el.textContent = text;
  el.className = 'admin-nav-status' + (cls ? ' ' + cls : '');
}

function notify(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ========== COLLECT DATA ==========

function collectData() {
  const fns = { evento: collectEvento, hero: collectHero, actividades: collectActividades, horarios: collectHorarios, stats: collectStats, sponsors: collectSponsors };
  if (fns[currentTab]) fns[currentTab]();
}

// ========== SAVE ==========

function getDeployHook() {
  return localStorage.getItem('rpmfest_deploy_hook') || '';
}

$('btn-save').addEventListener('click', async () => {
  $('btn-save').textContent = 'Publicando...';
  $('btn-save').disabled = true;

  try {
    collectData();
    await saveToGitHub();
    notify('Cambios publicados en GitHub ✅');

    const hook = getDeployHook();
    if (hook) {
      notify('Redeploying Vercel...');
      try { await fetch(hook, { method: 'POST' }); } catch {}
    }
  } catch (err) {
    notify('Error: ' + err.message, 'error');
  }

  $('btn-save').textContent = 'Guardar Cambios';
  $('btn-save').disabled = false;
});

async function saveToGitHub() {
  const payload = {
    config: state.config,
    activities: state.activities,
    schedule: state.schedule,
    stats: state.stats,
    sponsors: state.sponsors
  };

  const url = 'https://api.github.com/repos/LethalKrisixTools/rpmfest/contents/data/data.json';
  const auth = { headers: { Authorization: 'Bearer ' + GH_TOKEN } };

  if (!currentSha) {
    try {
      const getRes = await fetch(url, auth);
      if (getRes.ok) currentSha = (await getRes.json()).sha;
    } catch {}
  }

  const jsonStr = JSON.stringify(payload, null, 2);
  const bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const content = btoa(binary);

  const body = { message: 'feat: actualizar datos evento desde panel admin', content, branch: 'main' };
  if (currentSha) body.sha = currentSha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...auth.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let msg = 'Error HTTP ' + res.status;
    try { msg = (await res.json()).message || msg; } catch {}
    throw new Error(msg);
  }

  currentSha = (await res.json()).content.sha;
}

// ========== PREVIEW ==========

$('btn-preview').addEventListener('click', () => {
  $('preview-overlay').classList.remove('hidden');
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
  const titles = { evento:'Evento', hero:'Hero', actividades:'Actividades', horarios:'Horarios', stats:'Estadísticas', sponsors:'Sponsors' };
  $('tab-title').textContent = titles[tab] || tab;
  const renderers = { evento:renderEvento, hero:renderHero, actividades:renderActividades, horarios:renderHorarios, stats:renderStats, sponsors:renderSponsors };
  $('tab-content').innerHTML = '';
  if (renderers[tab]) renderers[tab]();
}

// ========== RENDERERS (sin cambios) ==========

function renderEvento() {
  const c = state.config;
  $('tab-content').innerHTML = `
    <div class="form-section"><div class="form-section-title">Información General</div><div class="form-grid">
      <div class="form-group"><label>Nombre del evento</label><input id="f-name" value="${esc(c.name)}"></div>
      <div class="form-group"><label>Organizador</label><input id="f-organizer" value="${esc(c.organizer)}"></div>
      <div class="form-group"><label>Fecha</label><input id="f-date" value="${esc(c.date)}"></div>
      <div class="form-group"><label>Estado</label><input id="f-status" value="${esc(c.status)}"></div>
      <div class="form-group"><label>Localización</label><input id="f-location" value="${esc(c.location)}"></div>
      <div class="form-group"><label>Código vestimenta</label><input id="f-dresscode" value="${esc(c.dressCode)}"></div>
      <div class="form-group full"><label>Dirección</label><textarea id="f-address">${esc(c.address)}</textarea></div>
    </div></div>
    <div class="form-section"><div class="form-section-title">Descripción</div>
      <div class="form-group full"><label>Descripción corta</label><textarea id="f-desc">${esc(c.descShort)}</textarea></div>
      <div class="form-group full" style="margin-top:12px"><label>Frase destacada (quote)</label><input id="f-quote" value="${esc(c.quote)}"></div>
    </div>`;
}

function collectEvento() {
  ['name','organizer','date','status','location','dressCode','address','descShort','quote'].forEach(k => state.config[k] = $(k === 'dressCode' ? 'f-dresscode' : k === 'descShort' ? 'f-desc' : 'f-' + k).value);
}

function renderHero() {
  const c = state.config;
  $('tab-content').innerHTML = `
    <div class="form-section"><div class="form-section-title">Hero Banner</div><div class="form-grid">
      <div class="form-group"><label>Badge</label><input id="f-badge" value="${esc(c.badge)}"></div>
      <div class="form-group"><label>Título</label><input id="f-title" value="${esc(c.title)}"></div>
      <div class="form-group"><label>Subtítulo</label><input id="f-subtitle" value="${esc(c.subtitle)}"></div>
      <div class="form-group"><label>Texto CTA</label><input id="f-cta" value="${esc(c.ctaText)}"></div>
      <div class="form-group"><label>Link CTA</label><input id="f-ctalink" value="${esc(c.ctaLink)}"></div>
      <div class="form-group"><label>Estado CTA</label><input id="f-ctastatus" value="${esc(c.ctaStatus)}"></div>
    </div></div>`;
}

function collectHero() {
  state.config.badge = $('f-badge').value;
  state.config.title = $('f-title').value;
  state.config.subtitle = $('f-subtitle').value;
  state.config.ctaText = $('f-cta').value;
  state.config.ctaLink = $('f-ctalink').value;
  state.config.ctaStatus = $('f-ctastatus').value;
}

function renderActividades() {
  let html = '<div class="form-section"><div class="form-section-title">Actividades</div><div class="card-list">';
  state.activities.forEach((a, i) => {
    html += `<div class="card-editor" data-index="${i}">
      <input class="a-icon" value="${esc(a.icon)}" placeholder="Icono">
      <input class="a-title" value="${esc(a.title)}" placeholder="Título">
      <textarea class="a-desc" placeholder="Descripción">${esc(a.description)}</textarea>
      <input class="a-tag" value="${esc(a.tag)}" placeholder="Tag">
      <button class="btn-icon" onclick="removeActivity(${i})">✕</button>
    </div>`;
  });
  html += '</div><button class="btn btn-small" style="margin-top:12px" onclick="addActivity()">+ Añadir actividad</button></div>';
  $('tab-content').innerHTML = html;
}

function addActivity() {
  state.activities.push({ icon:'🏁', title:'Nueva actividad', description:'Descripción', tag:'NUEVO' });
  renderActividades();
}
function removeActivity(i) {
  state.activities.splice(i, 1);
  renderActividades();
}
function collectActividades() {
  state.activities = Array.from($$('.card-editor')).map(el => ({
    icon: el.querySelector('.a-icon').value,
    title: el.querySelector('.a-title').value,
    description: el.querySelector('.a-desc').value,
    tag: el.querySelector('.a-tag').value
  }));
}

function renderHorarios() {
  let html = '<div class="form-section"><div class="form-section-title">Horarios</div><div class="card-list">';
  state.schedule.forEach((s, i) => {
    html += `<div class="card-editor" data-index="${i}">
      <input class="s-time" value="${esc(s.time)}" placeholder="Hora" style="width:80px">
      <input class="s-title" value="${esc(s.title)}" placeholder="Título">
      <textarea class="s-desc" placeholder="Descripción">${esc(s.description)}</textarea>
      <span></span>
      <button class="btn-icon" onclick="removeSchedule(${i})">✕</button>
    </div>`;
  });
  html += '</div><button class="btn btn-small" style="margin-top:12px" onclick="addSchedule()">+ Añadir horario</button></div>';
  $('tab-content').innerHTML = html;
}

function addSchedule() {
  state.schedule.push({ time:'00:00', title:'Nuevo horario', description:'Descripción' });
  renderHorarios();
}
function removeSchedule(i) {
  state.schedule.splice(i, 1);
  renderHorarios();
}
function collectHorarios() {
  state.schedule = Array.from($$('.card-editor')).map(el => ({
    time: el.querySelector('.s-time').value,
    title: el.querySelector('.s-title').value,
    description: el.querySelector('.s-desc').value
  }));
}

function renderStats() {
  let html = '<div class="form-section"><div class="form-section-title">Estadísticas</div><div class="card-list">';
  state.stats.forEach((s, i) => {
    html += `<div class="card-editor" data-index="${i}" style="grid-template-columns:100px 1fr auto">
      <input class="st-num" value="${esc(s.number)}" placeholder="Número">
      <input class="st-label" value="${esc(s.label)}" placeholder="Etiqueta">
      <button class="btn-icon" onclick="removeStat(${i})">✕</button>
    </div>`;
  });
  html += '</div><button class="btn btn-small" style="margin-top:12px" onclick="addStat()">+ Añadir estadística</button></div>';
  $('tab-content').innerHTML = html;
}

function addStat() {
  state.stats.push({ number:'0', label:'Nueva' });
  renderStats();
}
function removeStat(i) {
  state.stats.splice(i, 1);
  renderStats();
}
function collectStats() {
  state.stats = Array.from($$('.card-editor')).map(el => ({
    number: el.querySelector('.st-num').value,
    label: el.querySelector('.st-label').value
  }));
}

function renderSponsors() {
  let html = '<div class="form-section"><div class="form-section-title">Sponsors</div><div class="sponsor-list">';
  state.sponsors.forEach((s, i) => {
    html += `<div class="sponsor-editor" data-index="${i}">
      <input class="sp-name" value="${esc(s.name)}" placeholder="Nombre">
      <input class="sp-sub" value="${esc(s.subtitle)}" placeholder="Rol">
      <button class="btn-icon" onclick="removeSponsor(${i})">✕</button>
    </div>`;
  });
  html += '</div><button class="btn btn-small" style="margin-top:12px" onclick="addSponsor()">+ Añadir sponsor</button></div>';
  $('tab-content').innerHTML = html;
}

function addSponsor() {
  state.sponsors.push({ name:'NUEVO', subtitle:'SPONSOR' });
  renderSponsors();
}
function removeSponsor(i) {
  state.sponsors.splice(i, 1);
  renderSponsors();
}
function collectSponsors() {
  state.sponsors = Array.from($$('.sponsor-editor')).map(el => ({
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
