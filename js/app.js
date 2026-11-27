// Einstiegspunkt: verbindet Store, Firebase-Service und Views.

import { isConfigured } from './config/firebase-config.js';
import * as service from './services/session-service.js';
import * as gameService from './services/game-service.js';
import { signIn } from './services/firebase.js';
import { getState, setState, subscribe, restoreState, events, me } from './core/store.js';
import { computeStats } from './core/stats.js';
import { readSession } from './core/session-config.js';
import { lastDrinkEvent } from './core/undo.js';
import { EVENT, DRINKS, BEERS_PER_CRATE, CRATE_NAME, INVALID_KEY_CHARS, milestoneFor } from './core/constants.js';
import { $, $$, startLiveTimers } from './ui/dom.js';
import { showToast } from './ui/toast.js';
import { celebrate, confetti } from './ui/effects.js';
import { initSetupView, renderSetupView } from './ui/views/setup-view.js';
import { initCounterView, renderCounterView } from './ui/views/counter-view.js';
import { initDashboardView, renderDashboardView } from './ui/views/dashboard-view.js';
import { initStatsView, renderStatsView } from './ui/views/stats-view.js';
import { initLegend } from './ui/legend.js';
import { listGames } from './core/games.js';
import { computeGame } from './games/engine.js';
import { watchDrinks } from './ui/drink-alert.js';
import { initGameInvites, renderGameInvites } from './ui/game-invites.js';
import { initGamesView, renderGamesView, openRoom, closeRoom, currentRoom } from './ui/views/games-view.js';

const VIEWS = {
    setup:     renderSetupView,
    counter:   renderCounterView,
    dashboard: renderDashboardView,
    stats:     renderStatsView,
    games:     (state, stats, games) => renderGamesView(state, games, type => actions.makeMove(currentRoom(), type)),
};

let activeTab = 'setup';
let unsubscribeSession = null;

