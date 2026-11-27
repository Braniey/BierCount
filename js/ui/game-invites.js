// Hinweis-Streifen unter der Navigation: offene Spiele, denen man beitreten
// kann. ✕ blendet eine Einladung auf diesem Gerät aus.

import { $, esc } from './dom.js';
import { GAMES } from '../games/engine.js';

const DISMISSED_KEY = 'bier_dismissed_games';

function dismissed() {
    try { return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]')); }
    catch { return new Set(); }
}

function dismiss(gid) {
    const set = dismissed();
    set.add(gid);
    try { sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...set])); } catch { /* egal */ }
}

// actions: { joinGame(gid) }
export function initGameInvites(actions) {
    $('#game-invites').addEventListener('click', e => {
        const join = e.target.closest('[data-join]');
        if (join) return actions.joinGame(join.dataset.join);
        const close = e.target.closest('[data-dismiss]');
        if (close) {
            dismiss(close.dataset.dismiss);
            close.closest('.invite').remove();
        }
    });
}

// invites: offene Lobbys ohne mich (listGames().invites)
export function renderGameInvites(invites) {
    const hidden = dismissed();
    const list = invites.filter(g => !hidden.has(g.id));
    const el = $('#game-invites');
    el.hidden = !list.length;
    el.innerHTML = list.map(g => {
        const def = GAMES[g.type];
        return `
          <div class="invite">
            <span>${def?.icon || '🎲'} <b>${esc(g.host)}</b> startet ${esc(def?.name || g.type)}</span>
            <button class="btn btn-primary" data-join="${g.id}">Mitspielen</button>
            <button class="invite-close" data-dismiss="${g.id}" aria-label="Ausblenden">✕</button>
          </div>`;
    }).join('');
}
