import { $, esc, formatDuration, formatNumber } from '../dom.js';
import { renderRaceChart } from '../charts.js';
import { raceSeries } from '../../core/stats.js';

let lastStats = null;

export function initStatsView() {
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (lastStats && !$('#stats-view').hidden) drawChart(lastStats);
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
    const tiles = [
        ['🍺', t.beers, 'Bier gesamt'],
        ['🫗', `${formatNumber(t.liters, 1)} l`, 'Liter'],
        ['📦', t.crates, t.crates === 1 ? 'Kasten' : 'Kästen'],
        ['⏱', t.beersPerHour ? formatNumber(t.beersPerHour, 1) : '–', 'Bier pro Stunde'],
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

    $('#stats-table tbody').innerHTML = stats.ranking.map(p => `
      <tr>
        <th scope="row"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</th>
        <td>${p.beers}</td>
        <td>${p.avgIntervalMin ? `${Math.round(p.avgIntervalMin)} min` : '–'}</td>
        <td>${p.cigs}</td>
        <td>${p.toilet.visits}</td>
        <td>${p.toilet.totalMs ? formatDuration(p.toilet.totalMs) : '–'}</td>
        <td>${p.smoke.visits}</td>
        <td class="badges-cell">${p.badges.map(b => `<span title="${esc(b.title)}: ${esc(b.desc)}">${b.icon}</span>`).join('')}</td>
      </tr>`).join('');

    drawChart(stats);
}

function drawChart(stats) {
    renderRaceChart($('#race-chart'), raceSeries(stats), { start: stats.start, end: stats.end });
}
