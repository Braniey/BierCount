// "Bier-Rennen": kumulierte Biere pro Person über die Zeit (Stufenlinien),
// mit Fadenkreuz-Tooltip beim Drüberfahren.

import { esc, formatClock } from './dom.js';
import { SERIES_COLORS } from '../core/constants.js';

const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

export function renderRaceChart(container, series, { start, end }) {
    const shown = series.filter(s => SERIES_COLORS.includes(s.color));
    const hidden = series.length - shown.length;

    if (!shown.length) {
        container.innerHTML = '<div class="chart-empty">Noch keine Biere mit Zeitstempel – das Rennen startet mit dem ersten Bier.</div>';
        return;
    }

    const width  = Math.max(container.clientWidth, 280);
    const height = Math.min(320, Math.max(200, width * .5));
    const x0 = Math.min(start ?? Infinity, ...shown.map(s => s.points[0].ts));
    const x1 = Math.max(end, ...shown.map(s => s.points.at(-1).ts), x0 + 60_000);
    const yMax = Math.max(...shown.map(s => s.points.at(-1).value));
    const yTop = niceMax(yMax);

    const sx = ts => PAD.left + (ts - x0) / (x1 - x0) * (width - PAD.left - PAD.right);
    const sy = v  => height - PAD.bottom - v / yTop * (height - PAD.top - PAD.bottom);

    const yTicks = ticks(yTop);
    const xTicks = timeTicks(x0, x1, width);

    const lines = shown.map(s => {
        let d = `M${sx(x0)},${sy(0)}`;
        for (const p of s.points) d += ` H${sx(p.ts)} V${sy(p.value)}`;
        d += ` H${sx(x1)}`;
        return `<path class="race-line" d="${d}" stroke="${s.color}"/>`;
    }).join('');

    const endDots = shown.map(s =>
        `<circle class="race-dot" cx="${sx(x1)}" cy="${sy(s.points.at(-1).value)}" r="4" fill="${s.color}"/>`
    ).join('');

    container.innerHTML = `
      <div class="chart-legend">
        ${shown.map(s => `<span class="legend-item"><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}
        ${hidden ? `<span class="legend-more">+${hidden} weitere (siehe Tabelle)</span>` : ''}
      </div>
      <div class="chart-plot">
        <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"
             aria-label="Kumulierte Biere pro Person über die Zeit">
          ${yTicks.map(v => `
            <line class="grid" x1="${PAD.left}" x2="${width - PAD.right}" y1="${sy(v)}" y2="${sy(v)}"/>
            <text class="axis" x="${PAD.left - 8}" y="${sy(v) + 4}" text-anchor="end">${v}</text>`).join('')}
          ${xTicks.map(t => `
            <text class="axis" x="${sx(t)}" y="${height - 8}" text-anchor="middle">${formatClock(t)}</text>`).join('')}
          ${lines}
          ${endDots}
          <line class="crosshair" y1="${PAD.top}" y2="${height - PAD.bottom}" x1="0" x2="0"/>
          <rect class="hit" x="${PAD.left}" y="0" width="${width - PAD.left - PAD.right}" height="${height}"/>
        </svg>
        <div class="chart-tooltip" hidden></div>
      </div>`;

    attachHover(container, shown, { sx, x0, x1, width });
}

function attachHover(container, shown, { x0, x1, width }) {
    const svg = container.querySelector('svg');
    const cross = svg.querySelector('.crosshair');
    const tip = container.querySelector('.chart-tooltip');
    const plotW = width - PAD.left - PAD.right;

    const move = evt => {
        const box = svg.getBoundingClientRect();
        const px = (evt.clientX - box.left) * (width / box.width);
        const ts = x0 + Math.min(Math.max((px - PAD.left) / plotW, 0), 1) * (x1 - x0);
        const x = PAD.left + (ts - x0) / (x1 - x0) * plotW;

        cross.setAttribute('x1', x);
        cross.setAttribute('x2', x);
        cross.classList.add('on');

        const rows = shown
            .map(s => ({ s, v: s.points.filter(p => p.ts <= ts).length }))
            .sort((a, b) => b.v - a.v);
        tip.innerHTML = `<div class="tip-time">${formatClock(ts)}</div>` + rows.map(({ s, v }) =>
            `<div class="tip-row"><i style="background:${s.color}"></i><span>${esc(s.name)}</span><b>${v}</b></div>`
        ).join('');
        tip.hidden = false;
        const left = (x / width) * box.width;
        tip.style.left = `${Math.min(Math.max(left + 12, 0), box.width - tip.offsetWidth)}px`;
        if (left + 12 + tip.offsetWidth > box.width) tip.style.left = `${Math.max(left - tip.offsetWidth - 12, 0)}px`;
    };
    const leave = () => { tip.hidden = true; cross.classList.remove('on'); };

    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', leave);
}

function niceMax(v) {
    if (v <= 5) return 5;
    if (v <= 10) return 10;
    return Math.ceil(v / 5) * 5;
}

function ticks(max) {
    const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 30 ? 5 : 10;
    const out = [];
    for (let v = 0; v <= max; v += step) out.push(v);
    return out;
}

function timeTicks(x0, x1, width) {
    const span = x1 - x0;
    const maxTicks = Math.max(2, Math.floor(width / 70));
    const steps = [15, 30, 60, 120, 180, 240].map(m => m * 60_000);
    const step = steps.find(s => span / s <= maxTicks) || steps.at(-1);
    const out = [];
    for (let t = Math.ceil(x0 / step) * step; t <= x1; t += step) out.push(t);
    return out;
}
