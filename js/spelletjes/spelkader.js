// Het kader rond een minispelletje van de geheimen: een venster over de stad met een canvas (960 x 600),
// een startscherm (titel, uitleg in één regel met tekeningetjes, beste score), het spel zelf, een eindscherm
// en altijd een knop "Terug naar de stad". Escape sluit. Geluid kan aan, maar staat standaard uit.
//
// Een spel is een object { id, titel, kleur, eenheid, uitleg: [{ teken(g), tekst }], maak(api) }.
// maak(api) geeft { update(dt), teken(g), score, klaar, eindTekst, tik?(x, y), toets?(key) } terug.
// api: { W, H, toets(k) is ingedrukt?, wijzer {x, y, neer, actief}, klank(freq, duur, soort, luid), rng }
import { h } from '../core/util.js';
import { K, tekst } from './teken.js';

export const W = 960, H = 600;
const GELUID_SLEUTEL = 'vagant:spel:geluid';

let actx = null;
function geluidAan() { try { return localStorage.getItem(GELUID_SLEUTEL) === 'aan'; } catch { return false; } }
function zetGeluid(aan) { try { localStorage.setItem(GELUID_SLEUTEL, aan ? 'aan' : 'uit'); } catch { /* geen opslag */ } }
/** Een toon (sinus met boventonen voor een klok, of driehoek/blokgolf); alleen als het geluid aan staat. */
function klank(freq, duur = 0.18, soort = 'triangle', luid = 0.08) {
  if (!geluidAan()) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const delen = soort === 'klok' ? [[1, 1], [2.0, 0.45], [2.4, 0.3], [3.0, 0.2], [4.2, 0.12]] : [[1, 1]];
    for (const [f, a] of delen) {
      const o = actx.createOscillator(), gn = actx.createGain();
      o.type = soort === 'klok' ? 'sine' : soort; o.frequency.value = freq * f;
      gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(luid * a, t + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + duur * (soort === 'klok' ? 1 / f + 0.3 : 1));
      o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + duur * 1.4 + 0.05);
    }
  } catch { /* geen geluid op dit toestel */ }
}

/** Een klein canvasje met een tekening, voor de uitleg op het startscherm. */
function icoonCanvas(teken, px = 54) {
  const c = document.createElement('canvas'); c.width = px * 2; c.height = px * 2; c.className = 'spel-ico';
  c.style.width = px + 'px'; c.style.height = px + 'px';
  const g = c.getContext('2d'); g.scale(2 * px / 60, 2 * px / 60); g.translate(30, 30); teken(g);
  return c;
}
/** Een toetsje in de uitleg (bv. de pijltjes). */
export function toetsIcoon(tekens) { return h('span', { class: 'spel-toetsen' }, ...tekens.map(t => h('kbd', {}, t))); }

/**
 * Open een spel. opts: { gevonden: {nieuw, aantal, totaal, beloning}, best, onScore(score) -> Promise<bool record>, onSluit() }
 * Geeft { sluit } terug.
 */
