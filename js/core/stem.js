// Voorlezen met een rustige Vlaamse stem. Alles wat de app voorleest, loopt via dit bestand.
//
// 1. Vaste teksten (missies, labo's, filmpjes, gidsen, spelletjes, het verhaal) kunnen vooraf opgenomen zijn met een
//    Vlaamse stem: audio/stem/manifest.json noemt de clips, audio/stem/<sleutel>.mp3 is de opname. De sleutel is
//    stemSleutel(tekst): FNV-1a (32 bit, hex) van de genormaliseerde tekst. tools/stemteksten.mjs maakt de lijst.
// 2. Is er geen clip, dan leest de browser voor. De beste stem eerst: de natuurlijke Vlaamse stemmen van Edge
//    (Arnaud, Dena), dan elke nl-BE-stem, dan Nederlands (nl-NL) als laatste redmiddel.
//    Rustig: trager en iets lager; lange teksten in zinnen, met een korte pauze ertussen (Chrome breekt lange
//    uitspraken af).
// 3. Voorlezen staat per reiziger op 'altijd' (filmpjes, gidsen en het verhaal lezen vanzelf voor), 'opvraag'
//    (enkel met de luidsprekerknop) of 'uit' (geen knoppen, geen stem).

const TEMPO = 0.85, TOON = 0.95, PAUZE_MS = 280;
const MANIFEST_URL = 'audio/stem/manifest.json';

