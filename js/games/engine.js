// Spiel-Engine: berechnet den Spielstand auf jedem Gerät gleich aus dem
// Zug-Protokoll (type, order, seed, moves). Nichts davon wird gespeichert.
//
// Ein Spielmodul hat die Form:
// { id, name, icon, minPlayers, maxPlayers, howTo,
//   init(order, seed) → state, apply(state, move) → state,
//   createMove(type, state, me) → data,
//   renderTable(el, state), renderPhone(el, state, me, makeMove) }
// state enthält mindestens: turn (Name | null), finished (bool),
// drinks ([{ player, sips, reason, key }])

import { duel } from './duel.js';

export const GAMES = { [duel.id]: duel };
export const GAME_ORDER = [duel.id];

export function computeGame(game) {
    const def = GAMES[game?.type] || null;
    const order = game?.order || [];
    if (!def || !game.order || game.status === 'lobby') return { def, state: null, order };

    const moves = Object.entries(game.moves || {})
        .map(([key, m]) => ({ key, ...m }))
        .sort((a, b) => a.ts - b.ts || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    let state = def.init(order, game.seed);
    for (const move of moves) state = def.apply(state, move);
    return { def, state, order };
}
