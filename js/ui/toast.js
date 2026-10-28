import { $ } from './dom.js';

let timer;

export function showToast(msg, duration = 2200) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('show'), duration);
}
