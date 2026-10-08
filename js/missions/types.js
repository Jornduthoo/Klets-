// Oefentypes. Elk type krijgt een item (data) en geeft terug:
//   { el, check() -> {goed, totaal, antwoord, juist}, reveal(result), focus() }
// 'totaal' = aantal scoorbare eenheden (bv. 6 kaartjes sorteren = 6). 0 = niet gescoord.
import { h, shuffle, normText, levenshtein, parseNumber, gcd, speak, playFragment, fmtNum } from '../core/util.js';
import { leesKnop } from '../core/stem.js';

const TYPES = {};
export function renderItem(item, ctx) {
  const t = TYPES[item.type];
  if (!t) throw new Error('Onbekend oefentype: ' + item.type);
  return t(item, ctx);
}
export const TYPE_NAMEN = {
  keuze: 'Meerkeuze', volgorde: 'In de juiste volgorde', koppel: 'Koppel de paren', typ: 'Typ het antwoord', getal: 'Getal invullen',
  kaart: 'Klik op de kaart', zin: 'Zinnenbouwer', sorteer: 'Sorteer', splits: 'Woordensplitser', typen: 'Typetraining', upload: 'Uploaden', tekst: 'Lezen',
};

// ---------- gedeelde stukjes ----------
function mediaKnoppen(item) {
  const box = h('div', { class: 'media' });
  if (item.zeg) box.append(h('button', { class: 'btn luister', type: 'button', onclick: () => speak(item.zeg, { nodig: true }) }, h('span', { class: 'ico-luid', 'aria-hidden': 'true' }), 'Luister'));
  if (item.geluid) box.append(h('button', { class: 'btn luister', type: 'button', onclick: () => playFragment(item.geluid) }, h('span', { class: 'ico-noot', 'aria-hidden': 'true' }), 'Speel het fragment'));
  return box.childNodes.length ? box : null;
}
function markOption(el, state) { el.classList.remove('sel'); el.classList.add(state); }
const pal = ['#e2643e', '#4c8fd6', '#3fa37a', '#9a6ad6', '#e9a23b', '#d9577b', '#2c9c8f', '#7a5230'];

// ---------- meerkeuze ----------
TYPES.keuze = (item, { rand }) => {
  const multi = Array.isArray(item.juist);
  const idx = item.opties.map((_, i) => i);
  const order = item.vast ? idx : shuffle(idx, rand);
  const chosen = new Set();
  const grid = h('div', { class: 'opties' + (item.opties.length > 4 ? ' veel' : '') + (item.groot ? ' groot' : '') });
  const btns = order.map(i => {
    const b = h('button', { class: 'optie', type: 'button', dataset: { i } }, item.opties[i]);
    b.onclick = () => {
      if (grid.dataset.klaar) return;
      if (multi) { chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle('sel'); }
      else { chosen.clear(); chosen.add(i); btns.forEach(x => x.classList.remove('sel')); b.classList.add('sel'); }
    };
    return b;
  });
  grid.append(...btns);
  const el = h('div', {}, mediaKnoppen(item), grid);
  return {
    el,
    ready: () => chosen.size > 0,
    check() {
      const juist = multi ? item.juist : [item.juist];
      const ok = juist.length === chosen.size && juist.every(j => chosen.has(j));
      return { goed: ok ? 1 : 0, totaal: 1, antwoord: [...chosen].map(i => item.opties[i]).join(' + '), juist: juist.map(j => item.opties[j]).join(' + ') };
    },
    reveal() {
      grid.dataset.klaar = '1';
      const juist = new Set(multi ? item.juist : [item.juist]);
      btns.forEach(b => { const i = +b.dataset.i; if (juist.has(i)) markOption(b, 'goed'); else if (chosen.has(i)) markOption(b, 'mis'); b.disabled = true; });
    },
  };
};

