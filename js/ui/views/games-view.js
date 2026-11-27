// Reiter „Spiele“: Übersicht (neues Spiel, offene Lobbys, laufende Spiele)
// und der Spielraum (Lobby bzw. Spielfeld + eigener Bereich + Trink-Liste).

import { $, esc } from '../dom.js';
import { GAMES, GAME_ORDER, computeGame } from '../../games/engine.js';
import { sipsText } from '../drink-alert.js';
import { toggleBeamer } from '../beamer.js';

let roomId = null;      // geöffnetes Spiel (bleibt offen, auch wenn es endet)
let choosing = false;   // Auswahl „Neues Spiel“ aufgeklappt

export const openRoom = gid => { roomId = gid; choosing = false; };
export const closeRoom = () => { roomId = null; };
export const currentRoom = () => roomId;

// actions: newGame(type), joinGame(gid), leaveGame(gid), startGame(gid),
// abortGame(gid), openGame(gid), closeGame(), makeMove(gid, type), rematch(gid)
export function initGamesView(actions) {
    $('#games-view').addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const { act, gid, type } = btn.dataset;
        switch (act) {
            case 'choose':  choosing = !choosing; document.dispatchEvent(new Event('games-changed')); break;
            case 'new':     actions.newGame(type); break;
            case 'join':    actions.joinGame(gid); break;
            case 'leave':   actions.leaveGame(gid); break;
            case 'start':   actions.startGame(gid); break;
            case 'abort':   if (confirm('Spiel wirklich abbrechen?')) actions.abortGame(gid); break;
            case 'open':    actions.openGame(gid); break;
            case 'close':   actions.closeGame(); break;
            case 'rematch': actions.rematch(gid); break;
            case 'beamer':  toggleBeamer(); break;
        }
    });
}

// games: Ergebnis von listGames; makeMove(type) für das offene Spiel
export function renderGamesView(state, games, makeMove) {
    const hasPlayer = !!state.session && !!state.player;
    $('#games-empty').hidden = hasPlayer;
    $('#games-list').hidden = !hasPlayer || !!roomId;
    $('#game-room').hidden = !hasPlayer || !roomId;
    if (!hasPlayer) return;

    if (roomId) {
        const raw = state.data?.games?.[roomId];
        if (!raw) { roomId = null; return renderGamesView(state, games, makeMove); }
        renderRoom({ id: roomId, ...raw }, state.player, games, makeMove);
    } else {
        renderList(games, state.player);
    }
}

// ── Übersicht ────────────────────────────────────────────────
function renderList(games, me) {
    const busy = games.mine;
    $('#games-busy').hidden = !busy;
    if (busy) {
        $('#games-busy').innerHTML = `
          Du spielst gerade <b>${esc(GAMES[busy.type]?.name || busy.type)}</b>.
          <button class="btn btn-primary" data-act="open" data-gid="${busy.id}">Öffnen</button>`;
    }

    $('#new-game-btn').disabled = !!busy;
    $('#game-chooser').hidden = !choosing || !!busy;
    $('#game-chooser').innerHTML = GAME_ORDER.map(id => {
        const g = GAMES[id];
        return `
          <div class="game-choice">
            <div class="game-choice-icon">${g.icon}</div>
            <div class="game-choice-text">
              <div class="game-choice-name">${esc(g.name)} <small>${g.minPlayers}–${g.maxPlayers} Spieler</small></div>
              <div class="muted small">${esc(g.howTo)}</div>
            </div>
            <button class="btn btn-primary" data-act="new" data-type="${id}">Starten</button>
          </div>`;
    }).join('');

    const row = (g, button) => `
      <div class="game-row">
        <span class="game-row-icon">${GAMES[g.type]?.icon || '🎲'}</span>
        <div class="game-row-text">
          <div><b>${esc(GAMES[g.type]?.name || g.type)}</b> · Host ${esc(g.host)}</div>
          <div class="muted small">${g.players.map(esc).join(', ')}</div>
        </div>
        ${button}
      </div>`;

    $('#games-open').innerHTML = games.open.length
        ? games.open.map(g => row(g, g.players.includes(me)
            ? `<button class="btn btn-primary" data-act="open" data-gid="${g.id}">Öffnen</button>`
            : `<button class="btn btn-primary" data-act="join" data-gid="${g.id}" ${busy || full(g) ? 'disabled' : ''}>${full(g) ? 'Voll' : 'Beitreten'}</button>`)).join('')
        : '<div class="muted small">Keine offenen Spiele.</div>';

    $('#games-running').innerHTML = games.running.length
        ? games.running.map(g => row(g, `<button class="btn btn-ghost" data-act="open" data-gid="${g.id}">${g.players.includes(me) ? 'Öffnen' : 'Zuschauen'}</button>`)).join('')
        : '<div class="muted small">Gerade läuft nichts.</div>';
}

