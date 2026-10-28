// Event-Typen, die in sessions/{id}/events gespeichert werden
export const EVENT = {
    BEER:   'beer',
    CIG:    'cig',
    TOILET: 'toilet',   // Pause mit ts (Start) + end
    SMOKE:  'smoke',    // Pause mit ts (Start) + end
};

// Pausen-Status, der unter players/{name}/status liegt
export const PAUSE = {
    toilet: { icon: '🚽', label: 'Klo-Pause',    active: 'auf Klo' },
    smoke:  { icon: '🚬', label: 'Raucherpause', active: 'beim Rauchen' },
};

export const LITERS_PER_BEER = 0.2;
export const BEERS_PER_CRATE = 25;

// Persönliche Meilensteine: jede 5er-Marke, mit Sprüchen für die besonderen
const MILESTONE_TEXT = {
    1:  'Der Abend beginnt!',
    5:  'Warmgetrunken',
    10: 'Zweistellig!',
    15: 'Ist i.O.',
    20: 'Stabil!',
    25: 'Fässchen geschafft',
    30: 'Auch mal an Suchtberatung gedacht?',
};

export function milestoneFor(count) {
    if (count === 1 || (count > 0 && count % 5 === 0)) {
        return MILESTONE_TEXT[count] || 'Unaufhaltsam';
    }
    return null;
}

// Kategoriale Farben (eine pro Person, nach Beitrittsreihenfolge, nie nach Rang)
export const SERIES_COLORS = [
    '#3987e5', '#d95926', '#199e70', '#c98500',
    '#d55181', '#008300', '#9085e9', '#e66767',
];

// Erlaubte Namen: Firebase-Keys dürfen . # $ [ ] / nicht enthalten
export const INVALID_KEY_CHARS = /[.#$[\]/]/;