// ---------- volgorde (slepen of pijltjes) ----------
TYPES.volgorde = (item, { rand }) => {
  let order = shuffle(item.items.map((_, i) => i), rand);
  if (order.every((v, i) => v === i) && order.length > 1) order = [order[1], order[0], ...order.slice(2)];
  const list = h('ol', { class: 'volgorde' + (item.trein ? ' trein' : '') });
  let dragI = null;
  function draw() {
    list.innerHTML = '';
    order.forEach((v, pos) => {
      const li = h('li', { class: 'kaartje', draggable: 'true', dataset: { pos } },
        h('span', { class: 'greep', 'aria-hidden': 'true' }), h('span', { class: 'lbl' }, item.items[v]),
        h('span', { class: 'pijlen' },
          h('button', { type: 'button', class: 'mini', 'aria-label': 'Naar voren', onclick: () => move(pos, -1) }, item.trein ? '<' : '^'),
          h('button', { type: 'button', class: 'mini', 'aria-label': 'Naar achteren', onclick: () => move(pos, 1) }, item.trein ? '>' : 'v')));
      li.addEventListener('dragstart', (e) => { dragI = pos; li.classList.add('sleept'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(pos)); } catch {} });
      li.addEventListener('dragend', () => li.classList.remove('sleept'));
      li.addEventListener('dragover', (e) => { e.preventDefault(); });
      li.addEventListener('drop', (e) => { e.preventDefault(); if (dragI == null || dragI === pos) return; const [x] = order.splice(dragI, 1); order.splice(pos, 0, x); dragI = null; draw(); });
      list.append(li);
    });
  }
  function move(pos, d) { if (list.dataset.klaar) return; const np = pos + d; if (np < 0 || np >= order.length) return; [order[pos], order[np]] = [order[np], order[pos]]; draw(); }
  draw();
  const labels = item.labels ? h('div', { class: 'volg-labels' }, h('span', {}, item.labels[0]), h('span', {}, item.labels[1])) : null;
  return {
    el: h('div', {}, mediaKnoppen(item), labels, list),
    ready: () => true,
    check() { const ok = order.every((v, i) => v === i); return { goed: ok ? 1 : 0, totaal: 1, antwoord: order.map(i => item.items[i]).join(' | '), juist: item.items.join(' | ') }; },
    reveal() {
      list.dataset.klaar = '1';
      [...list.children].forEach((li, pos) => { li.draggable = false; li.classList.add(order[pos] === pos ? 'goed' : 'mis'); li.querySelectorAll('button').forEach(b => b.disabled = true); });
    },
  };
};

// ---------- koppel de paren ----------
TYPES.koppel = (item, { rand }) => {
  const n = item.paren.length;
  const rightOrder = shuffle([...Array(n).keys()], rand);
  const pairs = new Map(); // links -> rechts
  let selL = null;
  const L = item.paren.map(([a], i) => h('button', { type: 'button', class: 'kop links', dataset: { i } }, a));
  const R = rightOrder.map(j => h('button', { type: 'button', class: 'kop rechts', dataset: { j } }, item.paren[j][1]));
  function paint() {
    L.forEach((b, i) => { const c = pairs.has(i) ? pal[i % pal.length] : ''; b.style.setProperty('--paar', c); b.classList.toggle('gekoppeld', pairs.has(i)); b.classList.toggle('sel', selL === i); });
    R.forEach(b => { const j = +b.dataset.j; const li = [...pairs.entries()].find(([, v]) => v === j)?.[0]; b.style.setProperty('--paar', li != null ? pal[li % pal.length] : ''); b.classList.toggle('gekoppeld', li != null); });
  }
  L.forEach((b, i) => b.onclick = () => { if (wrap.dataset.klaar) return; selL = selL === i ? null : i; if (pairs.has(i) && selL === i) { pairs.delete(i); } paint(); });
  R.forEach(b => b.onclick = () => {
    if (wrap.dataset.klaar || selL == null) return;
    const j = +b.dataset.j;
    for (const [k, v] of pairs) if (v === j) pairs.delete(k);
    pairs.set(selL, j); selL = null; paint();
  });
  const wrap = h('div', { class: 'koppel' }, h('div', { class: 'kol' }, ...L), h('div', { class: 'kol' }, ...R));
  return {
    el: h('div', {}, mediaKnoppen(item), h('p', { class: 'tip' }, 'Klik links, dan rechts. Klik opnieuw om los te maken.'), wrap),
    ready: () => pairs.size === n,
    check() { let g = 0; for (let i = 0; i < n; i++) if (pairs.get(i) === i) g++; return { goed: g, totaal: n, antwoord: [...pairs].map(([a, b]) => item.paren[a][0] + '=' + item.paren[b][1]).join('; '), juist: item.paren.map(p => p.join('=')).join('; ') }; },
    reveal() {
      wrap.dataset.klaar = '1';
      L.forEach((b, i) => { b.disabled = true; b.classList.add(pairs.get(i) === i ? 'goed' : 'mis'); if (pairs.get(i) !== i) b.append(h('small', { class: 'oplossing' }, ' = ' + item.paren[i][1])); });
      R.forEach(b => b.disabled = true);
    },
  };
};

