// Minimaler App-State mit Abonnenten. Die Views lesen nur von hier
// und rendern neu, wenn sich etwas ändert.

const STORAGE_SESSION = 'bier_session';
const STORAGE_USER    = 'bier_user';

const state = {
    session: null,  // { id, name }
    player:  null,  // Name des eigenen Spielers
    data:    null,  // Roh-Snapshot von sessions/{id}
};

const listeners = new Set();

export function getState() {
    return state;
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function setState(patch) {
    Object.assign(state, patch);
    if ('session' in patch) persist(STORAGE_SESSION, state.session && JSON.stringify(state.session));
    if ('player' in patch)  persist(STORAGE_USER, state.player);
    listeners.forEach(fn => fn(state));
}

export function restoreState() {
    try {
        const session = localStorage.getItem(STORAGE_SESSION);
        state.session = session ? JSON.parse(session) : null;
        state.player  = localStorage.getItem(STORAGE_USER);
    } catch {
        // localStorage nicht verfügbar (z.B. privater Modus) – dann eben ohne
    }
}

function persist(key, value) {
    try {
        if (value) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
    } catch { /* ignorieren */ }
}

// Bequeme Selektoren
export const players = () => state.data?.players || {};
export const events  = () => state.data?.events  || {};
export const me      = () => (state.player && players()[state.player]) || null;