export function openSpel(spel, opts = {}) {
  const canvas = h('canvas', { width: W, height: H, class: 'spel-canvas', tabindex: '0', 'aria-label': spel.titel });
  const g = canvas.getContext('2d');
  const laag = h('div', { class: 'spel-laag' });
  const scherm = h('div', { class: 'spel-scherm' }, canvas, laag);
  const geluidKnop = h('button', { type: 'button', class: 'rond klein spel-geluid', 'aria-pressed': String(geluidAan()), title: 'Geluid aan of uit', 'aria-label': 'Geluid aan of uit' });
  const zetGeluidKnop = () => { const aan = geluidAan(); geluidKnop.innerHTML = aan ? SVG_AAN : SVG_UIT; geluidKnop.setAttribute('aria-pressed', String(aan)); geluidKnop.classList.toggle('aan', aan); };
  geluidKnop.onclick = () => { zetGeluid(!geluidAan()); zetGeluidKnop(); if (geluidAan()) klank(784, 0.3, 'klok', 0.06); canvas.focus(); };
  zetGeluidKnop();
  const terug = h('button', { type: 'button', class: 'btn spel-terug', 'data-terug': '' }, 'Terug naar de stad');
  const kader = h('div', { class: 'spel-kader', role: 'dialog', 'aria-modal': 'true', 'aria-label': spel.titel, style: { '--k': spel.kleur || '#1f8be0' } },
    h('header', { class: 'spel-kop' }, h('h2', {}, spel.titel), geluidKnop, terug), scherm);
  const ov = h('div', { class: 'overlay spel-overlay' }, kader);
  document.body.append(ov);

  // ---- invoer ----
  const ingedrukt = new Set();
  const wijzer = { x: W / 2, y: H / 2, neer: false, actief: false, t: 0 };
  const api = { W, H, wijzer, toets: (...ks) => ks.some(k => ingedrukt.has(k)), klank, rng: Math.random };
  let spelObj = null, fase = 'start', raf = 0, vorige = 0, best = opts.best || 0;
  const naarCanvas = (e) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.focus(); const p = naarCanvas(e); Object.assign(wijzer, p, { neer: true, actief: true, t: performance.now() }); if (fase === 'spel') spelObj?.tik?.(p.x, p.y); });
  canvas.addEventListener('pointermove', (e) => { const p = naarCanvas(e); Object.assign(wijzer, p, { actief: true, t: performance.now() }); });
  const los = () => { wijzer.neer = false; };
  canvas.addEventListener('pointerup', los); canvas.addEventListener('pointercancel', los); canvas.addEventListener('pointerleave', () => { wijzer.neer = false; wijzer.actief = false; });
  const PIJL = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'spacebar']);
  const onKey = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape') { e.preventDefault(); sluit(); return; }
    if (e.target?.tagName === 'BUTTON' && (k === 'enter' || k === ' ')) return;      // knoppen werken gewoon
    if (fase === 'spel') { ingedrukt.add(k); if (!e.repeat) spelObj?.toets?.(k); if (PIJL.has(k)) e.preventDefault(); }
    else if ((k === 'enter' || k === ' ') && !e.repeat) { e.preventDefault(); start(); }
  };
  const onKeyUp = (e) => ingedrukt.delete(e.key.toLowerCase());
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
  const onBlur = () => ingedrukt.clear();
  window.addEventListener('blur', onBlur);

  // ---- schermen ----
  function startScherm() {
    fase = 'start';
    laag.hidden = false; laag.className = 'spel-laag start'; laag.innerHTML = '';
    const gv = opts.gevonden;
    if (gv?.nieuw) {
      laag.append(h('div', { class: 'spel-feest', 'aria-live': 'polite' }, h('b', {}, 'Geheim gevonden!'), h('span', {}, `${gv.aantal} van de ${gv.totaal}`)),
        h('div', { class: 'confetti', 'aria-hidden': 'true' }, ...Array.from({ length: 28 }, (_, i) => h('i', { style: { '--i': i, '--x': `${(i * 37) % 100}%`, '--k': ['#f2c94c', '#e9578a', '#3aa6f3', '#6fae4a', '#e2643e'][i % 5] } }))));
      if (gv.beloning) laag.append(h('p', { class: 'spel-beloning' }, gv.beloning));
    }
    laag.append(h('h3', { class: 'spel-titel' }, spel.titel),
      h('ul', { class: 'spel-uitleg' }, ...spel.uitleg.map(u => h('li', {}, u.toetsen ? toetsIcoon(u.toetsen) : icoonCanvas(u.teken), h('span', {}, u.tekst)))),
      best ? h('p', { class: 'spel-best' }, `Jouw beste score: ${best} ${spel.eenheid}`) : '',
      h('button', { type: 'button', class: 'btn primair groot spel-start', onclick: () => start() }, 'Speel'));
    gv && (gv.nieuw = false);       // het feest maar één keer
    tekenDecor();
  }
  function tekenDecor() {
    const voorbeeld = spel.maak(api); voorbeeld.teken(g, { stil: true });
    g.fillStyle = 'rgba(255,246,227,.55)'; g.fillRect(0, 0, W, H);
  }
  function start() {
    if (fase === 'spel') return;
    fase = 'spel'; laag.hidden = true; laag.innerHTML = '';
    ingedrukt.clear();
    spelObj = spel.maak(api);
    window.__spel = spelObj;          // voor de tests
    vorige = performance.now();
    canvas.focus();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(lus);
  }
  async function einde() {
    fase = 'einde';
    const score = spelObj.score;
    let record = false;
    try { record = !!(await opts.onScore?.(score)); } catch { record = false; }
    if (score > best) best = score;
    laag.hidden = false; laag.className = 'spel-laag einde'; laag.innerHTML = '';
    laag.append(h('p', { class: 'spel-eindtekst' }, spelObj.eindTekst || 'Klaar!'),
      h('div', { class: 'spel-score' }, spel.scoreIcoon ? icoonCanvas(spel.scoreIcoon, 64) : null, h('b', {}, String(score)), h('span', {}, spel.eenheid)),
      record && score > 0 ? h('p', { class: 'spel-record' }, 'Nieuw record!') : h('p', { class: 'spel-best' }, `Jouw beste score: ${best} ${spel.eenheid}`),
      h('div', { class: 'spel-knoppen' }, h('button', { type: 'button', class: 'btn primair groot spel-opnieuw', onclick: () => start() }, 'Nog eens'),
        h('button', { type: 'button', class: 'btn groot', onclick: () => sluit() }, 'Terug naar de stad')));
    if (record && score > 0) klank(1046, 0.5, 'klok', 0.06);
    laag.querySelector('.spel-opnieuw')?.focus();
  }
  function lus(nu) {
    if (fase !== 'spel') return;
    raf = requestAnimationFrame(lus);
    const dt = Math.min(0.1, Math.max(0, (nu - vorige) / 1000)); vorige = nu;   // trage toestellen: grotere stappen, zelfde speeltempo
    if (document.hidden) return;
    // in kleine stapjes rekenen, zodat er op een traag toestel niets 'door' een ander voorwerp vliegt
    const n = Math.ceil(dt / 0.034);
    for (let i = 0; i < n && !spelObj.klaar; i++) spelObj.update(dt / n);
    spelObj.teken(g);
    if (spelObj.klaar) { cancelAnimationFrame(raf); setTimeout(einde, 700); fase = 'wacht'; }
  }
  function sluit() {
    if (fase === 'dicht') return;
    fase = 'dicht';
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur);
    ov.remove();
    if (window.__spel === spelObj) window.__spel = null;
    opts.onSluit?.();
  }
  terug.onclick = sluit;
  startScherm();
  setTimeout(() => (laag.querySelector('.spel-start') || canvas).focus(), 30);
  return { sluit, start, get fase() { return fase; } };
}

const SVG_UIT = '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
const SVG_AAN = '<svg class="ico" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/></svg>';

/** Gedeelde stukjes voor de HUD in een spel: een balk bovenaan met score en tijd. */
export function hudBalk(g, items) {
  let x = 16;
  for (const it of items) {
    const w = it.breed || 150;
    g.fillStyle = 'rgba(255,246,227,.92)'; g.strokeStyle = K.inkt; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect ? g.roundRect(x, 12, w, 46, 14) : g.rect(x, 12, w, 46); g.fill(); g.stroke();
    if (it.icoon) { g.save(); g.translate(x + 28, 35); it.icoon(g); g.restore(); }
    tekst(g, it.tekst, x + (it.icoon ? 54 : 14), 36, { maat: 26, kleur: K.inkt, lijn: null, uitlijn: 'left' });
    x += w + 10;
  }
}
