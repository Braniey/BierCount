// Reine Berechnungen auf dem Session-Snapshot – kein DOM, kein Firebase.
//
// Zwei Modi:
// - single: ein Getränk, mit Rangliste, Titeln, Abzeichen und Rennen
// - mixed:  mehrere Getränke, nur Übersicht ohne Wertung

import { EVENT, BEERS_PER_CRATE, SERIES_COLORS, badgesFor, awardsFor } from './constants.js';
import { readSession } from './session-config.js';

const HOUR = 3_600_000;
const LIVE_WINDOW = 3 * HOUR; // so lange nach der letzten Aktivität gilt eine Session als "läuft"

export function computeStats(data, now = Date.now()) {
    const session = readSession(data);
    const { mode, drinks, events } = session;
    const main = mode === 'single' ? drinks[0] : null;

    // Farbe nach Beitrittsreihenfolge, damit sie über den Abend stabil bleibt
    const players = Object.entries(session.players)
        .map(([name, p]) => ({ name, ...p }))
        .sort((a, b) => a.joinedAt - b.joinedAt || a.name.localeCompare(b.name))
        .map((p, i) => buildPlayer(p, i, { main, drinks, events, now }));

    const byName = Object.fromEntries(players.map(p => [p.name, p]));

    const byDrink = Object.fromEntries(drinks.map(d => [d.id, sum(players, p => p.drinks[d.id] || 0)]));
    const count = sum(Object.values(byDrink));
    const isBeerNight = main?.id === 'beer';

    const start = Math.min(data?.createdAt || Infinity, events[0]?.ts || Infinity);
    const lastActivity = Math.max(
        events.at(-1)?.end || events.at(-1)?.ts || 0,
        ...players.map(p => p.status?.since || 0),
    );
    const isLive = now - lastActivity < LIVE_WINDOW;
    const end = isLive ? now : lastActivity;

    const totals = {
        count,
        byDrink,
        cigs: sum(players, p => p.cigs),
        liters: sum(drinks, d => byDrink[d.id] * d.size),
        crates: isBeerNight ? Math.floor(count / BEERS_PER_CRATE) : null,
        crateProgress: isBeerNight ? (count % BEERS_PER_CRATE) / BEERS_PER_CRATE : null,
        toiletVisits: sum(players, p => p.toilet.visits),
        toiletMs: sum(players, p => p.toilet.totalMs),
        smokeMs: sum(players, p => p.smoke.totalMs),
        durationMs: Number.isFinite(start) && end > start ? end - start : 0,
        isLive,
    };
    totals.perHour = totals.durationMs > HOUR / 4 ? count / (totals.durationMs / HOUR) : null;

    // Im gemischten Modus wird nicht gewertet: Reihenfolge = Beitritt
    const ranking = main ? [...players].sort(compareRanking) : players;
    if (main) assignBadges(players, events, main);

    return {
        mode,
        drinks,
        main,
        owner: session.owner,
        players,
        byName,
        totals,
        ranking,
        awards: main ? computeAwards(players, ranking, main) : [],
        events,
        start: Number.isFinite(start) ? start : null,
        end,
    };
}

// Rangfolge bei Gleichstand:
// 1. mehr Getränke
// 2. wer die Zahl zuerst erreicht hat (früheres letztes Getränk)
// 3. weniger Klogänge
// 4. wer früher beigetreten ist
function compareRanking(a, b) {
    return b.count - a.count
        || byTime(a.lastDrinkAt, b.lastDrinkAt)
        || a.toilet.visits - b.toilet.visits
        || a.joinedAt - b.joinedAt;
}

// Ohne Zeitstempel (alte Sessions) zählt der Spieler als später
function byTime(a, b) {
    if (a === b) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
}

function buildPlayer(p, colorIndex, { main, drinks, events, now }) {
    const own = events.filter(e => e.player === p.name);
    const drinkEvents = own.filter(e => e.type === EVENT.DRINK && (!main || e.drink === main.id));
    const drinkTimes = drinkEvents.map(e => e.ts);
    const last = drinkEvents.at(-1);

    const pauseStats = type => {
        const done = own.filter(e => e.type === type && e.end);
        const durations = done.map(e => e.end - e.ts);
        const running = p.status?.type === type ? now - p.status.since : 0;
        return {
            visits: done.length + (running ? 1 : 0),
            totalMs: sum(durations) + running,
            longestMs: Math.max(0, running, ...durations),
        };
    };

    const counts = Object.fromEntries(drinks.map(d => [d.id, Math.max(0, p.drinks[d.id] || 0)]));

    return {
        name: p.name,
        uid: p.uid,
        drinks: counts,
        // single: Anzahl des Abend-Getränks, mixed: Summe aller Getränke
        count: sum(Object.values(counts)),
        cigs: Math.max(0, p.cigs),
        joinedAt: p.joinedAt,
        status: p.status,
        color: colorIndex < SERIES_COLORS.length ? SERIES_COLORS[colorIndex] : '#8a7a62',
        drinkTimes,
        lastDrink: last ? { drink: last.drink, ts: last.ts } : null,
        firstDrinkAt: drinkTimes[0] ?? null,
        lastDrinkAt: drinkTimes.at(-1) ?? null,
        // Ø Minuten zwischen zwei Getränken
        avgIntervalMin: drinkTimes.length >= 2
            ? (drinkTimes.at(-1) - drinkTimes[0]) / (drinkTimes.length - 1) / 60_000
            : null,
        toilet: pauseStats(EVENT.TOILET),
        smoke: pauseStats(EVENT.SMOKE),
        badges: [],
    };
}

