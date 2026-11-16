import { $, $$, esc } from '../dom.js';
import { showToast } from '../toast.js';
import { DRINKS, DRINK_ORDER, BEER_SIZES, DEFAULT_BEER_SIZE } from '../../core/constants.js';

// Auswahl für eine neue Session
const choice = {
    mode: 'single',
    drinks: new Set(['beer']),
    beerSize: DEFAULT_BEER_SIZE,
};

// actions: { create(name, config), join(id, player), selectPlayer(name), leave() }
export function initSetupView(actions) {
    const params = new URLSearchParams(location.search);
    if (params.get('s')) $('#join-id').value = params.get('s').toUpperCase();

    $('#drink-choice').innerHTML = DRINK_ORDER.map(id => `
      <button type="button" class="chip" data-drink="${id}">${DRINKS[id].icon} ${esc(DRINKS[id].name)}</button>`).join('');
    $('#beer-size-choice').innerHTML = BEER_SIZES.map(({ size, label }) => `
      <button type="button" class="chip" data-size="${size}">${esc(label)}</button>`).join('');

    $('#mode-switch').addEventListener('click', e => {
        const btn = e.target.closest('[data-mode]');
        if (!btn || btn.dataset.mode === choice.mode) return;
        choice.mode = btn.dataset.mode;
        // Gemischt: erstmal alles an; Ein Getränk: das erste bisher gewählte
        choice.drinks = choice.mode === 'mixed'
            ? new Set(DRINK_ORDER)
            : new Set([DRINK_ORDER.find(id => choice.drinks.has(id)) || 'beer']);
        renderChoice();
    });

    $('#drink-choice').addEventListener('click', e => {
        const id = e.target.closest('[data-drink]')?.dataset.drink;
        if (!id) return;
        if (choice.mode === 'single') choice.drinks = new Set([id]);
        else if (choice.drinks.has(id)) choice.drinks.delete(id);
        else choice.drinks.add(id);
        renderChoice();
    });

    $('#beer-size-choice').addEventListener('click', e => {
        const size = e.target.closest('[data-size]')?.dataset.size;
        if (!size) return;
        choice.beerSize = Number(size);
        renderChoice();
    });

    renderChoice();

    $('#create-btn').addEventListener('click', async () => {
        const name = $('#create-name').value.trim();
        if (!name) return showToast('Session-Name eingeben!');
        if (!choice.drinks.size) return showToast('Mindestens ein Getränk wählen!');
        const id = await actions.create(name, {
            mode: choice.mode,
            drinks: DRINK_ORDER.filter(d => choice.drinks.has(d)),
            beerSize: choice.beerSize,
        });
        if (id) {
            $('#join-id').value = id;
            $('#join-player').focus();
        }
    });

    $('#join-btn').addEventListener('click', () => {
        actions.join($('#join-id').value.trim().toUpperCase(), $('#join-player').value.trim());
    });

    for (const input of ['#join-id', '#join-player']) {
        $(input).addEventListener('keydown', e => {
            if (e.key === 'Enter') $('#join-btn').click();
        });
    }

    $('#copy-id-btn').addEventListener('click', () => {
        const id = $('#current-id').textContent;
        navigator.clipboard?.writeText(id).then(() => showToast('ID kopiert!'));
    });

    $('#share-btn').addEventListener('click', async () => {
        const id = $('#current-id').textContent;
        const url = `${location.origin}${location.pathname}?s=${id}`;
        if (navigator.share) {
            try { await navigator.share({ title: 'Bier Counter', text: `Komm in die Session ${id}! 🍺`, url }); }
            catch { /* abgebrochen */ }
        } else {
            navigator.clipboard?.writeText(url).then(() => showToast('Link kopiert!'));
        }
    });

    $('#leave-btn').addEventListener('click', () => {
        if (confirm('Session wirklich verlassen? (Deine Biere bleiben gespeichert)')) actions.leave();
    });

    $('#player-list').addEventListener('click', e => {
        const item = e.target.closest('[data-player]');
        if (item) actions.selectPlayer(item.dataset.player);
    });
}

function renderChoice() {
    $$('#mode-switch [data-mode]').forEach(b => b.setAttribute('aria-checked', b.dataset.mode === choice.mode));
    $$('#drink-choice [data-drink]').forEach(b => b.classList.toggle('on', choice.drinks.has(b.dataset.drink)));
    $$('#beer-size-choice [data-size]').forEach(b => b.classList.toggle('on', Number(b.dataset.size) === choice.beerSize));
    $('#beer-size-field').hidden = !choice.drinks.has('beer');
    $('#mode-hint').textContent = choice.mode === 'single'
        ? 'Mit Rangliste, Titeln und Abzeichen.'
        : 'Ohne Wertung – nur Übersicht, wer was getrunken hat.';
}

export function renderSetupView(state, stats) {
    const box = $('#current-session');
    box.hidden = !state.session;
    if (!state.session) return;

    $('#current-id').textContent = state.session.id;
    $('#current-name').textContent = state.data?.name || state.session.name;
    $('#current-drinks').textContent = !state.data ? ''
        : stats.main ? `${stats.main.icon} ${stats.main.name}-Abend`
        : `Gemischt: ${stats.drinks.map(d => d.icon).join(' ')}`;
    if (!$('#join-id').value) $('#join-id').value = state.session.id;
    if (!$('#join-player').value && state.player) $('#join-player').value = state.player;

    const list = stats.players;
    $('#player-list').innerHTML = list.length
        ? list.map(p => `
            <button class="player-pick ${p.name === state.player ? 'is-me' : ''}" data-player="${esc(p.name)}">
              <span class="dot" style="background:${p.color}"></span>
              <span class="pick-name">${esc(p.name)}</span>
              <span class="pick-count">${stats.main ? `${p.count} ${stats.main.icon}` : `${p.count} Getränke`} · ${p.cigs} 🚬</span>
            </button>`).join('')
        : '<div class="muted small">Noch niemand drin – trag dich oben ein.</div>';
}
