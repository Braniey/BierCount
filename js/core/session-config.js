// Liest den Roh-Snapshot einer Session und bringt ihn in eine einheitliche
// Form: aufgelöste Getränke-Einstellung, Zähler pro Getränk, sortierte Events.
// Alte Sessions (ohne config, mit `count` und Events vom Typ "beer") werden
// hier nur beim Lesen umgedeutet, nie zurückgeschrieben.

import { DRINKS, EVENT } from './constants.js';

const LEGACY_CONFIG = { mode: 'single', drinks: ['beer'], beerSize: 0.5 };

export function sizeOf(config, drinkId) {
    return drinkId === 'beer' ? config.beerSize : DRINKS[drinkId].size;
}

export function readSession(data) {
    const config = data?.config || LEGACY_CONFIG;
    const drinks = config.drinks
        .filter(id => DRINKS[id])
        .map(id => ({ ...DRINKS[id], size: sizeOf(config, id) }));

    const players = Object.fromEntries(
        Object.entries(data?.players || {}).map(([name, p]) => [name, {
            drinks: legacyDrinks(p),
            cigs: p.cigs || 0,
            joinedAt: p.joinedAt || 0,
            status: p.status || null,
            uid: p.uid || null,
        }]),
    );

    const events = Object.entries(data?.events || {})
        .map(([key, e]) => e.type === 'beer'
            ? { key, ...e, type: EVENT.DRINK, drink: 'beer' }
            : { key, ...e })
        .sort((a, b) => a.ts - b.ts);

    return { mode: config.mode, drinks, players, events, owner: data?.owner || null };
}

// Alter Zählerstand `count` plus alles, was seit der Umstellung unter
// drinks.beer dazukam (auch negativ durch Rückgängig)
function legacyDrinks(p) {
    if (!p.count) return p.drinks || {};
    return { ...p.drinks, beer: p.count + (p.drinks?.beer || 0) };
}