// ---------- typ het antwoord ----------
TYPES.typ = (item) => {
  const inp = h('input', { type: 'text', class: 'invoer', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Jouw antwoord', placeholder: item.placeholder || 'Typ hier' });
  const opts = { accenten: !!item.accenten, hoofdletters: !!item.hoofdletters };
  let bijna = false;
  return {
    el: h('div', {}, mediaKnoppen(item), h('div', { class: 'typ-rij' }, item.voor ? h('span', { class: 'voor' }, item.voor) : null, inp, item.na ? h('span', { class: 'na' }, item.na) : null)),
    focus: () => inp.focus(), input: inp,
    ready: () => inp.value.trim().length > 0,
    check() {
      const a = normText(inp.value, opts);
      const ok = item.antwoorden.some(x => normText(x, opts) === a);
      bijna = !ok && item.antwoorden.some(x => levenshtein(normText(x, opts), a) === 1);
      return { goed: ok ? 1 : 0, totaal: 1, antwoord: inp.value, juist: item.antwoorden[0], bijna };
    },
    reveal(r) { inp.disabled = true; inp.classList.add(r.goed ? 'goed' : 'mis'); },
  };
};

// ---------- getal ----------
TYPES.getal = (item) => {
  const inp = h('input', { type: 'text', inputmode: item.breuk ? 'text' : 'decimal', class: 'invoer getal', autocomplete: 'off', 'aria-label': 'Jouw getal', placeholder: item.breuk ? 'bv. 3/4' : 'getal' });
  return {
    el: h('div', {}, mediaKnoppen(item), h('div', { class: 'typ-rij' }, item.voor ? h('span', { class: 'voor' }, item.voor) : null, inp, item.eenheid ? h('span', { class: 'na' }, item.eenheid) : null)),
    focus: () => inp.focus(), input: inp,
    ready: () => inp.value.trim().length > 0,
    check() {
      const v = parseNumber(inp.value);
      let ok = false;
      if (item.breuk) {
        const [t, n] = String(item.antwoord).split('/').map(Number);
        if (v && typeof v === 'object') ok = item.kleinsteVorm ? (v.teller === t && v.noemer === n) : (v.teller * n === t * v.noemer);
        else if (typeof v === 'number' && !item.kleinsteVorm) ok = Math.abs(v - t / n) < 1e-9;
        if (v && typeof v === 'object' && item.kleinsteVorm && v.teller * n === t * v.noemer && !ok) this.nietKleinst = true;
      } else if (typeof v === 'number') ok = Math.abs(v - item.antwoord) <= (item.marge || 0) + 1e-9;
      return { goed: ok ? 1 : 0, totaal: 1, antwoord: inp.value, juist: item.breuk ? String(item.antwoord) : fmtNum(item.antwoord), nietKleinst: this.nietKleinst };
    },
    reveal(r) { inp.disabled = true; inp.classList.add(r.goed ? 'goed' : 'mis'); },
  };
};

// ---------- klik op de kaart (SVG) ----------
const NS = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...kids) { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); kids.forEach(k => el.append(typeof k === 'string' ? document.createTextNode(k) : k)); return el; }

