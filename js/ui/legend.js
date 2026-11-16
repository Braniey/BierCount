// Legende der Abzeichen und Titel als Dialog, mit den Texten für das
// Getränk der aktuellen Session. Öffnet sich über jeden Button
// mit data-open-legend und beim Antippen eines Abzeichens.

import { $, esc } from './dom.js';
import { DRINKS, badgesFor, awardsFor } from '../core/constants.js';

const BADGE_SELECTOR = '[data-open-legend], .badge, .p-badges span, .badges-cell span';

const item = ({ icon, title, desc }) => `
  <li class="legend-item">
    <span class="legend-icon">${icon}</span>
    <div>
      <div class="legend-name">${esc(title)}</div>
      <div class="legend-desc">${esc(desc)}</div>
    </div>
  </li>`;

// currentDrink(): Getränk der aktiven Session (null beim gemischten Abend)
export function initLegend(currentDrink) {
    const dialog = $('#legend');

    document.addEventListener('click', e => {
        if (!e.target.closest(BADGE_SELECTOR) || dialog.open) return;
        const drink = currentDrink() || DRINKS.beer;
        $('#legend-badges').innerHTML = Object.values(badgesFor(drink)).map(item).join('');
        $('#legend-awards').innerHTML = Object.values(awardsFor(drink)).map(item).join('');
        dialog.showModal();
    });
    dialog.addEventListener('click', e => {
        // Klick auf den Hintergrund oder das ✕ schließt
        if (e.target === dialog || e.target.closest('[data-close-legend]')) dialog.close();
    });
}
