// Reine Berechnungen auf dem Session-Snapshot – kein DOM, kein Firebase.

import { EVENT, LITERS_PER_BEER, BEERS_PER_CRATE, SERIES_COLORS } from './constants.js';

const HOUR = 3_600_000;
const LIVE_WINDOW = 3 * HOUR; // so lange nach der letzten Aktivität gilt eine Session als "läuft"

export function computeStats(data, now = Date.now()) {
    const rawPlayers = data?.players || {};
    const allEvents  = Object.entries(data?.events || {})
        .map(([key, e]) => ({ key, ...e }))
        .sort((a, b) => a.ts - b.ts);

    // Farbe nach Beitrittsreihenfolge, damit sie über den Abend stabil bleibt
    const players = Object.entries(rawPlayers)
        .map(([name, p]) => ({ name, ...p }))
        .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0) || a.name.localeCompare(b.name))
        .map((p, i) => buildPlayer(p, i, allEvents, now));

    const byName = Object.fromEntries(players.map(p => [p.name, p]));

    const beers = sum(players, p => p.beers);
    const cigs  = sum(players, p => p.cigs);
    const start = Math.min(data?.createdAt || Infinity, allEvents[0]?.ts || Infinity);
    const lastActivity = Math.max(
        allEvents.at(-1)?.end || allEvents.at(-1)?.ts || 0,
        ...players.map(p => p.status?.since || 0),
    );
    const isLive = now - lastActivity < LIVE_WINDOW;
    const end = isLive ? now : lastActivity;

    const totals = {
        beers,
        cigs,
        liters: beers * LITERS_PER_BEER,
        crates: Math.floor(beers / BEERS_PER_CRATE),
        crateProgress: (beers % BEERS_PER_CRATE) / BEERS_PER_CRATE,
        toiletVisits: sum(players, p => p.toilet.visits),
        toiletMs: sum(players, p => p.toilet.totalMs),
        smokeMs: sum(players, p => p.smoke.totalMs),
        durationMs: Number.isFinite(start) && end > start ? end - start : 0,
        isLive,
    };
    totals.beersPerHour = totals.durationMs > HOUR / 4 ? beers / (totals.durationMs / HOUR) : null;

    assignBadges(players, allEvents);

    return {
        players,
        byName,
        totals,
        ranking: [...players].sort((a, b) => b.beers - a.beers || a.joinedAt - b.joinedAt),
        awards: computeAwards(players),
        events: allEvents,
        start: Number.isFinite(start) ? start : null,
        end,
    };
}

function buildPlayer(p, colorIndex, allEvents, now) {
    const own = allEvents.filter(e => e.player === p.name);
    const beerTimes = own.filter(e => e.type === EVENT.BEER).map(e => e.ts);

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

    return {
        name: p.name,
        beers: Math.max(0, p.count || 0),
        cigs: Math.max(0, p.cigs || 0),
        joinedAt: p.joinedAt || 0,
        status: p.status || null,
        color: colorIndex < SERIES_COLORS.length ? SERIES_COLORS[colorIndex] : '#8a7a62',
        beerTimes,
        firstBeer: beerTimes[0] ?? null,
        lastBeer: beerTimes.at(-1) ?? null,
        // Ø Minuten zwischen zwei Bieren
        avgIntervalMin: beerTimes.length >= 2
            ? (beerTimes.at(-1) - beerTimes[0]) / (beerTimes.length - 1) / 60_000
            : null,
        toilet: pauseStats(EVENT.TOILET),
        smoke: pauseStats(EVENT.SMOKE),
        badges: [],
    };
}

// Persönliche Abzeichen
function assignBadges(players, allEvents) {
    const firstBeer = allEvents.find(e => e.type === EVENT.BEER);
    const toiletStarts = [
        ...allEvents.filter(e => e.type === EVENT.TOILET).map(e => ({ player: e.player, ts: e.ts })),
        ...players.filter(p => p.status?.type === EVENT.TOILET).map(p => ({ player: p.name, ts: p.status.since })),
    ].sort((a, b) => a.ts - b.ts);
    const totalCigs = sum(players, p => p.cigs);

    for (const p of players) {
        if (firstBeer?.player === p.name) {
            p.badges.push({ icon: '🐣', title: 'Frühstarter', desc: 'Erstes Bier des Abends' });
        }
        if (toiletStarts[0]?.player === p.name) {
            p.badges.push({ icon: '🔓', title: 'Siegel gebrochen', desc: 'Als Erstes aufs Klo' });
        }
        if (hasWindow(p.beerTimes, 3, HOUR)) {
            p.badges.push({ icon: '🎩', title: 'Hattrick', desc: '3 Bier in einer Stunde' });
        }
        if (p.beers >= 10) {
            p.badges.push({ icon: '🔟', title: 'Zweistellig', desc: '10 Bier oder mehr' });
        }
        if (p.cigs === 0 && totalCigs > 0 && p.beers >= 3) {
            p.badges.push({ icon: '🚭', title: 'Standhaft', desc: 'Keine Kippe, obwohl andere rauchen' });
        }
    }
}

function hasWindow(times, n, windowMs) {
    for (let i = 0; i + n - 1 < times.length; i++) {
        if (times[i + n - 1] - times[i] <= windowMs) return true;
    }
    return false;
}

// Titel des Abends – bei Gleichstand teilen sich alle den Titel
function computeAwards(players) {
    const award = (icon, title, candidates, value, format, lowerIsBetter = false) => {
        if (!candidates.length) return null;
        const best = candidates.reduce((acc, p) => {
            const v = value(p);
            return lowerIsBetter ? Math.min(acc, v) : Math.max(acc, v);
        }, lowerIsBetter ? Infinity : -Infinity);
        const winners = candidates.filter(p => value(p) === best);
        const first = candidates.find(p => value(p) === best);
        return { icon, title, winners: winners.map(p => p.name), detail: format(best, first) };
    };

    return [
        award('👑', 'Bierkönig', players.filter(p => p.beers > 0),
            p => p.beers, v => `${v} Bier`),
        award('⚡', 'Schnellster Trinker', players.filter(p => p.beerTimes.length >= 3),
            p => Math.round(p.avgIntervalMin), v => `Ø ${v} min pro Bier`, true),
        award('🚬', 'Kettenraucher', players.filter(p => p.cigs > 0),
            p => p.cigs, v => `${v} Kippen`),
        award('🚽', 'Klo-König', players.filter(p => p.toilet.totalMs > 0),
            p => p.toilet.totalMs, v => `${formatMinutes(v)} auf Klo`),
        award('🧻', 'Längste Sitzung', players.filter(p => p.toilet.longestMs > 0),
            p => p.toilet.longestMs, v => `${formatMinutes(v)} am Stück`),
        award('🫧', 'Eiserne Blase', players.filter(p => p.beers >= 4),
            p => +(p.beers / (p.toilet.visits + 1)).toFixed(2),
            (v, p) => p.toilet.visits ? `${p.beers} Bier, nur ${p.toilet.visits}× auf Klo` : `${p.beers} Bier, noch kein Klogang`),
    ].filter(Boolean);
}

// Kumulierte Bier-Kurven für das Rennen-Diagramm
export function raceSeries(stats) {
    return stats.players
        .filter(p => p.beerTimes.length)
        .map(p => ({
            name: p.name,
            color: p.color,
            points: p.beerTimes.map((ts, i) => ({ ts, value: i + 1 })),
        }));
}

function sum(list, fn = x => x) {
    return list.reduce((s, x) => s + fn(x), 0);
}

function formatMinutes(ms) {
    const min = Math.round(ms / 60_000);
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}
