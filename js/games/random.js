// Zufall für Spiele.
// - rollDice: echter Zufall auf dem Gerät, das würfelt (Ergebnis landet im Zug)
// - seededRandom: reproduzierbar aus dem Seed des Spiels, damit alle Geräte
//   z. B. dasselbe gemischte Kartendeck sehen

export function rollDice(n) {
    const values = crypto.getRandomValues(new Uint32Array(n));
    return Array.from(values, v => (v % 6) + 1);
}

export function newSeed() {
    return crypto.getRandomValues(new Uint32Array(1))[0];
}

// mulberry32: kleiner, schneller Zufallsgenerator mit Seed, Werte in [0, 1)
export function seededRandom(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
