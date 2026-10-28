import { $, esc, formatAgo, formatTimer } from '../dom.js';
import { createGlass } from '../glass.js';
import { bump, floatFrom, vibrate } from '../effects.js';
import { PAUSE } from '../../core/constants.js';

const GOAL_KEY = player => `bier_goal_${player}`;

let glass;
let lastCount = null;

// actions: { addBeer(), addCig(), undoBeer(), undoCig(), togglePause(type), goToSetup() }
export function initCounterView(actions) {
    glass = createGlass($('#my-glass'));
    glass.set(0, 10);

    $('#beer-btn').addEventListener('click', e => {
        actions.addBeer();
        floatFrom(e.currentTarget, '+1 🍺');
        glass.slosh();
        vibrate(30);
    });
    $('#cig-btn').addEventListener('click', e => {
        actions.addCig();
        floatFrom(e.currentTarget, '+1 🚬');
        vibrate(20);
    });
    $('#toilet-btn').addEventListener('click', () => { actions.togglePause('toilet'); vibrate(20); });
    $('#smoke-btn').addEventListener('click',  () => { actions.togglePause('smoke');  vibrate(20); });
    $('#pause-end-btn').addEventListener('click', () => actions.togglePause(null));
    $('#undo-beer-btn').addEventListener('click', actions.undoBeer);
    $('#undo-cig-btn').addEventListener('click', actions.undoCig);
    $('#counter-setup-btn').addEventListener('click', actions.goToSetup);

    $('#goal-input').addEventListener('change', e => {
        const goal = Math.max(1, parseInt(e.target.value, 10) || 10);
        e.target.value = goal;
        try { localStorage.setItem(GOAL_KEY($('#goal-input').dataset.player), goal); } catch { /* egal */ }
        lastCount = null; // neu zeichnen erzwingen
        document.dispatchEvent(new Event('goal-changed'));
    });
}

export function renderCounterView(state, stats) {
    const me = state.player && stats.byName[state.player];
    $('#counter-empty').hidden = !!me;
    $('#counter-main').hidden = !me;
    if (!me) return;

    $('#c-session-name').textContent = state.data?.name || state.session.name;
    $('#c-username').textContent = me.name;

    const goalInput = $('#goal-input');
    if (goalInput.dataset.player !== me.name) {
        goalInput.dataset.player = me.name;
        let saved = null;
        try { saved = localStorage.getItem(GOAL_KEY(me.name)); } catch { /* egal */ }
        goalInput.value = saved || 10;
    }
    const goal = parseInt(goalInput.value, 10) || 10;

    // Bier
    const countEl = $('#my-count');
    if (me.beers !== lastCount) {
        countEl.textContent = me.beers;
        if (lastCount !== null && me.beers > lastCount) bump(countEl);
        glass.set(me.beers, goal);
        lastCount = me.beers;
    }
    $('#my-cigs').textContent = me.cigs;

    const pace = [];
    if (me.avgIntervalMin >= 1) pace.push(`Ø ${Math.round(me.avgIntervalMin)} min pro Bier`);
    if (me.lastBeer) pace.push(`letztes <span data-ago="${me.lastBeer}">${formatAgo(me.lastBeer)}</span>`);
    $('#my-pace').innerHTML = pace.join(' · ');

    renderGoal(me.beers, goal);
    renderPause(me.status);

    $('#my-badges').innerHTML = me.badges.map(b =>
        `<span class="badge" title="${esc(b.desc)}">${b.icon} ${esc(b.title)}</span>`
    ).join('');
}

function renderGoal(count, goal) {
    const el = $('#goal-progress');
    const pct = Math.min(count / goal, 1);
    $('#goal-bar').style.setProperty('--pct', pct);
    if (count >= goal) el.innerHTML = '🎉 Ziel erreicht!';
    else el.innerHTML = `<b>${count}</b> von <b>${goal}</b> · noch ${goal - count}`;
}

function renderPause(status) {
    const banner = $('#pause-banner');
    const active = status && PAUSE[status.type];
    banner.hidden = !active;
    document.body.classList.toggle('on-pause', !!active);

    for (const type of Object.keys(PAUSE)) {
        const btn = $(`#${type}-btn`);
        const on = status?.type === type;
        btn.classList.toggle('active', on);
        btn.querySelector('.action-sub').innerHTML = on
            ? `läuft · <span data-since="${status.since}">${formatTimer(Date.now() - status.since)}</span>`
            : (type === 'smoke' ? 'starten (+1 🚬)' : 'starten');
    }

    if (!active) return;
    banner.dataset.type = status.type;
    $('#pause-icon').textContent = active.icon;
    $('#pause-text').textContent = `Du bist ${active.active}`;
    $('#pause-timer').dataset.since = status.since;
    $('#pause-timer').textContent = formatTimer(Date.now() - status.since);
}