// Persönliche Abzeichen (nur beim Ein-Getränk-Abend)
function assignBadges(players, events, main) {
    const BADGES = badgesFor(main);
    const firstDrink = events.find(e => e.type === EVENT.DRINK && e.drink === main.id);
    const toiletStarts = [
        ...events.filter(e => e.type === EVENT.TOILET).map(e => ({ player: e.player, ts: e.ts })),
        ...players.filter(p => p.status?.type === EVENT.TOILET).map(p => ({ player: p.name, ts: p.status.since })),
    ].sort((a, b) => a.ts - b.ts);
    const totalCigs = sum(players, p => p.cigs);

    for (const p of players) {
        if (firstDrink?.player === p.name) p.badges.push(BADGES.earlyBird);
        if (toiletStarts[0]?.player === p.name) p.badges.push(BADGES.sealBroken);
        if (hasWindow(p.drinkTimes, 3, HOUR)) p.badges.push(BADGES.hattrick);
        if (p.count >= 10) p.badges.push(BADGES.tenner);
        if (p.cigs === 0 && totalCigs > 0 && p.count >= 3) p.badges.push(BADGES.steadfast);
    }
}

function hasWindow(times, n, windowMs) {
    for (let i = 0; i + n - 1 < times.length; i++) {
        if (times[i + n - 1] - times[i] <= windowMs) return true;
    }
    return false;
}

// Titel des Abends – bei Gleichstand teilen sich alle den Titel (außer dem König)
function computeAwards(players, ranking, main) {
    const AWARDS = awardsFor(main);
    const n = main.name;
    const award = ({ icon, title }, candidates, value, format, lowerIsBetter = false) => {
        if (!candidates.length) return null;
        const best = candidates.reduce((acc, p) => {
            const v = value(p);
            return lowerIsBetter ? Math.min(acc, v) : Math.max(acc, v);
        }, lowerIsBetter ? Infinity : -Infinity);
        const winners = candidates.filter(p => value(p) === best);
        return { icon, title, winners: winners.map(p => p.name), detail: format(best, winners[0]) };
    };

    return [
        // Der König ist immer genau die #1 der Rangliste
        ranking[0]?.count > 0
            ? { ...AWARDS.king, winners: [ranking[0].name], detail: `${ranking[0].count} ${n}` }
            : null,
        award(AWARDS.fastest, players.filter(p => p.drinkTimes.length >= 3),
            p => Math.round(p.avgIntervalMin), v => `Ø ${v} min pro ${n}`, true),
        award(AWARDS.chain, players.filter(p => p.cigs > 0),
            p => p.cigs, v => `${v} Kippen`),
        award(AWARDS.toiletKing, players.filter(p => p.toilet.totalMs > 0),
            p => p.toilet.totalMs, v => `${formatMinutes(v)} auf Klo`),
        award(AWARDS.longest, players.filter(p => p.toilet.longestMs > 0),
            p => p.toilet.longestMs, v => `${formatMinutes(v)} am Stück`),
        award(AWARDS.ironBladder, players.filter(p => p.count >= 4),
            p => +(p.count / (p.toilet.visits + 1)).toFixed(2),
            (v, p) => p.toilet.visits ? `${p.count} ${n}, nur ${p.toilet.visits}× auf Klo` : `${p.count} ${n}, noch kein Klogang`),
    ].filter(Boolean);
}

// Kumulierte Kurven für das Rennen-Diagramm (nur beim Ein-Getränk-Abend)
export function raceSeries(stats) {
    if (!stats.main) return [];
    return stats.players
        .filter(p => p.drinkTimes.length)
        .map(p => ({
            name: p.name,
            color: p.color,
            points: p.drinkTimes.map((ts, i) => ({ ts, value: i + 1 })),
        }));
}

function sum(list, fn = x => x) {
    return list.reduce((s, x) => s + fn(x), 0);
}

function formatMinutes(ms) {
    const min = Math.round(ms / 60_000);
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}
