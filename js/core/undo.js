import { EVENT } from './constants.js';

// Das zuletzt eingetragene Getränk einer Person (drinkId = null: egal welches)
export function lastDrinkEvent(events, player, drinkId) {
    let last = null;
    for (const e of events) {
        if (e.type !== EVENT.DRINK || e.player !== player) continue;
        if (drinkId && e.drink !== drinkId) continue;
        if (!last || e.ts >= last.ts) last = e;
    }
    return last;
}
