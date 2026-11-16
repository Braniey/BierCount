import { $, $$, esc, formatAgo, formatTimer } from '../dom.js';
import { createGlass } from '../glass.js';
import { bump, floatFrom, vibrate } from '../effects.js';
import { PAUSE } from '../../core/constants.js';

const GOAL_KEY = player => `bier_goal_${player}`;

let glass;
let lastCount = null;
let lastDrinkId = null;
let main = null;       // Getränk des Abends (null = gemischt)
let gridKey = '';      // welche Getränke gerade als Kacheln stehen

// actions: { addDrink(id), undoDrink(), addCig(), undoCig(), togglePause(type), goToSetup() }
export function initCounterView(actions) {
    glass = createGlass($('#my-glass'));
    glass.set(0, 10);

    $('#drink-btn').addEventListener('click', e => {
        if (!main) return;
        actions.addDrink(main.id);
        floatFrom(e.currentTarget, `+1 ${main.icon}`);
        glass.slosh();
        vibrate(30);
    });
    $('#drink-grid').addEventListener('click', e => {
        const tile = e.target.closest('[data-drink]');
        if (!tile) return;
        actions.addDrink(tile.dataset.drink);
        floatFrom(tile, `+1 ${tile.dataset.icon}`);
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
    $('#undo-drink-btn').addEventListener('click', actions.undoDrink);
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
    $('#my-cigs').textContent = me.cigs;
    renderPause(me.status);

    main = stats.main;
    $('#counter-single').hidden = !main;
    $('#counter-mixed').hidden = !!main;
    $('#goal-card').hidden = !main;
    $('#counter-badges').hidden = !main;

    if (main) renderSingle(me, main);
    else renderMixed(me, stats.drinks);
}

function renderSingle(me, drink) {
    $('#my-count-label').textContent = `${drink.name} getrunken`;
    $('#drink-btn').textContent = `+ ${drink.name}`;
    $('#undo-drink-btn').textContent = `− 1 ${drink.name}`;
    $('#goal-unit').textContent = drink.name;

    const goalInput = $('#goal-input');
    if (goalInput.dataset.player !== me.name) {
        goalInput.dataset.player = me.name;
        let saved = null;
        try { saved = localStorage.getItem(GOAL_KEY(me.name)); } catch { /* egal */ }
        goalInput.value = saved || 10;
    }
    const goal = parseInt(goalInput.value, 10) || 10;

    const countEl = $('#my-count');
    if (me.count !== lastCount || drink.id !== lastDrinkId) {
        countEl.textContent = me.count;
        if (lastCount !== null && drink.id === lastDrinkId && me.count > lastCount) bump(countEl);
        glass.set(me.count, goal, drink);
        lastCount = me.count;
        lastDrinkId = drink.id;
    }

    const pace = [];
    if (me.avgIntervalMin >= 1) pace.push(`Ø ${Math.round(me.avgIntervalMin)} min pro ${esc(drink.name)}`);
    if (me.lastDrinkAt) pace.push(`zuletzt <span data-ago="${me.lastDrinkAt}">${formatAgo(me.lastDrinkAt)}</span>`);
    $('#my-pace').innerHTML = pace.join(' · ');

    renderGoal(me.count, goal);

    $('#my-badges').innerHTML = me.badges.map(b =>
        `<span class="badge" title="${esc(b.desc)}">${b.icon} ${esc(b.title)}</span>`
    ).join('');
}

function renderMixed(me, drinks) {
    $('#undo-drink-btn').textContent = '↶ Letztes Getränk zurück';

    const totalEl = $('#mixed-total');
    if (totalEl.textContent !== String(me.count)) {
        if (totalEl.textContent && me.count > Number(totalEl.textContent)) bump(totalEl);
        totalEl.textContent = me.count;
    }
    $('#mixed-breakdown').textContent = drinks
        .filter(d => me.drinks[d.id])
        .map(d => `${d.icon} ${me.drinks[d.id]}`)
        .join(' · ');

    // Kacheln nur neu aufbauen, wenn sich die Getränkeliste ändert
    const key = drinks.map(d => d.id).join(',');
    if (key !== gridKey) {
        gridKey = key;
        $('#drink-grid').innerHTML = drinks.map(d => `
          <button class="drink-tile" data-drink="${d.id}" data-icon="${d.icon}" style="--drink-color:${d.color}">
            <span class="drink-tile-icon">${d.icon}</span>
            <span class="drink-tile-name">${esc(d.name)}</span>
            <span class="drink-tile-count">0</span>
          </button>`).join('');
    }
    $$('#drink-grid [data-drink]').forEach(tile => {
        const countEl = tile.querySelector('.drink-tile-count');
        const n = me.drinks[tile.dataset.drink] || 0;
        if (countEl.textContent === String(n)) return;
        if (n > Number(countEl.textContent)) bump(countEl);
        countEl.textContent = n;
    });
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
