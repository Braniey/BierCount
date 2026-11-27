import { $, esc, formatAgo, formatClock, formatTimer, formatDuration, formatNumber } from '../dom.js';
import { createGlass } from '../glass.js';
import { toggleBeamer } from '../beamer.js';
import { EVENT, PAUSE, DRINKS, BEERS_PER_CRATE, CRATE_NAME } from '../../core/constants.js';

const cards = new Map(); // name -> { el, glass }

export function initDashboardView() {
    $('#beamer-btn').addEventListener('click', toggleBeamer);
}

export function renderDashboardView(state, stats) {
    const hasSession = !!state.session;
    $('#dash-empty').hidden = hasSession && stats.players.length > 0;
    $('#dash-main').hidden = !hasSession || !stats.players.length;
    if (!hasSession || !stats.players.length) return;

    const t = stats.totals;
    $('#dash-title').textContent = state.data?.name || state.session.name;
    $('#dashboard-view [data-open-legend]').hidden = !stats.main;
    $('#drink-totals').innerHTML = stats.main
        ? totalBadge(t.count, `${stats.main.name} gesamt`)
        : stats.drinks.map(d => totalBadge(`${d.icon} ${t.byDrink[d.id]}`, d.name)).join('');
    $('#total-liters').textContent = `${formatNumber(t.liters, 1)} l`;
    $('#total-cigs').textContent = t.cigs;

    $('#crate-badge').hidden = t.crates === null;
    if (t.crates !== null) {
        $('#crate-label').textContent = t.crates
            ? `${t.crates} ${CRATE_NAME} + ${t.count % BEERS_PER_CRATE}/${BEERS_PER_CRATE}`
            : `${t.count}/${BEERS_PER_CRATE} bis zum ${CRATE_NAME}`;
        $('#crate-bar').style.setProperty('--pct', t.crateProgress);
    }

    renderAway(stats);
    renderCards(stats, state.player);
    renderTicker(stats);
}

function totalBadge(value, label) {
    return `
      <div class="total-badge">
        <div class="total-num">${esc(value)}</div>
        <div class="total-lbl">${esc(label)}</div>
      </div>`;
}

function renderAway(stats) {
    const away = stats.players.filter(p => p.status && PAUSE[p.status.type]);
    const el = $('#away-strip');
    el.hidden = !away.length;
    el.innerHTML = away.map(p => `
      <span class="away-chip" data-type="${p.status.type}">
        ${PAUSE[p.status.type].icon} <b>${esc(p.name)}</b> ${PAUSE[p.status.type].active}
        <span class="mono" data-since="${p.status.since}">${formatTimer(Date.now() - p.status.since)}</span>
      </span>`).join('');
}

