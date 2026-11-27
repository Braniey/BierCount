// Würfelduell: Reihum würfelt jeder einmal. Der Niedrigste trinkt.
// Gleichstand ganz unten → die Betroffenen stechen, jede Stechrunde +1 Schluck.

import { rollDice } from './random.js';

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
};
