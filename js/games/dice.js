// SVG-Würfel für alle Würfelspiele

const PIPS = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

// value: 1–6 oder null (noch nicht gewürfelt); fresh: kurze Roll-Animation
export function dieSvg(value, { fresh = false } = {}) {
    const pips = (PIPS[value] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('');
    return `
      <svg class="die ${value ? '' : 'die-empty'} ${fresh ? 'die-fresh' : ''}" viewBox="0 0 100 100"
           role="img" aria-label="${value ? `Würfel: ${value}` : 'noch nicht gewürfelt'}">
        <rect x="4" y="4" width="92" height="92" rx="18"/>
        ${value ? pips : '<text x="50" y="62" text-anchor="middle">?</text>'}
      </svg>`;
}