// ---------------------------------------------------------------- tekst en sleutel
/** Zelfde tekst, zelfde sleutel: spaties samenvoegen en bijknippen. */
export function normaliseer(tekst) {
  return String(tekst ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}
/** FNV-1a 32 bit over de UTF-8-bytes van de genormaliseerde tekst, als 8 hexcijfers. */
export function stemSleutel(tekst) {
  const bytes = new TextEncoder().encode(normaliseer(tekst));
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** Een tekst in zinnen knippen; erg lange zinnen nog eens bij een komma of puntkomma. */
export function zinnen(tekst, max = 180) {
  const t = normaliseer(tekst); if (!t) return [];
  const delen = t.match(/[^.!?…]+(?:[.!?…]+["'”’)]*|$)/g) || [t];
  const uit = [];
  for (let d of delen.map(x => x.trim()).filter(Boolean)) {
    while (d.length > max) {
      let knip = Math.max(d.lastIndexOf(', ', max), d.lastIndexOf('; ', max), d.lastIndexOf(': ', max));
      if (knip < 40) knip = d.lastIndexOf(' ', max);
      if (knip < 20) knip = max;
      uit.push(d.slice(0, knip + 1).trim()); d = d.slice(knip + 1).trim();
    }
    if (d) uit.push(d);
  }
  return uit;
}

// Uitspraak voor de browserstem (de opnames gebruiken de gewone tekst).
const UITSPRAAK = [
  [/\bXP\b/g, 'ex-pee'], [/\bHP\b/g, 'levenspunten'], [/\bkm\/u\b/g, 'kilometer per uur'], [/\bkm\b/g, 'kilometer'],
  [/(\d)\s?°C\b/g, '$1 graden'], [/°/g, ' graden'], [/(\d)\s?%/g, '$1 procent'], [/\bmm\b/g, 'millimeter'], [/\bhPa\b/g, 'hectopascal'],
  [/\bm\/s\b/g, 'meter per seconde'], [/\s-\s/g, ', '], [/\bbv\./g, 'bijvoorbeeld'], [/\bvb\./g, 'voorbeeld'],
];
export function uitspraak(tekst) {
  let t = normaliseer(tekst).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  for (const [re, door] of UITSPRAAK) t = t.replace(re, door);
  return t;
}

// ---------------------------------------------------------------- stemmen
/** Hoe goed past een stem? Hoger is beter; < 0 = niet Nederlands. */
export function stemScore(v) {
  const lang = String(v?.lang || '').replace('_', '-').toLowerCase(), naam = String(v?.name || '');
  if (!lang.startsWith('nl')) return -1;
  const be = lang === 'nl-be' || /belgi|flemish|vlaams/i.test(naam);
  const natuurlijk = /natural|neural|online/i.test(naam);
  let s = be ? 60 : lang === 'nl-nl' ? 20 : 15;
  if (be && natuurlijk) s += 40;
  if (be && /arnaud/i.test(naam)) s += 6;
  if (be && /dena/i.test(naam)) s += 5;
  if (!be && natuurlijk) s += 8;
  if (v.localService === false && !natuurlijk) s -= 1;
  return s;
}
/** De stemmen gesorteerd, de beste eerst (enkel Nederlands). */
export function rangschikStemmen(stemmen = []) {
  return [...stemmen].map(v => ({ v, s: stemScore(v) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s).map(x => x.v);
}

let gekozen = null, stemmenGeladen = false;
const luisteraars = new Set();
function synth() { try { return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null; } catch { return null; } }
function laadStemmen() {
  const s = synth(); if (!s) return;
  const lijst = s.getVoices() || [];
  if (lijst.length) stemmenGeladen = true;
  const nieuw = rangschikStemmen(lijst)[0] || null;
  if (nieuw !== gekozen) { gekozen = nieuw; for (const f of luisteraars) { try { f(stemInfo()); } catch { /* */ } } }
}
if (synth()) {
  laadStemmen();
  try { synth().addEventListener?.('voiceschanged', laadStemmen); } catch { /* oude browser */ }
  if (!synth().addEventListener) synth().onvoiceschanged = laadStemmen;
}
/** Roep f(info) op als de stemmen (later) geladen zijn of veranderen. Geeft een stopfunctie. */
export function opStemmen(f) { luisteraars.add(f); return () => luisteraars.delete(f); }

// ---------------------------------------------------------------- opnames
let manifest = null, manifestBezig = null;
function laadManifest() {
  if (manifest || manifestBezig || typeof fetch === 'undefined') return manifestBezig;
  manifestBezig = fetch(MANIFEST_URL, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => {
    const clips = new Map();
    const c = j?.clips ?? j;
    if (Array.isArray(c)) for (const k of c) clips.set(String(k), `${k}.mp3`);
    else if (c && typeof c === 'object') for (const [k, v] of Object.entries(c)) if (/^[0-9a-f]{8}$/.test(k)) clips.set(k, typeof v === 'string' ? v : `${k}.mp3`);
    manifest = { clips, stem: j?.stem || '' };
    return manifest;
  });
  return manifestBezig;
}
if (typeof window !== 'undefined') laadManifest();
function clipVoor(tekst) { const f = manifest?.clips.get(stemSleutel(tekst)); return f ? `audio/stem/${f}` : null; }

export function stemInfo() {
  const v = gekozen;
  const be = v ? stemScore(v) >= 60 : false;
  return {
    naam: v?.name || null, lang: v?.lang || null, vlaams: be, natuurlijk: be && stemScore(v) >= 100,
    clips: manifest?.clips.size || 0, geladen: stemmenGeladen, kan: !!synth() || (manifest?.clips.size || 0) > 0,
  };
}
/** Een korte zin over de stem, voor de instellingen. */
export function stemTekst() {
  const i = stemInfo();
  const opn = i.clips ? `Vaste teksten: Vlaamse opnames (${i.clips}). ` : '';
  if (!i.naam) return opn + (synth() ? 'Andere teksten: geen Nederlandse stem gevonden op dit toestel.' : 'Deze browser kan niet voorlezen.');
  return opn + `${i.clips ? 'Andere teksten' : 'Stem'}: ${i.naam}${i.vlaams ? ' (Vlaams)' : ' (Nederlands, niet Vlaams)'}.`;
}

// ---------------------------------------------------------------- instelling per reiziger
let reiziger = null;
const STAND_SLEUTEL = (pid) => `vagant:voorlezen:${pid || 'gast'}`;
/** Wie gebruikt de app? (pupil-object of null). De standaard hangt af van de route: Kompas leest vanzelf voor. */
export function zetReiziger(p) { reiziger = p || null; pasLichaamAan(); }
export function voorleesStand() {
  try { const s = localStorage.getItem(STAND_SLEUTEL(reiziger?.id)); if (['altijd', 'opvraag', 'uit'].includes(s)) return s; } catch { /* geen opslag */ }
  return standaardStand(reiziger);
}
export function standaardStand(p) {
  if (!p || p.leerkracht) return 'opvraag';
  const r = Object.values(p.routes || {});
  return !r.length || r.filter(x => x === 'kompas').length * 2 >= r.length ? 'altijd' : 'opvraag';
}
export function zetVoorleesStand(s) {
  try { localStorage.setItem(STAND_SLEUTEL(reiziger?.id), s); } catch { /* geen opslag */ }
  if (s === 'uit') stopSpreken();
  pasLichaamAan();
}
function pasLichaamAan() { try { document.body.classList.toggle('voorlezen-uit', voorleesStand() === 'uit'); } catch { /* geen DOM */ } }
/** Leest dit soort tekst vanzelf voor? soort: 'filmpje' | 'gids' | 'verhaal' | 'geheim' */
export function leestVanzelf() { return voorleesStand() === 'altijd'; }

// ---------------------------------------------------------------- spreken
let generatie = 0, speler = null, bezig = false;
const statusLuisteraars = new Set();
function meld(aan) { bezig = aan; for (const f of statusLuisteraars) { try { f(aan); } catch { /* */ } } }
export function opSpreken(f) { statusLuisteraars.add(f); return () => statusLuisteraars.delete(f); }
export function spreektNu() { return bezig; }

/** Stop alles wat nu voorgelezen wordt (en wat nog in de rij staat). */
export function stopSpreken() { stopIntern(); if (bezig) meld(false); }
function stopIntern() {
  generatie++;
  try { synth()?.cancel(); } catch { /* */ }
  try { if (speler) { speler.pause(); speler.removeAttribute('src'); } } catch { /* */ }
}

const wacht = (ms) => new Promise(r => setTimeout(r, ms));
function speelClip(url, gen) {
  return new Promise((klaar) => {
    try {
      speler = speler || new Audio();
      const a = speler;
      let af = false;
      const einde = (ok) => { if (af) return; af = true; a.onended = a.onerror = null; klaar(ok); };
      a.onended = () => einde(true); a.onerror = () => einde(false);
      a.src = url; a.playbackRate = 1;
      const p = a.play(); if (p?.catch) p.catch(() => einde(false));
      // veiligheid: nooit blijven hangen
      const check = setInterval(() => { if (gen !== generatie) { clearInterval(check); einde(true); } }, 200);
      a.addEventListener('ended', () => clearInterval(check), { once: true });
      a.addEventListener('error', () => clearInterval(check), { once: true });
    } catch { klaar(false); }
  });
}
function zegZin(zin, gen) {
  return new Promise((klaar) => {
    const s = synth(); if (!s || gen !== generatie) return klaar(false);
    try {
      const u = new SpeechSynthesisUtterance(uitspraak(zin));
      if (gekozen) u.voice = gekozen;
      u.lang = gekozen?.lang || 'nl-BE'; u.rate = TEMPO; u.pitch = TOON;
      let af = false; const einde = (ok) => { if (!af) { af = true; clearTimeout(t); klaar(ok); } };
      u.onend = () => einde(true); u.onerror = () => einde(false);
      // als onend nooit komt (sommige Chromebooks): na een ruime schatting toch verder
      const t = setTimeout(() => einde(true), 2500 + zin.length * 110);
      s.speak(u);
    } catch { klaar(false); }
  });
}

/**
 * Lees voor. tekst: een tekst of een lijst stukken (bv. [vraag, ...antwoorden]); elk stuk wordt apart opgezocht in de
 * opnames. Een nieuwe spreek() stopt de vorige. Geeft een belofte die klaar is als alles voorgelezen werd
 * (true) of als het gestopt werd of niet kon (false).
 * opts.vanzelf: true als de app uit zichzelf voorleest (dan enkel bij de stand 'altijd').
 * opts.nodig: de oefening is luisteren (dictee): altijd spreken.
 */
export async function spreek(tekst, { vanzelf = false, nodig = false } = {}) {
  const stand = voorleesStand();
  // nodig: de oefening zelf is luisteren (bv. een dictee), dan ook bij 'uit'
  if (!nodig && (stand === 'uit' || (vanzelf && stand !== 'altijd'))) return false;
  const stukken = [].concat(tekst).map(normaliseer).filter(Boolean);
  if (!stukken.length) return false;
  stopIntern();
  const gen = generatie;
  meld(true);
  await laadManifest();
  if (gen !== generatie) return false;
  if (!gekozen) laadStemmen();
  let alles = true;
  for (let i = 0; i < stukken.length; i++) {
    const stuk = stukken[i];
    const clip = clipVoor(stuk);
    // een opname die niet wil spelen (ontbreekt, geblokkeerd): dan toch de stem van de browser
    if (clip && await speelClip(clip, gen)) { /* opname gespeeld */ }
    else {
      for (const zin of zinnen(stuk)) {
        if (gen !== generatie) return false;
        const zc = clip ? null : clipVoor(zin);
        const ok = (zc && await speelClip(zc, gen)) || await zegZin(zin, gen);
        if (!ok) alles = false;
        if (gen !== generatie) return false;
        await wacht(PAUZE_MS);
      }
    }
    if (gen !== generatie) return false;
    if (i < stukken.length - 1) await wacht(PAUZE_MS);
  }
  if (gen === generatie) meld(false);
  return alles && gen === generatie;
}

// ---------------------------------------------------------------- knoppen
const SVG_LUID = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/></svg>';
const SVG_STOP = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';

/** De leesbare tekst van een stuk scherm, als lijst stukken (knoppen, invoervelden en [data-stil] worden overgeslagen). */
export function tekstVan(el) {
  if (!el) return [];
  const uit = [];
  const BLOK = /^(P|LI|H1|H2|H3|H4|H5|LABEL|SMALL|B|STRONG|DT|DD|FIGCAPTION|TD|TH|SPAN|DIV)$/;
  const loop = (n) => {
    if (n.nodeType === 3) return;
    if (n.nodeType !== 1) return;
    if (n.matches?.('button, input, textarea, select, script, style, svg, canvas, [hidden], [data-stil], [aria-hidden="true"], .lees-knop')) {
      // een gekozen antwoordknop met tekst lezen we wel (meerkeuze)
      if (n.matches('button.optie, button.keuze, button[data-lees]')) { const t = normaliseer(n.textContent); if (t) uit.push(t); }
      return;
    }
    const heeftBlokKind = [...n.children].some(c => /^(P|LI|H1|H2|H3|H4|UL|OL|DIV|SECTION|TABLE|LABEL|FIGURE|BUTTON|HEADER|FOOTER)$/.test(c.tagName));
    if (BLOK.test(n.tagName) && !heeftBlokKind) { const t = normaliseer(n.textContent); if (t) uit.push(t); return; }
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { const t = normaliseer(c.textContent); if (t && heeftBlokKind) uit.push(t); }
      else loop(c);
    }
  };
  loop(el);
  // dubbels na elkaar weg
  return uit.filter((t, i) => t !== uit[i - 1]);
}

/**
 * Een luidsprekerknop. wat: tekst, lijst stukken, een element (leest de tekst ervan) of een functie die een van die geeft.
 * opts: { label: 'Lees voor', klein: true, klasse }
 */
export function leesKnop(wat, { label = 'Lees voor', klein = true, klasse = '', titel = 'Lees voor' } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn lees-knop${klein ? ' klein' : ''}${label ? '' : ' rond'} ${klasse}`.trim();
  b.title = titel; b.setAttribute('aria-label', label || titel);
  const zet = (aan) => { b.innerHTML = (aan ? SVG_STOP : SVG_LUID) + (label ? `<span>${aan ? 'Stop' : label}</span>` : ''); b.classList.toggle('spreekt', aan); };
  zet(false);
  let mijnGen = -1;
  const luister = () => {
    if (!b.isConnected && mijnGen < 0) { statusLuisteraars.delete(luister); return; }
    if (mijnGen >= 0 && (mijnGen !== generatie || !bezig)) { mijnGen = -1; zet(false); }
  };
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mijnGen === generatie && bezig) { stopSpreken(); return; }
    let w = typeof wat === 'function' ? wat() : wat;
    if (w && w.nodeType === 1) w = tekstVan(w);
    statusLuisteraars.add(luister);
    mijnGen = generatie + 1;             // spreek() begint met een nieuwe generatie
    zet(true);
    spreek(w).then(() => luister());
  });
  return b;
}

// stoppen bij weggaan
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', stopSpreken);
  window.addEventListener('hashchange', stopSpreken);
  window.addEventListener('popstate', stopSpreken);
  try { document.addEventListener('DOMContentLoaded', pasLichaamAan); } catch { /* */ }
}
