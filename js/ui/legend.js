// Legende der Abzeichen und Titel als Dialog. Öffnet sich über jeden Button
// mit data-open-legend und beim Antippen eines Abzeichens.

import { $, esc } from './dom.js';
import { BADGES, AWARDS } from '../core/constants.js';

const BADGE_SELECTOR = '[data-open-legend], .badge, .p-badges span, .badges-cell span';

const item = ({ icon, title, desc }) => `
  <li class="legend-item">
    <span class="legend-icon">${icon}</span>
    <div>
      <div class="legend-name">${esc(title)}</div>
      <div class="legend-desc">${esc(desc)}</div>
    </div>
  </li>`;

export function initLegend() {
    const dialog = $('#legend');
    $('#legend-badges').innerHTML = Object.values(BADGES).map(item).join('');
    $('#legend-awards').innerHTML = Object.values(AWARDS).map(item).join('');

    document.addEventListener('click', e => {
        if (e.target.closest(BADGE_SELECTOR) && !dialog.open) dialog.showModal();
    });
    dialog.addEventListener('click', e => {
        // Klick auf den Hintergrund oder das ✕ schließt
        if (e.target === dialog || e.target.closest('[data-close-legend]')) dialog.close();
    });
}
