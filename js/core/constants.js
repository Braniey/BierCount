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

// Persönliche Abzeichen – jeder kann sie verdienen (Legende + stats.js)
export const BADGES = {
    earlyBird: { icon: '🐣', title: 'Frühstarter',      desc: 'Erstes Bier des Abends' },
    sealBroken:{ icon: '🔓', title: 'Siegel gebrochen', desc: 'Als Erstes aufs Klo' },
    hattrick:  { icon: '🎩', title: 'Hattrick',         desc: '3 Bier innerhalb einer Stunde' },
    tenner:    { icon: '🔟', title: 'Zweistellig',      desc: '10 Bier oder mehr' },
    steadfast: { icon: '🚭', title: 'Standhaft',        desc: 'Mindestens 3 Bier und keine Kippe, obwohl andere rauchen' },
};

// Titel des Abends – gehen an den Besten der Runde (Legende + stats.js)
export const AWARDS = {
    beerKing:   { icon: '👑', title: 'Bierkönig',           desc: 'Platz 1 der Rangliste' },
    fastest:    { icon: '⚡', title: 'Schnellster Trinker', desc: 'Kürzeste Zeit pro Bier (ab 3 Bier)' },
    chain:      { icon: '🚬', title: 'Kettenraucher',       desc: 'Die meisten Zigaretten' },
    toiletKing: { icon: '🚽', title: 'Klo-König',           desc: 'Insgesamt am längsten auf Klo' },
    longest:    { icon: '🧻', title: 'Längste Sitzung',     desc: 'Längster einzelner Klogang' },
    ironBladder:{ icon: '🫧', title: 'Eiserne Blase',       desc: 'Die meisten Bier pro Klogang (ab 4 Bier)' },
};
