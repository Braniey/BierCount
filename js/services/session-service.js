// Alle Lese-/Schreibzugriffe auf die Firebase Realtime Database.
//
// Datenmodell:
// sessions/{id}
//   name, createdAt
//   players/{name}: { count, cigs, joinedAt, status: { type, since } | null }
//   events/{pushId}: { type, player, ts, end? }
//
// `count` und `cigs` bleiben als Summen erhalten (kompatibel zu alten Sessions),
// die Events liefern zusätzlich die Zeitstempel für Statistiken.
// Zähler und Event werden immer in EINEM Multi-Path-Update geschrieben,
// damit nichts auseinanderläuft.

import { db, ref, get, set, update, push, onValue, increment } from './firebase.js';
import { EVENT, PAUSE } from '../core/constants.js';

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O, 1/I

function genId(length = 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(bytes, b => ID_ALPHABET[b % ID_ALPHABET.length]).join('');
}

const sessionRef = id => ref(db, `sessions/${id}`);
const newEventKey = id => push(ref(db, `sessions/${id}/events`)).key;

export async function createSession(name) {
    let id = genId();
    while ((await get(sessionRef(id))).exists()) id = genId();
    await set(sessionRef(id), { name, createdAt: Date.now() });
    return id;
}

export async function fetchSession(id) {
    const snap = await get(sessionRef(id));
    return snap.exists() ? snap.val() : null;
}

export async function joinSession(id, player) {
    const playerRef = ref(db, `sessions/${id}/players/${player}`);
    const snap = await get(playerRef);
    if (!snap.exists()) {
        await set(playerRef, { count: 0, cigs: 0, joinedAt: Date.now() });
    }
}

export function subscribeSession(id, callback) {
    return onValue(sessionRef(id), snap => callback(snap.val()));
}

export function addBeer(id, player) {
    return update(sessionRef(id), {
        [`players/${player}/count`]: increment(1),
        [`events/${newEventKey(id)}`]: { type: EVENT.BEER, player, ts: Date.now() },
    });
}

export function addCig(id, player) {
    return update(sessionRef(id), {
        [`players/${player}/cigs`]: increment(1),
        [`events/${newEventKey(id)}`]: { type: EVENT.CIG, player, ts: Date.now() },
    });
}

// Nimmt den letzten Eintrag eines Typs zurück. `events` ist der aktuelle
// Snapshot aus dem Store, damit kein zusätzlicher Query nötig ist.
export function undoLast(id, player, type, events = {}) {
    const field = type === EVENT.BEER ? 'count' : 'cigs';
    const lastKey = Object.entries(events)
        .filter(([, e]) => e.player === player && e.type === type)
        .sort(([, a], [, b]) => b.ts - a.ts)[0]?.[0];

    const changes = { [`players/${player}/${field}`]: increment(-1) };
    if (lastKey) changes[`events/${lastKey}`] = null;
    return update(sessionRef(id), changes);
}

function endPauseChanges(id, player, status, now) {
    return {
        [`players/${player}/status`]: null,
        [`events/${newEventKey(id)}`]: { type: status.type, player, ts: status.since, end: now },
    };
}

// Startet eine Pause. Eine laufende andere Pause wird dabei beendet.
// Eine Raucherpause zählt automatisch eine Zigarette.
export function startPause(id, player, type, currentStatus) {
    if (!PAUSE[type]) throw new Error(`Unbekannte Pause: ${type}`);
    const now = Date.now();
    const changes = currentStatus ? endPauseChanges(id, player, currentStatus, now) : {};
    changes[`players/${player}/status`] = { type, since: now };
    if (type === EVENT.SMOKE) {
        changes[`players/${player}/cigs`] = increment(1);
        changes[`events/${newEventKey(id)}`] = { type: EVENT.CIG, player, ts: now };
    }
    return update(sessionRef(id), changes);
}

export function endPause(id, player, currentStatus) {
    if (!currentStatus) return Promise.resolve();
    return update(sessionRef(id), endPauseChanges(id, player, currentStatus, Date.now()));
}
