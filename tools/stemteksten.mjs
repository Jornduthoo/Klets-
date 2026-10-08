#!/usr/bin/env node
// Alle vaste teksten die de app kan voorlezen, als JSON [{ key, text, bron }] op stdout.
// Daarmee kan je vooraf Vlaamse opnames maken (bv. met Piper nl_BE). Per tekst: audio/stem/<key>.mp3, en zet de
// sleutels in audio/stem/manifest.json:  { "stem": "piper nl_BE-rdh", "clips": { "<key>": "<key>.mp3", ... } }
// (een lijst sleutels mag ook: { "clips": ["<key>", ...] }).
//
// De sleutel is stemSleutel(tekst) uit js/core/stem.js: FNV-1a 32 bit (hex) van de genormaliseerde tekst
// (spaties samengevoegd en bijgeknipt). De app zoekt eerst het hele stuk tekst op, dan elke zin apart; wat
// geen opname heeft, leest de stem van de browser voor.
//
//   node tools/stemteksten.mjs > stemteksten.json
//   node tools/stemteksten.mjs --zinnen     ook elke zin van lange teksten apart (meer, kortere clips)
//   node tools/stemteksten.mjs --tel        enkel tellen
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { normaliseer, stemSleutel, zinnen } = await import(join(ROOT, 'js/core/stem.js'));
const { THEMAS } = await import(join(ROOT, 'data/themas.js'));
const { GIDSEN } = await import(join(ROOT, 'js/config.js'));
const verhaal = await import(join(ROOT, 'js/city/verhaal.js'));
const { waterStand } = await import(join(ROOT, 'js/city/water.js'));
const { SPELLEN, GEHEIMEN } = await import(join(ROOT, 'js/spelletjes/geheimen.js'));

const MET_ZINNEN = process.argv.includes('--zinnen');
const uit = new Map();
function voeg(tekst, bron) {
  if (typeof tekst !== 'string') return;
  const t = normaliseer(tekst);
  if (t.length < 2 || !/[a-zA-Zà-ÿ]/.test(t)) return;
  const key = stemSleutel(t);
  if (!uit.has(key)) uit.set(key, { key, text: t, bron });
  if (MET_ZINNEN) { const z = zinnen(t); if (z.length > 1) for (const s of z) voeg(s, bron + ' (zin)'); }
}

// ---- 1. de thema's: alles wat een reiziger leest (geen tekeningen, geen doelen voor de leerkracht)
const LEESBAAR = new Set(['tekst', 'zegt', 'vraag', 'opties', 'zeg', 'intro', 'uitleg', 'verhaal', 'eind', 'titel', 'naam', 'context', 'hint', 'stad', 'juist', 'tip', 'opdracht', 'les', 'beschrijving', 'waar']);
const NIET = new Set(['beeld', 'doelen', 'goals', 'doel', 'anim', 'interieur']);
function loop(o, pad, sleutel) {
  if (o == null) return;
  if (typeof o === 'string') { if (LEESBAAR.has(sleutel)) voeg(o, pad); return; }
  if (Array.isArray(o)) { o.forEach((x, i) => loop(x, `${pad}[${i}]`, sleutel)); return; }
  if (typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!NIET.has(k)) loop(v, pad ? `${pad}.${k}` : k, k); }
}
for (const th of THEMAS) {
  const T = th.data || th;
  if (!T || typeof T !== 'object') continue;
  loop(T, T.id || th.id, '');
  // de check van een labo (de intro wordt in labo.js samengesteld)
  for (const [id, lab] of Object.entries(T.labos || {})) voeg(`${GIDSEN[lab.gids]?.naam || 'De gids'} kijkt mee. Toon wat je in het labo leerde.`, `labo ${id} check`);
  for (const w of T.weken || []) voeg(`Week ${w.week}: ${w.titel}`, `week ${w.week}`);
  for (const m of T.missies || []) voeg(`Welkom, reiziger. Klaar voor '${m.naam}'?`, `missie ${m.id}`);

  // ---- 2. het verhaal in de stad: elke stap (titel, zin, extra)
  if (verhaal.heeftVerhaal(T)) {
    for (const [code] of verhaal.VERHAAL_STAPPEN) {
      const inv = verhaal.previewInvoer(code, T); if (!inv) continue;
      const st = verhaal.verhaalStand(inv, verhaal.previewWater(inv, T), T);
      for (const k of ['titel', 'zin', 'extra']) voeg(st.tekst?.[k], `verhaal ${code}`);
    }
    // "Nog N slijkarmen in de stad." voor elk aantal
    for (let n = 1; n <= 20; n++) voeg(`Nog ${n} slijkarm${n === 1 ? '' : 'en'} in de stad.`, 'verhaal armen');
    void waterStand;
  }
}

// ---- 3. de gidsen
for (const g of Object.values(GIDSEN)) voeg(`${g.naam}: ${g.rol}`, 'gids');

// ---- 4. de spelletjes van de geheimen
for (const sp of Object.values(SPELLEN)) {
  voeg(sp.titel, `spel ${sp.id}`);
  for (const u of sp.uitleg || []) voeg(u.tekst, `spel ${sp.id}`);
}
for (const g of GEHEIMEN) { voeg(g.naam, 'geheim'); voeg(g.hint, 'geheim'); }
for (let a = 1; a <= GEHEIMEN.length; a++) voeg(`Geheim gevonden! ${a} van de ${GEHEIMEN.length}.`, 'geheim');

// ---- 5. vaste zinnen in de broncode van de reizigersschermen (enkele aanhalingstekens, zonder ${...})
const BRONNEN = ['js/pupil/app.js', 'js/missions/engine.js', 'js/missions/types.js', 'js/labo', 'js/spelletjes', 'js/city/weer.js', 'js/city/water.js'];
function bestanden(p) {
  const vol = join(ROOT, p);
  try { return readdirSync(vol).filter(f => f.endsWith('.js')).flatMap(f => bestanden(join(p, f))); } catch { return [p]; }
}
for (const f of BRONNEN.flatMap(bestanden)) {
  const src = readFileSync(join(ROOT, f), 'utf8');
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.){12,})'/g)) {
    const t = m[1].replace(/\\'/g, "'");
    // een zin: hoofdletter vooraan, spatie erin, leesteken achteraan; geen code, CSS of URL
    if (!/^[A-ZÀ-Ý"]/.test(t) || !/\s/.test(t) || !/[.!?:]$/.test(t) || /[{}<>=;$]|\bhttps?:|\.js\b|^[A-Z_]+$/.test(t)) continue;
    voeg(t, f);
  }
  // en de zinnen in sjablonen zonder ${...}
  for (const m of src.matchAll(/`([^`$\n]{12,})`/g)) { const t = m[1]; if (/^[A-ZÀ-Ý]/.test(t) && /\s/.test(t) && /[.!?]$/.test(t)) voeg(t, f); }
}

const lijst = [...uit.values()];
if (process.argv.includes('--tel')) console.log(`${lijst.length} teksten, ${lijst.reduce((s, x) => s + x.text.length, 0)} tekens`);
else process.stdout.write(JSON.stringify(lijst, null, 1) + '\n');