TYPES.kaart = (item) => {
  let k = item.kaart;
  if (k.soort === 'wereld') k = wereldKaart(k);
  let svg, getAnswer, revealFn;
  if (k.soort === 'getallenas') {
    const W = 600, H = 120, x0 = 30, x1 = 570, y = 64;
    svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'kaart-svg as', role: 'img', 'aria-label': 'Getallenas' });
    svg.append(s('rect', { x: 0, y: 0, width: W, height: H, fill: 'var(--kaart-bg)' }));
    svg.append(s('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: 'var(--ink)', 'stroke-width': 4 }));
    const steps = Math.round((k.max - k.min) / k.stap);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + (i / steps) * (x1 - x0), v = k.min + i * k.stap, big = (k.labelElke ? i % k.labelElke === 0 : true);
      svg.append(s('line', { x1: x, x2: x, y1: y - (big ? 14 : 8), y2: y + (big ? 14 : 8), stroke: 'var(--ink)', 'stroke-width': big ? 3 : 2 }));
      if (big && (k.toonLabels !== false || i === 0 || i === steps)) svg.append(s('text', { x, y: y + 36, 'text-anchor': 'middle', class: 'as-lbl' }, fmtNum(v)));
    }
    const marker = s('g', { visibility: 'hidden' }, s('polygon', { points: '0,0 -10,-18 10,-18', fill: 'var(--accent)' }), s('text', { x: 0, y: -24, 'text-anchor': 'middle', class: 'as-val' }, ''));
    const sol = s('g', { visibility: 'hidden' }, s('polygon', { points: '0,0 -10,18 10,18', fill: 'var(--goed)' }));
    svg.append(sol, marker);
    let val = null;
    const toX = v => x0 + ((v - k.min) / (k.max - k.min)) * (x1 - x0);
    svg.addEventListener('pointerdown', (e) => {
      if (svg.dataset.klaar) return;
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const raw = k.min + ((p.x - x0) / (x1 - x0)) * (k.max - k.min);
      const snap = k.snap || 1; val = Math.max(k.min, Math.min(k.max, Math.round(raw / snap) * snap));
      marker.setAttribute('transform', `translate(${toX(val)},${y - 4})`); marker.setAttribute('visibility', 'visible');
      marker.querySelector('text').textContent = k.toonWaarde ? fmtNum(val) : '';
    });
    getAnswer = () => val;
    revealFn = (ok) => { sol.setAttribute('transform', `translate(${toX(k.waarde)},${y + 4})`); sol.setAttribute('visibility', 'visible'); void ok; };
    return wrapKaart(item, svg, () => val != null, () => {
      const ok = Math.abs(val - k.waarde) <= (k.marge || 0);
      return { goed: ok ? 1 : 0, totaal: 1, antwoord: fmtNum(val), juist: fmtNum(k.waarde) };
    }, revealFn);
  }
  if (k.soort === 'positiekaart') {
    const cols = k.kolommen, W = 600, cw = W / cols.length, H = 150;
    svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'kaart-svg', role: 'img', 'aria-label': 'Positiekaart' });
    let chosen = null; const cells = [];
    cols.forEach((c, i) => {
      const g = s('g', { class: 'regio', tabindex: 0, role: 'button', 'aria-label': c });
      const r1 = s('rect', { x: i * cw + 2, y: 2, width: cw - 4, height: 50, rx: 6, class: 'kop' });
      const r2 = s('rect', { x: i * cw + 2, y: 56, width: cw - 4, height: 90, rx: 6, class: 'vak' });
      g.append(r1, r2, s('text', { x: i * cw + cw / 2, y: 36, 'text-anchor': 'middle', class: 'pk-lbl' }, c));
      if (k.cijfers) g.append(s('text', { x: i * cw + cw / 2, y: 112, 'text-anchor': 'middle', class: 'pk-cijfer' }, k.cijfers[i] ?? ''));
      const pick = () => { if (svg.dataset.klaar) return; chosen = c; cells.forEach(x => x.classList.remove('sel')); g.classList.add('sel'); };
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      cells.push(g); svg.append(g);
    });
    return wrapKaart(item, svg, () => chosen != null, () => ({ goed: chosen === k.juist ? 1 : 0, totaal: 1, antwoord: chosen, juist: k.juist }),
      () => cells.forEach(g => { const lbl = g.getAttribute('aria-label'); if (lbl === k.juist) g.classList.add('goed'); else if (lbl === chosen) g.classList.add('mis'); }));
  }
  if (k.soort === 'taart') {
    const n = k.delen, R = 120, cx = 140, cy = 140;
    svg = s('svg', { viewBox: '0 0 280 280', class: 'kaart-svg taart', role: 'img', 'aria-label': `Taart in ${n} stukken` });
    const on = new Set(); const parts = [];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
      const d = `M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} Z`;
      const p = s('path', { d, class: 'stuk', tabindex: 0, role: 'button', 'aria-label': `stuk ${i + 1}` });
      const tog = () => { if (svg.dataset.klaar) return; on.has(i) ? on.delete(i) : on.add(i); p.classList.toggle('aan'); teller.textContent = `${on.size} van ${n} gekleurd`; };
      p.addEventListener('click', tog); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
      parts.push(p); svg.append(p);
    }
    const teller = h('p', { class: 'tip' }, `0 van ${n} gekleurd`);
    const res = wrapKaart(item, svg, () => on.size > 0, () => ({ goed: on.size === k.kleur ? 1 : 0, totaal: 1, antwoord: `${on.size}/${n}`, juist: `${k.kleur}/${n}` }), (r) => svg.classList.add(r.goed ? 'goed' : 'mis'));
    res.el.append(teller);
    return res;
  }
  if (k.soort === 'regio') {
    svg = s('svg', { viewBox: k.viewBox || '0 0 600 300', class: 'kaart-svg', role: 'img', 'aria-label': item.vraag });
    if (k.achtergrond) for (const b of k.achtergrond) svg.append(s(b.tag, b.attrs, b.tekst || ''));
    let chosen = null; const regs = [];
    for (const r of k.regios) {
      const g = s('g', { class: 'regio', tabindex: 0, role: 'button', 'aria-label': r.label });
      g.dataset.id = r.id;
      const shape = r.pts ? s('polygon', { points: r.pts, class: 'vak' }) : s('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: r.rx ?? 6, class: 'vak' });
      g.append(shape);
      if (r.label && r.toonLabel !== false) g.append(s('text', { x: r.tx ?? (r.x + r.w / 2), y: r.ty ?? (r.y + r.h / 2 + 6), 'text-anchor': r.anchor || 'middle', class: 'rg-lbl' }, r.label));
      const pick = () => { if (svg.dataset.klaar) return; chosen = r.id; regs.forEach(x => x.classList.remove('sel')); g.classList.add('sel'); };
      g.addEventListener('click', pick); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      regs.push(g); svg.append(g);
    }
    const lbl = id => k.regios.find(r => r.id === id)?.label || id;
    return wrapKaart(item, svg, () => chosen != null, () => ({ goed: chosen === k.juist ? 1 : 0, totaal: 1, antwoord: lbl(chosen), juist: lbl(k.juist) }),
      () => regs.forEach(g => { if (g.dataset.id === k.juist) g.classList.add('goed'); else if (g.dataset.id === chosen) g.classList.add('mis'); }));
  }
  throw new Error('Onbekende kaartsoort ' + k.soort);
};
// ---------- de wereldkaart ----------
// Een eenvoudige wereldkaart (vlakke projectie: lengte en breedte recht uitgerekt). De werelddelen staan
// als achtergrond op de kaart; de aanklikbare gebieden (oceanen, landen, de Amazone, Kaap de Goede Hoop)
// liggen eroverheen en krijgen GEEN naam op de kaart - anders staat het antwoord er al.
const LAND = {
  noordamerika: { naam: 'Noord-Amerika', punten: [[-168, 65], [-140, 70], [-125, 50], [-115, 32], [-105, 22], [-97, 18], [-83, 10], [-80, 25], [-72, 42], [-58, 46], [-56, 53], [-70, 60], [-82, 70], [-105, 72], [-130, 70]], tx: -100, ty: 46 },
  groenland: { punten: [[-45, 60], [-20, 70], [-20, 82], [-50, 83], [-58, 76], [-55, 66]] },
  zuidamerika: { naam: 'Zuid-Amerika', punten: [[-81, 8], [-72, 11], [-60, 10], [-50, 0], [-35, -6], [-38, -13], [-48, -25], [-58, -35], [-62, -41], [-70, -55], [-72, -45], [-71, -30], [-70, -18], [-76, -5], [-79, 2]], tx: -62, ty: -14 },
  europa: { naam: 'Europa', punten: [[-10, 36], [0, 44], [10, 38], [18, 40], [28, 41], [40, 45], [45, 55], [38, 60], [30, 70], [12, 66], [5, 58], [-5, 50], [-10, 43]], tx: 14, ty: 52 },
  afrika: { naam: 'Afrika', punten: [[-17, 15], [-16, 28], [-5, 36], [10, 37], [32, 31], [35, 22], [43, 12], [51, 12], [41, -1], [40, -15], [35, -24], [25, -34], [18, -34], [12, -18], [9, -1], [6, 4], [-7, 4], [-17, 10]], tx: 20, ty: 4 },
  azie: { naam: 'Azië', punten: [[28, 41], [45, 42], [60, 45], [75, 38], [88, 28], [97, 20], [105, 10], [120, 22], [122, 38], [130, 43], [142, 50], [155, 60], [180, 66], [150, 72], [110, 76], [80, 73], [60, 70], [45, 68], [40, 55]], tx: 95, ty: 50 },
  india: { punten: [[68, 24], [80, 22], [89, 22], [88, 15], [80, 8], [73, 16]] },
  indonesie: { punten: [[95, 5], [120, 2], [140, -3], [140, -9], [118, -8], [100, -1]] },
  australie: { punten: [[113, -22], [122, -18], [131, -12], [142, -11], [146, -19], [151, -25], [153, -30], [147, -38], [138, -35], [129, -32], [115, -34], [113, -26]] },
  nieuwzeeland: { punten: [[166, -46], [172, -41], [175, -36], [178, -38], [174, -42], [170, -47]] },
  antarctica: { naam: 'Antarctica', punten: [[-180, -68], [-100, -72], [-20, -70], [40, -68], [120, -70], [180, -68], [180, -90], [-180, -90]], tx: 0, ty: -80 },
};
const WERELD_GEBIED = {
  grote: { naam: 'Grote Oceaan', punten: [[-175, 40], [-110, 40], [-80, -10], [-80, -45], [-175, -45], [-175, 0]] },
  atlantisch: { naam: 'Atlantische Oceaan', punten: [[-48, 44], [-16, 44], [-5, 10], [-2, -35], [-45, -35], [-50, 5]] },
  indisch: { naam: 'Indische Oceaan', punten: [[58, 4], [98, 4], [105, -30], [100, -42], [58, -42]] },
  australie: { naam: 'Australië', punten: LAND.australie.punten },
  nieuwzeeland: { naam: 'Nieuw-Zeeland', punten: [[163, -49], [180, -49], [180, -33], [163, -33]] },
  brazilie: { naam: 'Brazilië', punten: [[-70, -2], [-50, 0], [-35, -6], [-39, -16], [-50, -24], [-58, -21], [-70, -10]] },
  argentinie: { naam: 'Argentinië', punten: [[-70, -22], [-62, -25], [-58, -35], [-68, -53], [-72, -45], [-70, -30]] },
  kaap: { naam: 'Kaap de Goede Hoop', punten: [[14, -30], [24, -30], [24, -38], [14, -38]] },
  amazone: { naam: 'de Amazone', punten: [[-73, -1], [-50, 1], [-49, -5], [-73, -7]] },
  schelde: { naam: 'de Schelde', punten: [[1, 54], [7, 54], [7, 48], [1, 48]] },
  noordzee: { naam: 'de Noordzee', punten: [[-4, 60], [8, 60], [8, 51], [-4, 51]] },
};
function lonLat([lon, lat]) { return [Math.round(((lon + 180) / 360) * 600 * 10) / 10, Math.round(((90 - lat) / 180) * 300 * 10) / 10]; }
function pts(punten) { return punten.map(p => lonLat(p).join(',')).join(' '); }
/** Zet een kaart van het soort 'wereld' om naar een gewone regiokaart. */
function wereldKaart(k) {
  const achtergrond = [
    { tag: 'rect', attrs: { x: 0, y: 0, width: 600, height: 300, fill: '#bcdcee' } },
  ];
  for (const [id, L] of Object.entries(LAND)) {
    achtergrond.push({ tag: 'polygon', attrs: { points: pts(L.punten), fill: id === 'antarctica' ? '#eef4f7' : '#cfe0b4', stroke: '#9bb389', 'stroke-width': 1 } });
    if (L.naam) {
      const [x, y] = lonLat([L.tx, L.ty]);
      achtergrond.push({ tag: 'text', attrs: { x, y, 'text-anchor': 'middle', fill: '#4a5a3c', 'font-size': 11 }, tekst: L.naam });
    }
  }
  // de evenaar, zodat je noord en zuid ziet
  achtergrond.push({ tag: 'line', attrs: { x1: 0, x2: 600, y1: 150, y2: 150, stroke: '#7f9aad', 'stroke-width': 1, 'stroke-dasharray': '6 5' } });
  const keuzes = k.gebieden || Object.keys(WERELD_GEBIED);
  const regios = keuzes.filter(id => WERELD_GEBIED[id]).map(id => ({
    id, label: WERELD_GEBIED[id].naam, toonLabel: false, pts: pts(WERELD_GEBIED[id].punten),
  }));
  return { soort: 'regio', viewBox: '0 0 600 300', achtergrond, regios, juist: k.juist };
}

