// Trink-Anzeige: meldet ein Spiel, dass ich trinken soll, erscheint ein
// großes Overlay – egal in welchem Reiter ich gerade bin.
// Beim ersten Blick auf ein Spiel (z. B. nach dem Neuladen) werden die
// bisherigen Meldungen nur gemerkt, damit nichts doppelt aufpoppt.

import { celebrate } from './effects.js';

const seen = new Map(); // gid -> Set der bereits bekannten Meldungs-Schlüssel

// games: [{ id, state }] mit berechnetem Spielstand; me: eigener Name
export function watchDrinks(games, me) {
    for (const { id, state } of games) {
        if (!state) continue;
        const keys = state.drinks.map(drinkKey);
        if (!seen.has(id)) {
            seen.set(id, new Set(keys));
            continue;
        }
        const known = seen.get(id);
        state.drinks.forEach((d, i) => {
            if (known.has(keys[i])) return;
            known.add(keys[i]);
            if (d.player === me) alertDrink(d);
        });
    }
}

export const sipsText = n => `${n} ${n === 1 ? 'Schluck' : 'Schlücke'}`;

function alertDrink({ sips, reason }) {
    celebrate({
        big: '🍺',
        title: `Du trinkst ${sipsText(sips)}`,
        subtitle: reason,
        confetti: false,
        action: 'Prost!',
        duration: 8000,
    });
}

// Ein Zug kann mehrere Meldungen auslösen (z. B. für mehrere Spieler)
const drinkKey = d => `${d.key}:${d.player}`;
