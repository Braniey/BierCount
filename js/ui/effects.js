// Feedback-Effekte: Konfetti, Meilenstein-Overlay, schwebende Emojis, Vibration

import { $, esc, prefersReducedMotion } from './dom.js';

export function vibrate(pattern = 25) {
    navigator.vibrate?.(pattern);
}

// Zahl kurz "hüpfen" lassen
export function bump(el) {
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
}

// "+1 🍺" steigt vom Button auf
export function floatFrom(el, text) {
    if (prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'float-label';
    span.textContent = text;
    span.style.left = `${rect.left + rect.width / 2 + (Math.random() * 60 - 30)}px`;
    span.style.top  = `${rect.top}px`;
    document.body.appendChild(span);
    span.addEventListener('animationend', () => span.remove());
}

const CONFETTI_COLORS = ['#F5A623', '#FFF4D6', '#D4870A', '#ffffff', '#ffd27a'];

export function confetti({ count = 120, duration = 2200 } = {}) {
    if (prefersReducedMotion()) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const parts = Array.from({ length: count }, () => ({
        x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .3,
        y: innerHeight * .45,
        vx: (Math.random() - .5) * 14,
        vy: -Math.random() * 14 - 4,
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - .5) * .3,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    }));

    const startTime = performance.now();
    const frame = t => {
        const elapsed = t - startTime;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / duration);
        for (const p of parts) {
            p.vy += .35;
            p.vx *= .99;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        }
        if (elapsed < duration) requestAnimationFrame(frame);
        else canvas.remove();
    };
    requestAnimationFrame(frame);
}

// Großes Overlay für Meilensteine – eins nach dem anderen
const queue = [];
let showing = false;

export function celebrate({ big, title, subtitle = '' }) {
    queue.push({ big, title, subtitle });
    if (!showing) nextCelebration();
}

function nextCelebration() {
    const item = queue.shift();
    if (!item) { showing = false; return; }
    showing = true;

    const el = $('#milestone');
    el.innerHTML = `
      <div class="milestone-card">
        <div class="milestone-big">${esc(item.big)}</div>
        <div class="milestone-title">${esc(item.title)}</div>
        ${item.subtitle ? `<div class="milestone-sub">${esc(item.subtitle)}</div>` : ''}
      </div>`;
    el.classList.add('show');
    confetti();
    vibrate([40, 60, 40]);

    const close = () => {
        el.classList.remove('show');
        el.removeEventListener('click', close);
        clearTimeout(timer);
        setTimeout(nextCelebration, 350);
    };
    const timer = setTimeout(close, 2600);
    el.addEventListener('click', close);
}