function wrapKaart(item, svg, ready, check, reveal) {
  return { el: h('div', { class: 'kaart-wrap' }, mediaKnoppen(item), svg), ready, check, reveal: (r) => { svg.dataset.klaar = '1'; reveal(r); } };
}

// ---------- zinnenbouwer (woordtegels) ----------
TYPES.zin = (item, { rand }) => {
  const tegels = shuffle([...item.tegels, ...(item.extra || [])].map((t, i) => ({ t, i })), rand);
  const lijn = h('div', { class: 'zin-lijn', 'aria-label': 'Jouw zin' });
  const bank = h('div', { class: 'zin-bank' });
  const gekozen = [];
  function draw() {
    lijn.innerHTML = ''; bank.innerHTML = '';
    if (!gekozen.length) lijn.append(h('span', { class: 'leeg' }, item.aaneen ? 'Klik de letters in de juiste volgorde' : 'Klik de woorden in de juiste volgorde'));
    gekozen.forEach((tg, pos) => lijn.append(h('button', { type: 'button', class: 'tegel in', onclick: () => { if (lijn.dataset.klaar) return; gekozen.splice(pos, 1); draw(); } }, tg.t)));
    tegels.filter(tg => !gekozen.includes(tg)).forEach(tg => bank.append(h('button', { type: 'button', class: 'tegel', onclick: () => { if (lijn.dataset.klaar) return; gekozen.push(tg); draw(); } }, tg.t)));
  }
  draw();
  const zin = () => gekozen.map(g => g.t).join(item.aaneen ? '' : ' ');
  const juist = item.antwoorden || [item.tegels.join(item.aaneen ? '' : ' ')];
  return {
    el: h('div', { class: 'zinbouw' + (item.aaneen ? ' letters' : '') }, mediaKnoppen(item), lijn, bank),
    ready: () => gekozen.length > 0,
    check() { const ok = juist.some(j => normText(j, { leestekens: false }) === normText(zin())); return { goed: ok ? 1 : 0, totaal: 1, antwoord: zin(), juist: juist[0] }; },
    reveal(r) { lijn.dataset.klaar = '1'; lijn.classList.add(r.goed ? 'goed' : 'mis'); bank.querySelectorAll('button').forEach(b => b.disabled = true); },
  };
};