const full = g => g.players.length >= (GAMES[g.type]?.maxPlayers ?? Infinity);

// ── Spielraum ────────────────────────────────────────────────
function renderRoom(raw, me, games, makeMove) {
    const def = GAMES[raw.type];
    const { state, order } = computeGame(raw);
    const lobbyPlayers = games.open.find(g => g.id === raw.id)?.players
        || Object.keys(raw.players || {});
    const isHost = raw.host === me;
    const playing = order.includes(me);

    $('#room-title').textContent = `${def?.icon || '🎲'} ${def?.name || raw.type}`;

    // Lobby
    const inLobby = raw.status === 'lobby';
    $('#room-lobby').hidden = !inLobby;
    if (inLobby) {
        const enough = lobbyPlayers.length >= (def?.minPlayers ?? 2);
        $('#room-lobby').innerHTML = `
          <p class="muted">${esc(def?.howTo || '')}</p>
          <div class="field-label">Dabei (${lobbyPlayers.length}/${def?.maxPlayers ?? '∞'})</div>
          <ul class="lobby-players">${lobbyPlayers.map(p => `<li>${esc(p)}${p === raw.host ? ' 👑' : ''}</li>`).join('')}</ul>
          ${isHost
            ? `<button class="btn btn-primary btn-block" data-act="start" data-gid="${raw.id}" ${enough ? '' : 'disabled'}>
                 ${enough ? 'Runde starten' : `Warte auf Mitspieler (mind. ${def?.minPlayers})`}</button>
               <button class="btn btn-link" data-act="abort" data-gid="${raw.id}">Spiel abbrechen</button>`
            : lobbyPlayers.includes(me)
              ? `<p class="muted">Warte, bis ${esc(raw.host)} die Runde startet …</p>
                 <button class="btn btn-link" data-act="leave" data-gid="${raw.id}">Austreten</button>`
              : `<button class="btn btn-primary btn-block" data-act="join" data-gid="${raw.id}" ${games.mine ? 'disabled' : ''}>Beitreten</button>`}`;
    }

    // Spiel läuft oder ist vorbei
    const showGame = !!state && raw.status !== 'aborted';
    $('#room-game').hidden = !showGame;
    $('#room-aborted').hidden = raw.status !== 'aborted';
    if (showGame) {
        def.renderTable($('#room-table'), state);

        const drinks = [...state.drinks].reverse();
        $('#room-drinks-card').hidden = !drinks.length;
        $('#room-drinks').innerHTML = drinks.map(d => `
          <li class="${d.player === me ? 'is-me' : ''}"><b>${esc(d.player)}</b> · ${sipsText(d.sips)} <span class="muted">– ${esc(d.reason)}</span></li>`).join('');

        $('#room-phone').hidden = !playing;
        if (playing) def.renderPhone($('#room-phone'), state, me, makeMove);
    }

    const over = state?.finished || raw.status === 'finished' || raw.status === 'aborted';
    $('#room-end').hidden = !over;
    if (over) {
        $('#room-end').innerHTML = `
          ${isHost ? `<button class="btn btn-primary" data-act="rematch" data-gid="${raw.id}" ${games.mine ? 'disabled' : ''}>🔁 Revanche</button>` : ''}
          <button class="btn btn-ghost" data-act="close">Schließen</button>`;
    }
}