// ── Tabs ─────────────────────────────────────────────────────────
function switchTab(tab) {
    activeTab = tab;
    for (const name of Object.keys(VIEWS)) {
        $(`#${name}-view`).hidden = name !== tab;
    }
    $$('nav [data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    render();
}

function render() {
    const state = getState();
    const games = listGames(state.data, state.player);
    if (handleGames(state, games)) return; // hat selbst neu gerendert
    VIEWS[activeTab](state, computeStats(state.data), games);
}

// ── Spiele: Einladungen, Trink-Anzeige, automatisch öffnen/beenden ─
const autoOpened = new Set();
const finishing = new Set();

function handleGames(state, games) {
    renderGameInvites(state.player ? games.invites : []);
    if (!state.data || !state.player) return false;

    // Trink-Meldungen aller laufenden und beendeten Spiele
    const computed = Object.entries(state.data.games || {})
        .filter(([, g]) => g.status === 'running' || g.status === 'finished')
        .map(([id, g]) => ({ id, raw: g, state: computeGame(g).state }));
    watchDrinks(computed, state.player);

    // Mein Spiel ist vorbei → Status setzen. Das macht das Gerät mit dem
    // letzten Zug; die anderen springen nur ein, falls es nach 10 s nicht
    // passiert ist (sonst würden alle gleichzeitig schreiben)
    const mine = games.mine;
    const mineComputed = mine && computed.find(c => c.id === mine.id);
    if (mineComputed?.state?.finished && mine.status === 'running' && !finishing.has(mine.id)) {
        finishing.add(mine.id);
        const { id: sid } = state.session;
        const lastMover = Object.values(mine.moves || {}).sort((a, b) => b.ts - a.ts)[0]?.player;
        const finish = () => gameService.finishGame(sid, mine.id, state.player);
        if (lastMover === state.player) {
            finish().catch(console.error);
        } else {
            setTimeout(() => {
                if (getState().data?.games?.[mine.id]?.status === 'running') finish().catch(() => {});
            }, 10_000);
        }
    }

    // Mein Spiel wurde gestartet → Spielraum öffnen
    if (mine?.status === 'running' && !autoOpened.has(mine.id)) {
        autoOpened.add(mine.id);
        openRoom(mine.id);
        if (activeTab !== 'games') {
            switchTab('games');
            return true;
        }
    }
    return false;
}

// ── Session-Verbindung ───────────────────────────────────────────
function connect(session) {
    unsubscribeSession?.();
    unsubscribeSession = null;
    resetNotifications();
    if (!session) return;
    unsubscribeSession = service.subscribeSession(session.id, data => {
        if (data === null) {
            showToast('Session existiert nicht mehr');
            setState({ session: null, data: null });
            return;
        }
        notifyChanges(data);
        setState({ data });
        ensureOwnName(session.id, data);
    });
}

// Gespeicherter Name ohne Handy-Kennung (z. B. von vor der Absicherung oder
// nach dem Freigeben): automatisch für dieses Handy holen. Gehört er inzwischen
// einem anderen Handy, zurück ins Setup.
let claiming = null;
async function ensureOwnName(sid, data) {
    const { player, uid } = getState();
    const entry = player && data.players?.[player];
    if (!entry || !uid || entry.uid === uid || claiming === `${sid}/${player}`) return;
    claiming = `${sid}/${player}`;
    try {
        if (!entry.uid) {
            await service.joinSession(sid, player, uid);
        } else {
            setState({ player: null });
            showToast(`${player} gehört gerade einem anderen Handy – bitte im Setup neu wählen`, 3500);
            switchTab('setup');
        }
    } catch (err) {
        console.error(err);
    } finally {
        claiming = null;
    }
}

// ── Benachrichtigungen bei neuen Events (Meilensteine etc.) ─────
let seenEvents = null;
let lastCrates = null;

function resetNotifications() {
    seenEvents = null;
    lastCrates = null;
}

function notifyChanges(data) {
    const all = data.events || {};
    const stats = computeStats(data);

    if (seenEvents === null) {
        // Erster Snapshot: nur merken, nicht feiern
        seenEvents = new Set(Object.keys(all));
        lastCrates = stats.totals.crates;
        return;
    }

    const myName = getState().player;
    const { main } = stats;
    for (const [key, e] of Object.entries(all)) {
        if (seenEvents.has(key)) continue;
        seenEvents.add(key);
        if (e.type !== EVENT.DRINK) continue;
        // Gemischter Abend: nur eigene Meilensteine, kein Vergleich mit anderen
        if (!main && e.player !== myName) continue;

        const count = stats.byName[e.player]?.count ?? 0;
        const text = milestoneFor(count, main?.id ?? null);
        if (!text) continue;
        const icon = (main || DRINKS[e.drink] || DRINKS.beer).icon;
        const unit = main ? main.name : 'Getränk';
        if (e.player === myName && count === 1) {
            showToast(`${icon} ${text}`);
            confetti({ count: 60, duration: 1500 });
        } else if (e.player === myName) {
            celebrate({ big: count, title: `${count}. ${unit}`, subtitle: text });
        } else if (count >= 5) {
            showToast(`🎉 ${e.player}: ${count}. ${unit}!`, 3000);
        }
    }

    if (stats.totals.crates !== null && stats.totals.crates > lastCrates) {
        celebrate({
            big: '📦',
            title: `${CRATE_NAME} Nr. ${stats.totals.crates} ist leer!`,
            subtitle: `${stats.totals.crates * BEERS_PER_CRATE} Bier zusammen`,
        });
    }
    lastCrates = stats.totals.crates;
}

// ── Aktionen ─────────────────────────────────────────────────────
function requireConfig() {
    if (isConfigured) return true;
    $('#config-banner').hidden = false;
    showToast('Firebase konfigurieren!');
    return false;
}

// Wartet auf die anonyme Anmeldung; schlägt sie fehl, erklärt ein Banner warum
let authReady = null;
function ensureSignedIn() {
    authReady ??= signIn()
        .then(uid => { setState({ uid }); return uid; })
        .catch(err => {
            console.error(err);
            $('#auth-banner').hidden = false;
            authReady = null;
            throw err;
        });
    return authReady;
}

function requirePlayer() {
    const { session, player, data, uid } = getState();
    const owner = data?.players?.[player]?.uid;
    if (session && player && owner && owner !== uid) {
        showToast('Der Name gehört gerade einem anderen Handy');
        switchTab('setup');
        return null;
    }
    if (session && player) return { id: session.id, player };
    showToast('Erst Session beitreten!');
    switchTab('setup');
    return null;
}

// Fehler beim Schreiben (z.B. offline/Regeln) sichtbar machen
const safe = fn => async (...args) => {
    try { return await fn(...args); }
    catch (err) {
        console.error(err);
        const denied = String(err?.code || err?.message || '').toUpperCase().includes('PERMISSION_DENIED');
        showToast(denied
            ? '⚠️ Keine Berechtigung – sind in Firebase die aktuellen Regeln eingefügt?'
            : '⚠️ Speichern fehlgeschlagen', 4000);
    }
};

const TAKEN_MESSAGE = 'Der Name gehört einem anderen Handy. Der Ersteller der Session kann ihn freigeben.';

const actions = {
    create: safe(async (name, config) => {
        if (!requireConfig()) return null;
        const uid = await ensureSignedIn();
        const id = await service.createSession(name, config, uid);
        setState({ session: { id, name }, data: null });
        connect(getState().session);
        showToast(`Session erstellt: ${id}`);
        return id;
    }),

    join: safe(async (id, player) => {
        if (!requireConfig()) return;
        if (!id)     return showToast('Session-ID eingeben!');
        if (!player) return showToast('Namen eingeben!');
        if (INVALID_KEY_CHARS.test(player)) return showToast('Name darf . # $ [ ] / nicht enthalten');

        const uid = await ensureSignedIn();
        const data = await service.fetchSession(id);
        if (!data) return showToast('Session nicht gefunden!');

        const result = await service.joinSession(id, player, uid);
        if (result === 'taken') return showToast(TAKEN_MESSAGE, 3500);
        const sameSession = getState().session?.id === id;
        setState({ session: { id, name: data.name }, player });
        if (!sameSession) connect(getState().session);
        showToast(`Willkommen, ${player}!`);
        switchTab('counter');
    }),

    selectPlayer: safe(async name => {
        const { session } = getState();
        if (!session) return;
        const uid = await ensureSignedIn();
        const result = await service.joinSession(session.id, name, uid);
        if (result === 'taken') return showToast(TAKEN_MESSAGE, 3500);
        setState({ player: name });
        showToast(`Eingeloggt als ${name}`);
        switchTab('counter');
    }),

    release: safe(async name => {
        const { session } = getState();
        if (!session) return;
        await service.releasePlayer(session.id, name);
        showToast(`${name} ist freigegeben`);
    }),

    leave() {
        connect(null);
        setState({ session: null, player: null, data: null });
        showToast('Session verlassen');
    },

    addDrink: safe(async drinkId => {
        const ctx = requirePlayer();
        if (ctx) await service.addDrink(ctx.id, ctx.player, drinkId);
    }),

    addCig: safe(async () => {
        const ctx = requirePlayer();
        if (ctx) await service.addCig(ctx.id, ctx.player);
    }),

    // Ein Getränk: das letzte davon; gemischt: das zuletzt eingetragene
    undoDrink: safe(async () => {
        const ctx = requirePlayer();
        if (!ctx) return;
        const session = readSession(getState().data);
        const main = session.mode === 'single' ? session.drinks[0] : null;
        const last = lastDrinkEvent(session.events, ctx.player, main?.id ?? null);
        if (!last) return showToast('Bereits bei 0!');
        await service.undoDrink(ctx.id, ctx.player, last);
        showToast(`${(DRINKS[last.drink] || DRINKS.beer).name} zurückgenommen`);
    }),

    undoCig: safe(async () => {
        const ctx = requirePlayer();
        if (!ctx) return;
        if (!(me()?.cigs > 0)) return showToast('Bereits bei 0!');
        await service.undoCig(ctx.id, ctx.player, events());
        showToast('Eine Kippe zurückgenommen');
    }),

    // type = null beendet die laufende Pause
    togglePause: safe(async type => {
        const ctx = requirePlayer();
        if (!ctx) return;
        const status = me()?.status || null;
        if (!type || status?.type === type) {
            await service.endPause(ctx.id, ctx.player, status);
            showToast('Willkommen zurück! 🍻');
        } else {
            await service.startPause(ctx.id, ctx.player, type, status);
            showToast(type === 'toilet' ? '🚽 Gute Sitzung!' : '🚬 Viel Spaß draußen!');
        }
    }),

    goToSetup: () => switchTab('setup'),

    // ── Spiele ──
    newGame: safe(async type => {
        const ctx = requirePlayer();
        if (!ctx) return;
        if (myGames().mine) return showToast('Du bist schon in einem Spiel');
        const gid = await gameService.createGame(ctx.id, type, ctx.player);
        openRoom(gid);
        switchTab('games');
    }),

    joinGame: safe(async gid => {
        const ctx = requirePlayer();
        if (!ctx) return;
        const { mine } = myGames();
        if (mine && mine.id !== gid) return showToast('Du bist schon in einem Spiel');
        if (!mine) await gameService.joinGame(ctx.id, gid, ctx.player);
        openRoom(gid);
        switchTab('games');
    }),

    leaveGame: safe(async gid => {
        const ctx = requirePlayer();
        if (!ctx) return;
        await gameService.leaveGame(ctx.id, gid, ctx.player);
        closeRoom();
        render();
    }),

    startGame: safe(async gid => {
        const ctx = requirePlayer();
        if (!ctx) return;
        const game = myGames().open.find(g => g.id === gid);
        if (!game) return showToast('Lobby nicht mehr offen');
        await gameService.startGame(ctx.id, gid, game.players);
    }),

    abortGame: safe(async gid => {
        const ctx = requirePlayer();
        if (ctx) await gameService.abortGame(ctx.id, gid);
    }),

    openGame(gid) {
        openRoom(gid);
        switchTab('games');
    },

    closeGame() {
        closeRoom();
        render();
    },

    makeMove: safe(async (gid, type) => {
        const ctx = requirePlayer();
        if (!ctx || !gid) return;
        const raw = getState().data?.games?.[gid];
        const { def, state } = computeGame(raw);
        if (!state || state.turn !== ctx.player) return;
        await gameService.addMove(ctx.id, gid, ctx.player, type, def.createMove(type, state, ctx.player));
    }),

    rematch: safe(async gid => {
        const type = getState().data?.games?.[gid]?.type;
        if (type) await actions.newGame(type);
    }),
};

const myGames = () => listGames(getState().data, getState().player);

// ── Start ────────────────────────────────────────────────────────
async function init() {
    $('#config-banner').hidden = isConfigured;

    $$('nav [data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('#dash-setup-btn').addEventListener('click', actions.goToSetup);
    $('#stats-setup-btn').addEventListener('click', actions.goToSetup);
    $('#games-setup-btn').addEventListener('click', actions.goToSetup);

    initSetupView(actions);
    initCounterView(actions);
    initDashboardView();
    initStatsView();
    initLegend(() => computeStats(getState().data).main);
    initGamesView(actions);
    initGameInvites(actions);
    document.addEventListener('games-changed', render);

    subscribe(render);
    document.addEventListener('goal-changed', render);
    startLiveTimers();

    restoreState();
    const { session, player } = getState();
    const invited = new URLSearchParams(location.search).get('s');
    switchTab(session && player && !invited ? 'counter' : 'setup');

    if (!isConfigured) return;
    try { await ensureSignedIn(); } catch { return; }
    if (session && (!invited || invited.toUpperCase() === session.id)) connect(session);
}

init();