function renderCards(stats, myName) {
    const grid = $('#players-grid');

    // FLIP: alte Positionen merken, damit Rangwechsel animiert werden
    const before = new Map([...cards].map(([name, c]) => [name, c.el.getBoundingClientRect()]));

    const { main } = stats;
    const leader = main && stats.ranking[0]?.count > 0 ? stats.ranking[0].count : null;
    const maxCount = Math.max(10, leader || 0);
    const present = new Set();
    grid.classList.toggle('mixed', !main);

    stats.ranking.forEach((p, i) => {
        present.add(p.name);
        let card = cards.get(p.name);
        if (!card) {
            const el = document.createElement('article');
            el.className = 'player-card';
            el.innerHTML = `
              <div class="leader-badge">👑</div>
              <div class="p-rank"></div>
              <div class="p-name"></div>
              <div class="mini-glass"></div>
              <div class="p-count"></div>
              <div class="p-count-lbl"></div>
              <div class="p-drinks"></div>
              <div class="p-meta"></div>
              <div class="p-status"></div>
              <div class="p-badges"></div>`;
            card = { el, glass: createGlass(el.querySelector('.mini-glass'), { bubbles: false }) };
            cards.set(p.name, card);
        }
        const { el, glass } = card;
        el.classList.toggle('is-leader', !!main && i === 0 && p.count > 0);
        el.classList.toggle('is-me', p.name === myName);
        el.classList.toggle('is-away', !!p.status);
        el.style.setProperty('--player-color', p.color);
        el.querySelector('.p-rank').textContent = `#${i + 1}`;
        el.querySelector('.p-name').textContent = p.name;

        if (main) {
            const countEl = el.querySelector('.p-count');
            if (countEl.textContent !== String(p.count)) {
                if (countEl.textContent) {
                    countEl.classList.remove('bump');
                    void countEl.offsetWidth;
                    countEl.classList.add('bump');
                }
                countEl.textContent = p.count;
            }
            el.querySelector('.p-count-lbl').textContent = main.name;
            glass.set(p.count, maxCount, main);
        } else {
            const parts = stats.drinks.filter(d => p.drinks[d.id]).map(d => `<span>${d.icon}${p.drinks[d.id]}</span>`);
            el.querySelector('.p-drinks').innerHTML = parts.join('') || '<span class="muted">noch nichts</span>';
        }

        const last = p.lastDrink;
        const lastIcon = !main && last ? `${DRINKS[last.drink]?.icon || ''} ` : '';
        el.querySelector('.p-meta').innerHTML = `
          <span title="Zigaretten">🚬 ${p.cigs}</span>
          <span title="Klogänge">🚽 ${p.toilet.visits}</span>
          ${last ? `<span class="muted">${lastIcon}<span data-ago="${last.ts}">${formatAgo(last.ts)}</span></span>` : ''}`;

        const status = p.status && PAUSE[p.status.type];
        el.querySelector('.p-status').innerHTML = status
            ? `${status.icon} ${status.active} <span class="mono" data-since="${p.status.since}">${formatTimer(Date.now() - p.status.since)}</span>`
            : '';
        el.querySelector('.p-badges').innerHTML = p.badges.map(b =>
            `<span title="${esc(b.title)}: ${esc(b.desc)}">${b.icon}</span>`).join('');

        grid.appendChild(el); // sortiert einhängen
    });

    for (const [name, card] of cards) {
        if (!present.has(name)) { card.el.remove(); cards.delete(name); }
    }

    // FLIP: von der alten Position zur neuen gleiten
    for (const [name, rect] of before) {
        const card = cards.get(name);
        if (!card) continue;
        const now = card.el.getBoundingClientRect();
        const dx = rect.left - now.left, dy = rect.top - now.top;
        if (!dx && !dy) continue;
        card.el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
            { duration: 500, easing: 'cubic-bezier(.2,.8,.2,1)' },
        );
    }
}

const TICKER_TEXT = {
    [EVENT.DRINK]:  e => {
        const d = DRINKS[e.drink] || DRINKS.beer;
        return `${d.icon} <b>${esc(e.player)}</b> hat ${d.acc} aufgemacht`;
    },
    [EVENT.CIG]:    e => `🚬 <b>${esc(e.player)}</b> raucht eine`,
    [EVENT.TOILET]: e => `🚽 <b>${esc(e.player)}</b> war ${formatDuration(e.end - e.ts)} auf Klo`,
    [EVENT.SMOKE]:  e => `💨 <b>${esc(e.player)}</b> war ${formatDuration(e.end - e.ts)} rauchen`,
};

function renderTicker(stats) {
    const items = stats.events
        .filter(e => TICKER_TEXT[e.type])
        .map(e => ({ ...e, at: e.end || e.ts }))
        .sort((a, b) => b.at - a.at)
        .slice(0, 8);

    $('#ticker').innerHTML = items.length
        ? items.map(e => `
            <li><span class="ticker-time">${formatClock(e.at)}</span><span>${TICKER_TEXT[e.type](e)}</span></li>`).join('')
        : '<li class="muted">Noch nichts passiert …</li>';
}
