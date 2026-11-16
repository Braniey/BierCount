import { $, esc, formatDuration, formatNumber } from '../dom.js';
import { renderRaceChart } from '../charts.js';
import { raceSeries } from '../../core/stats.js';
import { CRATE_NAME } from '../../core/constants.js';

let lastStats = null;

export function initStatsView() {
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (lastStats?.main && !$('#stats-view').hidden) drawChart(lastStats);
        }, 150);
    });
}

export function renderStatsView(state, stats) {
    lastStats = stats;
    const has = !!state.session && stats.players.length > 0;
    $('#stats-empty').hidden = has;
    $('#stats-main').hidden = !has;
    if (!has) return;

    const t = stats.totals;
    const { main } = stats;
    const drinkTiles = main
        ? [
            [main.icon, t.count, `${main.name} gesamt`],
            ['⏱', t.perHour ? formatNumber(t.perHour, 1) : '–', `${main.name} pro Stunde`],
        ]
        : stats.drinks.map(d => [d.icon, t.byDrink[d.id], d.name]);
    const tiles = [
        ...drinkTiles,
        ['🫗', `${formatNumber(t.liters, 1)} l`, 'Liter'],
        ...(t.crates !== null ? [['📦', t.crates, CRATE_NAME]] : []),
        ['🚬', t.cigs, 'Zigaretten'],
        ['🚽', t.toiletVisits, 'Klogänge'],
        ['🧻', formatDuration(t.toiletMs), 'auf Klo verbracht'],
        ['🕰', formatDuration(t.durationMs), t.isLive ? 'läuft seit' : 'Dauer'],
    ];
    $('#stat-tiles').innerHTML = tiles.map(([icon, value, label]) => `
      <div class="stat-tile">
        <div class="stat-icon">${icon}</div>
        <div class="stat-value">${esc(value)}</div>
        <div class="stat-label">${esc(label)}</div>
      </div>`).join('');

    // Gemischter Abend: keine Wertung, kein Rennen
    $('#race-card').hidden = !main;
    $('#awards-card').hidden = !main;
    if (main) $('#race-title').textContent = `Das ${main.name}-Rennen`;

    $('#awards').innerHTML = stats.awards.length
        ? stats.awards.map(a => `
            <div class="award">
              <div class="award-icon">${a.icon}</div>
              <div>
                <div class="award-title">${esc(a.title)}</div>
                <div class="award-winner">${a.winners.map(esc).join(' & ')}</div>
                <div class="award-detail">${esc(a.detail)}</div>
              </div>
            </div>`).join('')
        : '<div class="muted">Titel werden vergeben, sobald etwas passiert ist.</div>';

    renderTable(stats);
    if (main) drawChart(stats);
}

// Spalten: single = Getränk, Ø, Pausen, Abzeichen; mixed = je Getränk eine Spalte
function renderTable({ main, drinks, ranking }) {
    const columns = [
        ...(main
            ? [
                [main.icon, p => p.count],
                [`Ø/${main.name}`, p => p.avgIntervalMin ? `${Math.round(p.avgIntervalMin)} min` : '–'],
            ]
            : drinks.map(d => [d.icon, p => p.drinks[d.id]])),
        ['🚬', p => p.cigs],
        ['🚽', p => p.toilet.visits],
        ['Klo-Zeit', p => p.toilet.totalMs ? formatDuration(p.toilet.totalMs) : '–'],
        ['💨', p => p.smoke.visits],
    ];

    $('#stats-head').innerHTML = `<tr><th scope="col">Name</th>${columns.map(([h]) => `<th scope="col">${esc(h)}</th>`).join('')}${main ? '<th scope="col">Abzeichen</th>' : ''}</tr>`;
    $('#stats-table tbody').innerHTML = ranking.map(p => `
      <tr>
        <th scope="row"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</th>
        ${columns.map(([, value]) => `<td>${esc(value(p))}</td>`).join('')}
        ${main ? `<td class="badges-cell">${p.badges.map(b => `<span title="${esc(b.title)}: ${esc(b.desc)}">${b.icon}</span>`).join('')}</td>` : ''}
      </tr>`).join('');
}

function drawChart(stats) {
    renderRaceChart($('#race-chart'), raceSeries(stats), { start: stats.start, end: stats.end });
}
