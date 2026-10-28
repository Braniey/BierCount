// Animiertes Bierglas. Das SVG wird einmal erzeugt; danach ändern sich nur
// CSS-Variablen, damit Füllstand und Farbe per Transition weich übergehen.

let uid = 0;

// Innenraum des Glases im viewBox-Koordinatensystem (0 0 100 150)
const TOP = 12, BOTTOM = 140, INNER_H = BOTTOM - TOP;

export function createGlass(container, { bubbles = true } = {}) {
    const id = `glass-${++uid}`;
    container.classList.add('glass');
    container.innerHTML = `
      <svg viewBox="0 0 100 150" aria-hidden="true">
        <defs>
          <clipPath id="${id}">
            <polygon points="16,${TOP} 84,${TOP} 78,${BOTTOM} 22,${BOTTOM}"/>
          </clipPath>
        </defs>
        <g clip-path="url(#${id})">
          <rect class="glass-beer" x="0" y="${TOP}" width="100" height="${INNER_H}"/>
          ${bubbles ? `<g class="glass-bubbles">
            <circle cx="35" cy="${BOTTOM - 4}" r="1.6" style="--d:2.6s;--delay:0s"/>
            <circle cx="52" cy="${BOTTOM - 4}" r="1.2" style="--d:3.1s;--delay:.9s"/>
            <circle cx="64" cy="${BOTTOM - 4}" r="1.8" style="--d:2.2s;--delay:1.6s"/>
            <circle cx="44" cy="${BOTTOM - 4}" r="1"   style="--d:3.4s;--delay:2.1s"/>
          </g>` : ''}
          <g class="glass-foam">
            <path d="M0,${TOP} Q12,${TOP - 7} 25,${TOP - 1} T50,${TOP - 2} T75,${TOP - 1} T100,${TOP} V${TOP + 8} H0 Z"/>
          </g>
        </g>
        <polygon class="glass-outline" points="16,${TOP} 84,${TOP} 78,${BOTTOM} 22,${BOTTOM}"/>
        <path class="glass-handle" d="M82,40 Q102,40 102,72 Q102,104 80,104"/>
        <line class="glass-shine" x1="22" y1="${TOP + 6}" x2="27" y2="${BOTTOM - 8}"/>
        <text class="glass-empty" x="50" y="82" text-anchor="middle">leer</text>
      </svg>`;

    return {
        set(count, max) {
            const fill = count > 0 ? Math.min(count / Math.max(max, 1), 1) : 0;
            // Je mehr Bier, desto dunkler/röter wird's
            const hue = Math.max(18, 40 - count * 1.2);
            const light = Math.max(34, 55 - count);
            container.style.setProperty('--fill', fill);
            container.style.setProperty('--foam-y', `${(1 - fill) * INNER_H}px`);
            container.style.setProperty('--beer-color', `hsl(${hue} 90% ${light}%)`);
            container.classList.toggle('is-empty', count === 0);
        },
        slosh() {
            container.classList.remove('slosh');
            void container.offsetWidth; // Animation neu starten
            container.classList.add('slosh');
        },
    };
}
