// Beamer-Modus: Vollbild ohne Navigation, Bildschirm bleibt an.
// Genutzt vom Dashboard und von der Spiel-Ansicht; Knöpfe mit
// data-beamer-btn zeigen den aktuellen Zustand an.

import { $$ } from './dom.js';

let wakeLock = null;

document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) setBeamer(false);
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('beamer')) setBeamer(false);
});

export function toggleBeamer() {
    setBeamer(!document.body.classList.contains('beamer'));
}

export async function setBeamer(on) {
    document.body.classList.toggle('beamer', on);
    $$('#beamer-btn, [data-beamer-btn]').forEach(btn => {
        btn.textContent = on ? '✕ Beamer aus' : '📺 Beamer-Modus';
    });
    try {
        if (on) {
            await document.documentElement.requestFullscreen?.();
            wakeLock = await navigator.wakeLock?.request('screen');
        } else {
            if (document.fullscreenElement) await document.exitFullscreen();
            await wakeLock?.release();
            wakeLock = null;
        }
    } catch { /* Fullscreen/WakeLock nicht erlaubt – Beamer-Layout geht trotzdem */ }
}