// ---------- sorteer in bakken ----------
TYPES.sorteer = (item, { rand }) => {
  const kaarten = shuffle(item.kaarten.map((k, i) => ({ ...k, i })), rand);
  const plaats = new Map(); // i -> bak
  let sel = null;
  const stapel = h('div', { class: 'stapel' });
  const bakken = item.bakken.map((b, bi) => {
    const zone = h('div', { class: 'bak-zone' });
    const bak = h('div', { class: 'bak', tabindex: 0, role: 'button', 'aria-label': 'Bak ' + b }, h('div', { class: 'bak-titel' }, b), zone);
    const drop = () => { if (wrap.dataset.klaar || sel == null) return; plaats.set(sel, bi); sel = null; draw(); };
    bak.addEventListener('click', (e) => { if (e.target.closest('.kaart-s')) return; drop(); });
    bak.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(); } });
    bak.addEventListener('dragover', e => e.preventDefault());
    bak.addEventListener('drop', e => { e.preventDefault(); const i = +e.dataTransfer.getData('text/plain'); if (!Number.isNaN(i)) { sel = i; drop(); } });
    return { bak, zone };
  });
  function card(k) {
    const c = h('button', { type: 'button', class: 'kaart-s' + (sel === k.i ? ' sel' : ''), draggable: 'true', dataset: { i: k.i } }, k.t);
    c.onclick = (e) => {
      e.stopPropagation(); if (wrap.dataset.klaar) return;
      // een ander kaartje is gekozen en je klikt op een kaartje in een bak: leg het in die bak
      if (sel != null && sel !== k.i && plaats.has(k.i)) { plaats.set(sel, plaats.get(k.i)); sel = null; draw(); return; }
      sel = sel === k.i ? null : k.i; draw();
    };
    c.addEventListener('dragstart', e => { try { e.dataTransfer.setData('text/plain', String(k.i)); } catch {} });
    return c;
  }
  function draw() {
    stapel.innerHTML = ''; bakken.forEach(b => b.zone.innerHTML = '');
    for (const k of kaarten) { const b = plaats.get(k.i); (b == null ? stapel : bakken[b].zone).append(card(k)); }
    if (!stapel.childNodes.length) stapel.append(h('span', { class: 'leeg' }, 'Alle kaartjes liggen in een bak.'));
    bakken.forEach(b => b.bak.classList.toggle('doel', sel != null));
  }
  draw();
  const wrap = h('div', { class: 'sorteer' }, h('p', { class: 'tip' }, 'Klik een kaartje en dan een bak (of sleep).'), stapel, h('div', { class: 'bakken n' + item.bakken.length }, ...bakken.map(b => b.bak)));
  return {
    el: h('div', {}, mediaKnoppen(item), wrap),
    ready: () => plaats.size === kaarten.length,
    check() { let g = 0; for (const k of item.kaarten.map((k, i) => ({ ...k, i }))) if (plaats.get(k.i) === k.bak) g++; return { goed: g, totaal: item.kaarten.length, antwoord: `${g}/${item.kaarten.length} juist gesorteerd`, juist: item.kaarten.map(k => `${k.t} -> ${item.bakken[k.bak]}`).join('; ') }; },
    reveal() {
      wrap.dataset.klaar = '1';
      wrap.querySelectorAll('.kaart-s').forEach(c => { const i = +c.dataset.i; const ok = plaats.get(i) === item.kaarten[i].bak; c.classList.add(ok ? 'goed' : 'mis'); c.disabled = true; if (!ok) c.append(h('small', { class: 'oplossing' }, ' -> ' + item.bakken[item.kaarten[i].bak])); });
    },
  };
};

