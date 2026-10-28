import { $, esc } from '../dom.js';
import { showToast } from '../toast.js';

// actions: { create(name), join(id, player), selectPlayer(name), leave() }
export function initSetupView(actions) {
    const params = new URLSearchParams(location.search);
    if (params.get('s')) $('#join-id').value = params.get('s').toUpperCase();

    $('#create-btn').addEventListener('click', async () => {
        const name = $('#create-name').value.trim();
        if (!name) return showToast('Session-Name eingeben!');
        const id = await actions.create(name);
        if (id) {
            $('#join-id').value = id;
            $('#join-player').focus();
        }
    });

    $('#join-btn').addEventListener('click', () => {
        actions.join($('#join-id').value.trim().toUpperCase(), $('#join-player').value.trim());
    });

    for (const input of ['#create-name', '#join-id', '#join-player']) {
        $(input).addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            (input === '#create-name' ? $('#create-btn') : $('#join-btn')).click();
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

export function renderSetupView(state, stats) {
    const box = $('#current-session');
    box.hidden = !state.session;
    if (!state.session) return;

    $('#current-id').textContent = state.session.id;
    $('#current-name').textContent = state.data?.name || state.session.name;
    if (!$('#join-id').value) $('#join-id').value = state.session.id;
    if (!$('#join-player').value && state.player) $('#join-player').value = state.player;

    const list = stats.players;
    $('#player-list').innerHTML = list.length
        ? list.map(p => `
            <button class="player-pick ${p.name === state.player ? 'is-me' : ''}" data-player="${esc(p.name)}">
              <span class="dot" style="background:${p.color}"></span>
              <span class="pick-name">${esc(p.name)}</span>
              <span class="pick-count">${p.beers} 🍺 · ${p.cigs} 🚬</span>
            </button>`).join('')
        : '<div class="muted small">Noch niemand drin – trag dich oben ein.</div>';
}
