// Datenbank-Zugriffe für Spiele unter sessions/{sid}/games/{gid}.
//
// games/{gid}: { type, host, status, createdAt, startedAt?, endedAt?, endedBy?,
//                players: { [name]: { joinedAt } }, order: { [name]: position },
//                seed, moves/{mid}: { player, type, data, ts } }
// Wer was darf, regelt database.rules.json.

import { db, ref, set, update, push } from './firebase.js';
import { newSeed } from '../games/random.js';

const gameRef = (sid, gid) => ref(db, `sessions/${sid}/games/${gid}`);

export async function createGame(sid, type, host) {
    const gid = push(ref(db, `sessions/${sid}/games`)).key;
    const now = Date.now();
    await set(gameRef(sid, gid), {
        type, host, status: 'lobby', createdAt: now,
        players: { [host]: { joinedAt: now } },
    });
    return gid;
}

export function joinGame(sid, gid, player) {
    return set(ref(db, `sessions/${sid}/games/${gid}/players/${player}`), { joinedAt: Date.now() });
}

export function leaveGame(sid, gid, player) {
    return set(ref(db, `sessions/${sid}/games/${gid}/players/${player}`), null);
}

// order: Namen in Spielreihenfolge
export function startGame(sid, gid, order) {
    return update(gameRef(sid, gid), {
        status: 'running',
        order: Object.fromEntries(order.map((name, i) => [name, i])),
        seed: newSeed(),
        startedAt: Date.now(),
    });
}

export function abortGame(sid, gid) {
    return set(ref(db, `sessions/${sid}/games/${gid}/status`), 'aborted');
}

export function finishGame(sid, gid, player) {
    return update(gameRef(sid, gid), { status: 'finished', endedAt: Date.now(), endedBy: player });
}

export function addMove(sid, gid, player, type, data) {
    const move = { player, type, ts: Date.now() };
    if (data != null) move.data = data;
    return set(push(ref(db, `sessions/${sid}/games/${gid}/moves`)), move);
}
