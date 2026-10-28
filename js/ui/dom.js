// Kleine DOM- und Formatierungs-Helfer

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);

export const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 4:05 bzw. 1:04:05
export function formatTimer(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// 45 min / 2 h 10 min
export function formatDuration(ms) {
    const min = Math.round(ms / 60_000);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

export function formatAgo(ts, now = Date.now()) {
    const min = Math.floor((now - ts) / 60_000);
    if (min < 1) return 'gerade eben';
    if (min < 60) return `vor ${min} min`;
    return `vor ${formatDuration(now - ts)}`;
}

export const formatClock = ts =>
    new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

export const formatNumber = (n, digits = 0) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Live-Anzeigen: Elemente mit data-since (Timer) oder data-ago (relativ)
// werden jede Sekunde aktualisiert, ohne die ganze View neu zu rendern.
export function startLiveTimers() {
    const tick = () => {
        const now = Date.now();
        $$('[data-since]').forEach(el => { el.textContent = formatTimer(now - Number(el.dataset.since)); });
        $$('[data-ago]').forEach(el => { el.textContent = formatAgo(Number(el.dataset.ago), now); });
    };
    tick();
    return setInterval(tick, 1000);
}
