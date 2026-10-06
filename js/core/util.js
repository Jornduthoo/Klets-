// Kleine hulpfuncties zonder afhankelijkheden.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Maak een DOM-element: h('div', {class: 'x', onclick: fn}, kind1, 'tekst') */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? el.style.setProperty(sk, sv) : (el.style[sk] = sv); }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function uid(prefix = 'id') {
  return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** Deterministische pseudo-random generator (mulberry32). */
export function rng(seed) {
  let a = typeof seed === 'string' ? hashStr(seed) : (seed >>> 0);
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h1 = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619); }
  return h1 >>> 0;
}
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Tolerante normalisatie voor typ-antwoorden. */
export function normText(s, { accenten = false, hoofdletters = false, leestekens = false } = {}) {
  let t = String(s ?? '');
  t = t.replace(/[‘’‛`´]/g, "'").replace(/[“”]/g, '"').replace(/[‐-―]/g, '-');
  t = t.replace(/\s+/g, ' ').trim();
  if (!hoofdletters) t = t.toLocaleLowerCase('nl-BE');
  if (!accenten) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!leestekens) t = t.replace(/[.,!?;:"]+/g, '').replace(/\s+/g, ' ').trim();
  return t;
}

/** Levenshtein-afstand (voor typetraining en 'bijna juist'). */
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i), cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/**
 * Lees een getal zoals een Vlaamse leerling het typt:
 * "10 000", "10.000", "3,5", "-7", "1/2" (breuk -> {teller, noemer}).
 */
export function parseNumber(input) {
  let s = String(input ?? '').trim().replace(/[\s  ']/g, '').replace(/−/g, '-');
  if (!s) return null;
  if (/^-?\d+\/\d+$/.test(s)) { const [t, n] = s.split('/').map(Number); return n ? { teller: t, noemer: n, waarde: t / n } : null; }
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^-?\d*\.?\d+$/.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}
export function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }

export function fmtNum(n) {
  return Number(n).toLocaleString('nl-BE').replace(/ | |\./g, ' ');
}

/** Voorlezen met de ingebouwde spraak van de browser (geen netwerk). */
export function speak(text, { rate = 0.9 } = {}) {
  try {
    if (!('speechSynthesis' in window)) return false;
    const u = new SpeechSynthesisUtterance(String(text));
    const voices = speechSynthesis.getVoices();
    const v = voices.find(v => /nl[-_]BE/i.test(v.lang)) || voices.find(v => /^nl/i.test(v.lang));
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'nl-BE';
    u.rate = rate;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

/** Korte klankjes via WebAudio (geen bestanden nodig). */
let actx = null;
function audio() {
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx; } catch { return null; }
}
export function blip(kind = 'ok') {
  const ac = audio(); if (!ac) return;
  const seq = { ok: [660, 880], nee: [330, 262], xp: [523, 659, 784], hit: [196, 147], code: [392, 523, 659, 1046] }[kind] || [440];
  seq.forEach((f, i) => tone(ac, f, ac.currentTime + i * 0.09, 0.12, kind === 'hit' ? 'square' : 'triangle', 0.08));
}
function tone(ac, freq, t, dur, type = 'triangle', vol = 0.1) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
/**
 * Speel een muziekfragmentje: 'solo' = één stem, 'groep' = meerdere stemmen tegelijk.
 * stijl: 'mars' | 'wals' | 'rustig' | 'swing' | 'dans' bepaalt ritme en klankkleur.
 */
export function playFragment({ soort = 'solo', stijl = 'rustig', seed = 1 } = {}) {
  const ac = audio(); if (!ac) return 0;
  const r = rng(seed);
  const scale = [262, 294, 330, 349, 392, 440, 494, 523];
  const styles = {
    rustig: { beat: 0.42, type: 'sine', swing: 0, accent: [1, 0.7] },
    mars: { beat: 0.28, type: 'square', swing: 0, accent: [1, 0.5] },
    wals: { beat: 0.3, type: 'triangle', swing: 0, accent: [1, 0.5, 0.5] },
    swing: { beat: 0.26, type: 'triangle', swing: 0.09, accent: [1, 0.6] },
    dans: { beat: 0.18, type: 'sawtooth', swing: 0, accent: [1, 0.8, 0.9, 0.8] },
  };
  const st = styles[stijl] || styles.rustig;
  const n = 12; let t = ac.currentTime + 0.05;
  for (let i = 0; i < n; i++) {
    const f = scale[Math.floor(r() * scale.length)];
    const acc = st.accent[i % st.accent.length];
    const d = st.beat + (i % 2 ? -st.swing : st.swing);
    tone(ac, f, t, d * 0.9, st.type, 0.07 * acc);
    if (soort === 'groep') { tone(ac, f * 1.25, t, d * 0.9, 'triangle', 0.04 * acc); tone(ac, f / 2, t, d * 0.9, 'sine', 0.05 * acc); tone(ac, f * 1.5, t, d * 0.9, 'sine', 0.03); }
    t += d;
  }
  return t - ac.currentTime;
}

export function downloadFile(name, content, type = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function toast(msg, ms = 2600) {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: 'toast' }, msg);
  box.append(t);
  setTimeout(() => t.classList.add('weg'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

/** append() dat null/false overslaat (voor voorwaardelijke inhoud). */
export function add(el, ...kids) { el.append(...kids.flat().filter(k => k != null && k !== false)); return el; }
