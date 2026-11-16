// Event-Typen, die in sessions/{id}/events gespeichert werden
export const EVENT = {
    DRINK:  'drink',    // { drink: <Getränke-id> }
    CIG:    'cig',
    TOILET: 'toilet',   // Pause mit ts (Start) + end
    SMOKE:  'smoke',    // Pause mit ts (Start) + end
};

// Pausen-Status, der unter players/{name}/status liegt
export const PAUSE = {
    toilet: { icon: '🚽', label: 'Klo-Pause',    active: 'auf Klo' },
    smoke:  { icon: '🚬', label: 'Raucherpause', active: 'beim Rauchen' },
};

// Getränke-Katalog. size in Litern; Bier hat keine feste Größe, die kommt
// aus der Session-Einstellung (beerSize). foam/bubbles steuern das Glas.
export const DRINKS = {
    beer:      { id: 'beer',      name: 'Bier',          icon: '🍺', size: null, color: '#f5a623', foam: true, bubbles: true,
                 acc: 'ein Bier',        first: 'Erstes Bier',      king: 'Bierkönig' },
    gluehwein: { id: 'gluehwein', name: 'Glühwein',      icon: '☕', size: 0.2,  color: '#9b1d2e', foam: false, bubbles: false,
                 acc: 'einen Glühwein',  first: 'Erster Glühwein',  king: 'Glühweinkönig' },
    aperol:    { id: 'aperol',    name: 'Aperol Spritz', icon: '🍹', size: 0.2,  color: '#ff6a13', foam: false, bubbles: true,
                 acc: 'einen Aperol',    first: 'Erster Aperol',    king: 'Aperolkönig' },
    wein:      { id: 'wein',      name: 'Wein',          icon: '🍷', size: 0.2,  color: '#7a1530', foam: false, bubbles: false,
                 acc: 'einen Wein',      first: 'Erster Wein',      king: 'Weinkönig' },
    sekt:      { id: 'sekt',      name: 'Sekt',          icon: '🥂', size: 0.1,  color: '#f1d97a', foam: false, bubbles: true,
                 acc: 'einen Sekt',      first: 'Erster Sekt',      king: 'Sektkönig' },
    schnaps:   { id: 'schnaps',   name: 'Schnaps',       icon: '🥃', size: 0.02, color: '#d9a35b', foam: false, bubbles: false,
                 acc: 'einen Schnaps',   first: 'Erster Schnaps',   king: 'Schnapskönig' },
    longdrink: { id: 'longdrink', name: 'Longdrink',     icon: '🍸', size: 0.3,  color: '#4fb3d9', foam: false, bubbles: true,
                 acc: 'einen Longdrink', first: 'Erster Longdrink', king: 'Longdrinkkönig' },
};
export const DRINK_ORDER = ['beer', 'gluehwein', 'aperol', 'wein', 'sekt', 'schnaps', 'longdrink'];

export const BEER_SIZES = [
    { size: 0.2, label: '0,2 l Glas' },
    { size: 0.3, label: '0,3 l Flasche' },
    { size: 0.5, label: '0,5 l Flasche' },
];
export const DEFAULT_BEER_SIZE = 0.2;

// Fässchen-Fortschritt gibt es nur beim reinen Bier-Abend
export const BEERS_PER_CRATE = 25;
export const CRATE_NAME = 'Fässchen';

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

// Sprüche, die nur zu Bier passen
const BEER_ONLY_MILESTONES = new Set([25]);

export function milestoneFor(count, drinkId = null) {
    if (count === 1 || (count > 0 && count % 5 === 0)) {
        if (BEER_ONLY_MILESTONES.has(count) && drinkId !== 'beer') return 'Unaufhaltsam';
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
export function badgesFor(drink) {
    const n = drink.name;
    return {
        earlyBird:  { icon: '🐣', title: 'Frühstarter',      desc: `${drink.first} des Abends` },
        sealBroken: { icon: '🔓', title: 'Siegel gebrochen', desc: 'Als Erstes aufs Klo' },
        hattrick:   { icon: '🎩', title: 'Hattrick',         desc: `3 ${n} innerhalb einer Stunde` },
        tenner:     { icon: '🔟', title: 'Zweistellig',      desc: `10 ${n} oder mehr` },
        steadfast:  { icon: '🚭', title: 'Standhaft',        desc: `Mindestens 3 ${n} und keine Kippe, obwohl andere rauchen` },
    };
}

// Titel des Abends – gehen an den Besten der Runde (Legende + stats.js)
export function awardsFor(drink) {
    const n = drink.name;
    return {
        king:        { icon: '👑', title: drink.king,            desc: 'Platz 1 der Rangliste' },
        fastest:     { icon: '⚡', title: 'Schnellster Trinker', desc: `Kürzeste Zeit pro ${n} (ab 3 ${n})` },
        chain:       { icon: '🚬', title: 'Kettenraucher',       desc: 'Die meisten Zigaretten' },
        toiletKing:  { icon: '🚽', title: 'Klo-König',           desc: 'Insgesamt am längsten auf Klo' },
        longest:     { icon: '🧻', title: 'Längste Sitzung',     desc: 'Längster einzelner Klogang' },
        ironBladder: { icon: '🫧', title: 'Eiserne Blase',       desc: `Die meisten ${n} pro Klogang (ab 4 ${n})` },
    };
}