// ---------- woordensplitser ----------
TYPES.splits = (item) => {
  const letters = [...item.woord];
  const cuts = new Set();
  const box = h('div', { class: 'splits' });
  function draw() {
    box.innerHTML = '';
    letters.forEach((l, i) => {
      box.append(h('span', { class: 'letter' }, l));
      if (i < letters.length - 1) {
        const g = h('button', { type: 'button', class: 'gat' + (cuts.has(i) ? ' aan' : ''), 'aria-label': `Splits na ${l}`, onclick: () => { if (box.dataset.klaar) return; cuts.has(i) ? cuts.delete(i) : cuts.add(i); draw(); } }, cuts.has(i) ? '-' : '');
        box.append(g);
      }
    });
  }
  draw();
  const val = () => letters.map((l, i) => l + (cuts.has(i) ? '-' : '')).join('');
  return {
    el: h('div', {}, mediaKnoppen(item), h('p', { class: 'tip' }, 'Klik tussen de letters om een streepje te zetten.'), box),
    ready: () => true,
    check() { const ok = val() === item.juist; return { goed: ok ? 1 : 0, totaal: 1, antwoord: val(), juist: item.juist }; },
    reveal(r) { box.dataset.klaar = '1'; box.classList.add(r.goed ? 'goed' : 'mis'); },
  };
};

