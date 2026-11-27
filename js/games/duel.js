// Würfelduell: Reihum würfelt jeder einmal. Der Niedrigste trinkt.
// Gleichstand ganz unten → die Betroffenen stechen, jede Stechrunde +1 Schluck.

import { rollDice } from './random.js';
import { dieSvg } from './dice.js';

const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

// Welche Würfe schon angezeigt wurden, damit nur neue animiert werden
let shown = '';
const rollKey = state => `${state.round}:${JSON.stringify(state.rolls)}`;

export const duel = {
    id: 'duel',
    name: 'Würfelduell',
    icon: '🎲',
    minPlayers: 2,
    maxPlayers: 10,
    howTo: 'Reihum würfelt jeder einmal. Wer die niedrigste Zahl hat, trinkt einen Schluck. '
        + 'Bei Gleichstand ganz unten wird gestochen – jede Stechrunde ist einen Schluck mehr wert.',

    init(order) {
        return {
            round: 1,
            stake: 1,
            contenders: [...order],
            rolls: {},
            history: [],
            turn: order[0] ?? null,
            finished: false,
            drinks: [],
        };
    },

    apply(state, move) {
        const value = move.data?.value;
        if (state.finished || move.type !== 'roll' || move.player !== state.turn) return state;
        if (!Number.isInteger(value) || value < 1 || value > 6) return state;

        const next = structuredClone(state);
        next.rolls[move.player] = value;

        const waiting = next.contenders.filter(p => !(p in next.rolls));
        if (waiting.length) {
            next.turn = waiting[0];
            return next;
        }

        // Alle haben gewürfelt: wer liegt ganz unten?
        const low = Math.min(...Object.values(next.rolls));
        const losers = next.contenders.filter(p => next.rolls[p] === low);
        next.history.push({ round: next.round, rolls: next.rolls });

        if (losers.length === 1) {
            next.drinks.push({
                player: losers[0],
                sips: next.stake,
                reason: next.round === 1 ? 'Niedrigster Wurf' : 'Verloren im Stechen',
                key: move.key,
            });
            next.finished = true;
            next.turn = null;
        } else {
            next.round += 1;
            next.stake += 1;
            next.contenders = losers;
            next.rolls = {};
            next.turn = losers[0];
        }
        return next;
    },

    createMove(type) {
        return type === 'roll' ? { value: rollDice(1)[0] } : null;
    },

    // Spielfeld für alle (auch Beamer): Würfe der aktuellen Runde
    renderTable(el, state) {
        const key = rollKey(state);
        const before = shown.startsWith(`${state.round}:`) ? JSON.parse(shown.slice(shown.indexOf(':') + 1)) : {};
        shown = key;

        const last = state.history.at(-1);
        // Nach dem Ende die Würfe der letzten Runde zeigen
        const rolls = state.finished ? last.rolls : state.rolls;
        const players = state.finished ? Object.keys(last.rolls) : state.contenders;
        const loser = state.finished ? state.drinks.at(-1)?.player : null;

        const head = state.finished
            ? `<b>${esc(loser)}</b> trinkt ${state.stake} ${state.stake === 1 ? 'Schluck' : 'Schlücke'}`
            : state.round === 1
                ? `<b>${esc(state.turn)}</b> ist dran`
                : `Stechen! Runde ${state.round} · Einsatz ${state.stake} Schlücke · <b>${esc(state.turn)}</b> ist dran`;

        el.innerHTML = `
          <div class="duel-head">${head}</div>
          <div class="duel-grid">
            ${players.map(p => `
              <div class="duel-player ${p === state.turn ? 'is-turn' : ''} ${p === loser ? 'is-loser' : ''}">
                ${dieSvg(rolls[p] ?? null, { fresh: rolls[p] != null && before[p] == null })}
                <div class="duel-name">${esc(p)}</div>
              </div>`).join('')}
          </div>
          ${state.history.length > (state.finished ? 1 : 0) ? `
            <div class="duel-history">
              ${state.history.slice(0, state.finished ? -1 : undefined).map(h => `
                <div>Runde ${h.round}: ${Object.entries(h.rolls).map(([p, v]) => `${esc(p)} ${v}`).join(' · ')}</div>`).join('')}
            </div>` : ''}`;
    },

    // Eigener Bereich auf dem Handy: Würfeln, wenn ich dran bin
    renderPhone(el, state, me, makeMove) {
        const mine = state.rolls[me] ?? (state.finished ? state.history.at(-1).rolls[me] : null);
        const inRound = state.contenders.includes(me);
        let text;
        if (state.finished) text = state.drinks.at(-1)?.player === me ? 'Verloren – Prost!' : 'Glück gehabt!';
        else if (state.turn === me) text = state.round === 1 ? 'Du bist dran!' : 'Du musst stechen!';
        else if (!inRound) text = 'Du bist sicher – die anderen stechen.';
        else if (mine != null) text = `Warte auf ${esc(state.turn)} …`;
        else text = `${esc(state.turn)} ist dran …`;

        el.innerHTML = `
          <div class="phone-die">${dieSvg(inRound || state.finished ? mine : null)}</div>
          <div class="phone-text">${text}</div>
          ${state.turn === me ? '<button class="btn btn-primary btn-roll" data-move="roll">🎲 Würfeln</button>' : ''}`;
        el.querySelector('[data-move]')?.addEventListener('click', e => {
            e.currentTarget.disabled = true;
            makeMove('roll');
        });
    },
};
