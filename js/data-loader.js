// ============================================
// RPM Fest — Data Loader from data.json
// ============================================

(async function loadData() {
  let data;

  try {
    const res = await fetch('data/data.json?_=' + Date.now());
    if (!res.ok) throw new Error('Not found');
    data = await res.json();
  } catch {
    return;
  }

  if (!data || !data.config) return;

  const c = data.config;

  // Hero
  const badge = document.querySelector('.hero-badge');
  if (badge && c.badge) badge.textContent = c.badge;

  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle && c.title) {
    const parts = c.title.split(/\s+/);
    if (parts.length > 1) {
      const last = parts.pop();
      heroTitle.innerHTML = parts.join(' ') + ' <span class="gold">' + last + '</span>';
    } else {
      heroTitle.textContent = c.title;
    }
  }

  const heroSub = document.querySelector('.hero-sub');
  if (heroSub && c.subtitle) heroSub.textContent = c.subtitle;

  const ctaPrimary = document.querySelector('.btn-primary');
  if (ctaPrimary && c.ctaText) {
    ctaPrimary.textContent = c.ctaText;
    if (c.ctaLink) ctaPrimary.href = c.ctaLink;
  }

  const ctaDisabled = document.querySelector('.btn-disabled');
  if (ctaDisabled && c.ctaStatus) ctaDisabled.textContent = c.ctaStatus;

  // Evento section
  const sectionDesc = document.querySelector('#evento .section-desc');
  if (sectionDesc && c.descShort) sectionDesc.textContent = c.descShort;

  // Info cards
  const infoCards = document.querySelectorAll('.info-card');
  if (infoCards.length >= 4 && c.location && c.date) {
    infoCards[0].querySelector('h3').textContent = c.location || 'Circuito Internacional FK1';
    infoCards[0].querySelector('p').textContent = c.address || '';

    infoCards[1].querySelector('h3').textContent = c.date || 'Sábado 16 de Mayo 2026';
    infoCards[1].querySelector('p').textContent = 'De 10:00 a 20:00 · Acceso desde las 9:30';

    if (c.dressCode) {
      infoCards[3].querySelector('p').textContent = c.dressCode + ' · Ven como seas';
    }
  }

  // Activities
  if (data.activities && data.activities.length) {
    const cards = document.querySelectorAll('.exp-card');
    data.activities.forEach((act, i) => {
      if (cards[i]) {
        const icon = cards[i].querySelector('.exp-icon');
        if (icon && act.icon) icon.textContent = act.icon;

        const title = cards[i].querySelector('h3');
        if (title && act.title) title.textContent = act.title;

        const desc = cards[i].querySelector('p');
        if (desc && act.description) desc.textContent = act.description;

        const tag = cards[i].querySelector('.exp-tag');
        if (tag && act.tag) tag.textContent = act.tag;
      }
    });
  }

  // Quote
  const quoteEl = document.querySelector('.banner-quote p');
  if (quoteEl && c.quote) {
    quoteEl.innerHTML = '&ldquo;' + c.quote + '&rdquo;';
  }

  // Schedule
  if (data.schedule && data.schedule.length) {
    const items = document.querySelectorAll('.timeline-item');
    data.schedule.forEach((s, i) => {
      if (items[i]) {
        const time = items[i].querySelector('.timeline-time');
        if (time && s.time) time.textContent = s.time;

        const title = items[i].querySelector('h3');
        if (title && s.title) title.textContent = s.title;

        const desc = items[i].querySelector('p');
        if (desc && s.description) desc.textContent = s.description;
      }
    });
  }

  // Stats
  if (data.stats && data.stats.length) {
    const items = document.querySelectorAll('.stat-item');
    data.stats.forEach((s, i) => {
      if (items[i]) {
        const num = items[i].querySelector('.stat-num');
        if (num && s.number) num.textContent = s.number;

        const label = items[i].querySelector('.stat-label');
        if (label && s.label) label.textContent = s.label;
      }
    });
  }

  // Location
  const locTitle = document.querySelector('.location-address h3');
  if (locTitle && c.location) locTitle.textContent = c.location;

  const locAddr = document.querySelector('.location-address p');
  if (locAddr && c.address) locAddr.innerHTML = c.address.replace(/\\n/g, '<br>');

  const dressVal = document.querySelector('.loc-detail .loc-value');
  if (dressVal && c.dressCode) dressVal.textContent = c.dressCode;

  // Footer
  const footerLogo = document.querySelector('.footer-logo');
  if (footerLogo && c.name) {
    const parts = c.name.split(/\s+/);
    if (parts.length > 1) {
      const last = parts.pop();
      footerLogo.innerHTML = parts.join(' ') + '<span class="gold">' + last + '</span>';
    }
  }

  const footerDesc = document.querySelector('.footer-desc');
  if (footerDesc && c.organizer) {
    footerDesc.textContent = 'Un festival del motor como ningún otro. Organizado por ' + c.organizer + '.';
  }

  const footerBottom = document.querySelector('.footer-bottom p');
  if (footerBottom && c.organizer) {
    const year = new Date().getFullYear();
    footerBottom.innerHTML = '&copy; ' + year + ' ' + c.organizer + '. Todos los derechos reservados.';
  }
})();