// ---------- typetraining ----------
TYPES.typen = (item) => {
  const doel = item.tekst;
  const ta = h('textarea', { class: 'invoer typen', rows: 2, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-label': 'Typ de tekst over' });
  const voorbeeld = h('div', { class: 'typ-voorbeeld' });
  const meter = h('div', { class: 'typ-meter' });
  let start = null, end = null;
  const stats = () => {
    const v = ta.value; const d = levenshtein(v, doel);
    const nauwk = Math.max(0, 1 - d / doel.length);
    const min = start ? ((end || performance.now()) - start) / 60000 : 0;
    const wpm = min > 0 ? (v.length / 5) / min : 0;
    return { nauwk, wpm };
  };
  function drawVoorbeeld() {
    const v = ta.value; voorbeeld.innerHTML = '';
    [...doel].forEach((ch, i) => voorbeeld.append(h('span', { class: i < v.length ? (v[i] === ch ? 'ok' : 'fout') : (i === v.length ? 'nu' : '') }, ch === ' ' ? ' ' : ch)));
    const st = stats(); meter.textContent = `Nauwkeurig: ${Math.round(st.nauwk * 100)} %` + (item.minWpm ? ` - Tempo: ${Math.round(st.wpm)} woorden per minuut` : '');
  }
  ta.addEventListener('input', () => { if (!start) start = performance.now(); if (ta.value.length >= doel.length) end = end || performance.now(); drawVoorbeeld(); });
  ta.addEventListener('paste', e => e.preventDefault());
  drawVoorbeeld();
  return {
    el: h('div', {}, voorbeeld, ta, meter),
    focus: () => ta.focus(), input: ta,
    ready: () => ta.value.length > 0,
    check() {
      end = end || performance.now();
      const st = stats();
      const ok = st.nauwk * 100 >= (item.minNauwkeurigheid || 90) && (!item.minWpm || st.wpm >= item.minWpm);
      return { goed: ok ? 1 : 0, totaal: 1, antwoord: `${Math.round(st.nauwk * 100)} % juist, ${Math.round(st.wpm)} wpm`, juist: `minstens ${item.minNauwkeurigheid || 90} %` + (item.minWpm ? ` en ${item.minWpm} wpm` : '') };
    },
    reveal(r) { ta.disabled = true; ta.classList.add(r.goed ? 'goed' : 'mis'); },
  };
};

// ---------- upload (niet gescoord) ----------
TYPES.upload = (item, { saveGallery }) => {
  let data = null;
  const prev = h('div', { class: 'upload-prev' }, h('span', { class: 'leeg' }, 'Nog geen foto gekozen.'));
  const inp = h('input', { type: 'file', accept: 'image/*', class: 'file', 'aria-label': 'Kies een foto' });
  inp.addEventListener('change', async () => {
    const f = inp.files?.[0]; if (!f) return;
    data = await verklein(f, 260);
    prev.innerHTML = ''; prev.append(h('img', { src: data, alt: 'Voorbeeld van je foto' }), h('span', {}, f.name));
    this_name = f.name;
  });
  let this_name = '';
  return {
    el: h('div', {}, h('label', { class: 'btn upload-btn' }, 'Kies een foto', inp), prev, item.map ? h('p', { class: 'tip' }, `Je foto komt in de map '${item.map}' van de klasgalerij.`) : null),
    ready: () => !!data || !!item.optioneel,
    async check() {
      if (data && saveGallery) await saveGallery({ data, titel: item.titel || item.map || 'Foto', map: item.map || 'Galerij', bestand: this_name });
      return { goed: 0, totaal: 0, antwoord: data ? 'foto opgeladen' : 'overgeslagen', juist: '' };
    },
    reveal() { inp.disabled = true; },
  };
};
function verklein(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = rej; img.src = url;
  });
}

// ---------- lezen (met optionele leestimer) ----------
TYPES.tekst = (item) => {
  const body = h('div', { class: 'leestekst' }, ...(item.tekst || []).map(p => h('p', {}, p)));
  let timerEl = null, start = null, minuten = 0;
  if (item.timer) {
    const disp = h('span', { class: 'timer-disp' }, '0:00');
    let iv = null;
    const b1 = h('button', { type: 'button', class: 'btn' }, 'Gestart');
    const b2 = h('button', { type: 'button', class: 'btn', disabled: true }, 'Gestopt');
    b1.onclick = () => { start = Date.now(); b1.disabled = true; b2.disabled = false; iv = setInterval(() => { const s = Math.floor((Date.now() - start) / 1000); disp.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500); };
    b2.onclick = () => { clearInterval(iv); minuten = (Date.now() - start) / 60000; b2.disabled = true; };
    timerEl = h('div', { class: 'leestimer' }, h('strong', {}, 'Leestimer: '), b1, b2, disp, h('span', { class: 'tip' }, ` Doel: ${item.timer} minuten lezen in je eigen boek.`));
  }
  return {
    el: h('div', {}, mediaKnoppen(item), timerEl, item.tekst ? leesKnop(() => item.tekst, { label: 'Lees de tekst voor' }) : null, body),
    ready: () => true, knop: item.timer ? 'Verder' : 'Ik heb gelezen',
    check() { return { goed: 0, totaal: 0, antwoord: item.timer ? `${Math.round(minuten)} minuten gelezen` : 'gelezen', juist: '', minuten }; },
    reveal() {},
  };
};
