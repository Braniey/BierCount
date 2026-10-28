// Einstiegspunkt: verbindet Store, Firebase-Service und Views.

import { isConfigured } from './config/firebase-config.js';
import * as service from './services/session-service.js';
import { getState, setState, subscribe, restoreState, events, me } from './core/store.js';
import { computeStats } from './core/stats.js';
import { EVENT, BEERS_PER_CRATE, INVALID_KEY_CHARS, milestoneFor } from './core/constants.js';
import { $, $$, startLiveTimers } from './ui/dom.js';
import { showToast } from './ui/toast.js';
import { celebrate, confetti } from './ui/effects.js';
import { initSetupView, renderSetupView } from './ui/views/setup-view.js';
import { initCounterView, renderCounterView } from './ui/views/counter-view.js';
import { initDashboardView, renderDashboardView } from './ui/views/dashboard-view.js';
import { initStatsView, renderStatsView } from './ui/views/stats-view.js';

const VIEWS = {
    setup:     renderSetupView,
    counter:   renderCounterView,
    dashboard: renderDashboardView,
    stats:     renderStatsView,
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
    VIEWS[activeTab](state, computeStats(state.data));
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
    });
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
    for (const [key, e] of Object.entries(all)) {
        if (seenEvents.has(key)) continue;
        seenEvents.add(key);
        if (e.type !== EVENT.BEER) continue;

        const count = stats.byName[e.player]?.beers ?? 0;
        const text = milestoneFor(count);
        if (!text) continue;
        if (e.player === myName && count === 1) {
            showToast(`🍺 ${text}`);
            confetti({ count: 60, duration: 1500 });
        } else if (e.player === myName) {
            celebrate({ big: count, title: `${count}. Bier`, subtitle: text });
        } else if (count >= 5) {
            showToast(`🎉 ${e.player}: ${count}. Bier!`, 3000);
        }
    }

    if (stats.totals.crates > lastCrates) {
        celebrate({
            big: '📦',
            title: `Kasten Nr. ${stats.totals.crates} ist leer!`,
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

function requirePlayer() {
    const { session, player } = getState();
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
        showToast('⚠️ Speichern fehlgeschlagen');
    }
};

const actions = {
    create: safe(async name => {
        if (!requireConfig()) return null;
        const id = await service.createSession(name);
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

        const data = await service.fetchSession(id);
        if (!data) return showToast('Session nicht gefunden!');

        await service.joinSession(id, player);
        const sameSession = getState().session?.id === id;
        setState({ session: { id, name: data.name }, player });
        if (!sameSession) connect(getState().session);
        showToast(`Willkommen, ${player}!`);
        switchTab('counter');
    }),

    selectPlayer(name) {
        setState({ player: name });
        showToast(`Eingeloggt als ${name}`);
        switchTab('counter');
    },

    leave() {
        connect(null);
        setState({ session: null, player: null, data: null });
        showToast('Session verlassen');
    },

    addBeer: safe(async () => {
        const ctx = requirePlayer();
        if (ctx) await service.addBeer(ctx.id, ctx.player);
    }),

    addCig: safe(async () => {
        const ctx = requirePlayer();
        if (ctx) await service.addCig(ctx.id, ctx.player);
    }),

    undoBeer: safe(async () => {
        const ctx = requirePlayer();
        if (!ctx) return;
        if (!(me()?.count > 0)) return showToast('Bereits bei 0!');
        await service.undoLast(ctx.id, ctx.player, EVENT.BEER, events());
        showToast('Ein Bier zurückgenommen');
    }),

    undoCig: safe(async () => {
        const ctx = requirePlayer();
        if (!ctx) return;
        if (!(me()?.cigs > 0)) return showToast('Bereits bei 0!');
        await service.undoLast(ctx.id, ctx.player, EVENT.CIG, events());
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
};

// ── Start ────────────────────────────────────────────────────────
function init() {
    $('#config-banner').hidden = isConfigured;

    $$('nav [data-tab]').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('#dash-setup-btn').addEventListener('click', actions.goToSetup);
    $('#stats-setup-btn').addEventListener('click', actions.goToSetup);

    initSetupView(actions);
    initCounterView(actions);
    initDashboardView();
    initStatsView();

    subscribe(render);
    document.addEventListener('goal-changed', render);
    startLiveTimers();

    restoreState();
    const { session, player } = getState();
    const invited = new URLSearchParams(location.search).get('s');
    if (session && isConfigured && (!invited || invited.toUpperCase() === session.id)) {
        connect(session);
    }
    switchTab(session && player && !invited ? 'counter' : 'setup');
}

init();
