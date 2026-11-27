// Übersicht der Spiele einer Session – reine Logik, kein DOM.

import { orderOf } from '../games/engine.js';

const LOBBY_TIMEOUT = 30 * 60_000;     // Lobby ohne Start läuft ab
const IDLE_TIMEOUT  = 2 * 3_600_000;   // laufendes Spiel ohne Zug gilt als verlassen

// me: eigener Spielername. Ergebnis:
// open     offene Lobbys, running laufende Spiele
// mine     das Spiel (Lobby oder laufend), in dem ich gerade bin
// invites  offene Lobbys ohne mich – nur wenn ich in keinem Spiel bin
export function listGames(data, me, now = Date.now()) {
    const games = Object.entries(data?.games || {}).map(([id, raw]) => toGame(id, raw));

    const open = games
        .filter(g => g.status === 'lobby' && now - g.createdAt < LOBBY_TIMEOUT)
        .sort((a, b) => a.createdAt - b.createdAt);
    const running = games
        .filter(g => g.status === 'running' && now - g.lastActivity < IDLE_TIMEOUT)
        .sort((a, b) => a.startedAt - b.startedAt);

    const mine = [...open, ...running].find(g => g.players.includes(me)) || null;
    const invites = mine ? [] : open.filter(g => !g.players.includes(me));
    return { open, running, mine, invites };
}

function toGame(id, raw) {
    const order = orderOf(raw);
    // Spieler: nach dem Start die Spielreihenfolge, vorher Host zuerst + Beitritt
    const players = order.length ? order : Object.entries(raw.players || {})
        .sort(([a, pa], [b, pb]) => (a === raw.host ? -1 : b === raw.host ? 1 : pa.joinedAt - pb.joinedAt))
        .map(([name]) => name);
    const moveTimes = Object.values(raw.moves || {}).map(m => m.ts || 0);
    return {
        id,
        ...raw,
        players,
        lastActivity: Math.max(raw.createdAt || 0, raw.startedAt || 0, ...moveTimes),
    };
}
