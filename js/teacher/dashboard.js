// Leerkrachtendashboard van Vagant: thema en week kiezen, reizigers en routes, resultaten per doelcode,
// Revanche, weekoverzicht met de labo's, de eindbaas starten, geheime codes en instellingen.
// Alle inhoud komt uit het gekozen thema (data/themas.js). Niets staat op slot voor de leerkracht.
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, rng, toast, downloadFile } from '../core/util.js';
import { MACHTEN, MACHT, ROUTES, ROUTE, GIDSEN, DAGEN, METHODE } from '../config.js';
import { THEMAS, themaVoor } from '../../data/themas.js';
import { themaCatalog, doelStats, doelStatus, rangVoor, klasXP, codeIndex, beloningVoor, machtVanCode, klasstadGebouwen, uitrustingLijst } from '../core/model.js';
import { waterStand, waterTekst } from '../city/water.js';
import { VERHAAL_STAPPEN, heeftVerhaal } from '../city/verhaal.js';
import { leesKnop, stemInfo, stemTekst, opStemmen } from '../core/stem.js';
import { avatarBeeld } from '../figuren/portret.js';
import { AVATAR_OPTIES, willekeurigeLook } from '../figuren/uiterlijk.js';
import { backendKeuze, zetBackend, klaslink, projectUrl } from '../core/backend.js';
import { BACKEND } from '../config.js';
import * as SB from '../core/supabase.js';

const store = createStore();
const sync = createSync('klas');
/** Staat de klas online (Supabase)? Dan meldt de leerkracht zich aan met e-mail en wachtwoord i.p.v. de PIN. */
const ONLINE = backendKeuze().online;
const D = { settings: null, pupils: [], attempts: [], events: [], stats: {}, tab: 'overzicht', week: 1, routeFilter: 'alle', raid: null };
window.__dash = D;

let THEMA = themaVoor(), CATALOG = [], CODES = {}, UITRUSTING = {};
function zetThema(settings) {
  THEMA = themaVoor(settings);
  CATALOG = themaCatalog(THEMA);
  CODES = codeIndex(THEMA);
  UITRUSTING = uitrustingLijst(THEMA);
}
const weekVan = (n) => THEMA.weken.find(w => w.week === n) || THEMA.weken[0] || { week: 1, titel: '' };
const stadNaam = () => D.settings?.klasNaam || THEMA.stad;

const TABS = [
  ['overzicht', 'Overzicht'], ['leerlingen', 'Reizigers en routes'], ['doelen', 'Doelen'], ['revanche', 'Revanche'],
  ['weken', 'Weekoverzicht'], ['labos', 'Labo\'s en water'], ['raid', 'Eindbaas'], ['codes', 'Geheime codes'], ['instellingen', 'Instellingen'],
];

async function init() {
  D.settings = await store.getSettings();
  zetThema(D.settings);
  D.week = D.settings.huidigeWeek;
  await sync.connect();
  sync.subscribe('raid:state', (st) => { D.raid = st; if (D.tab === 'raid' || D.tab === 'overzicht') render(); });
  sync.subscribe('klas:update', () => reload());
  store.onChange(() => reload());
  if (ONLINE) return startOnline();
  if (Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now()) return start();
  showPin();
}

// ---------- klas online: aanmelden als leerkracht en de klas maken ----------
const markeerLeerkracht = () => { try { localStorage.setItem('klets:v1:leerkrachtTot', String(Date.now() + 12 * 3600 * 1000)); } catch { /* */ } };
// een geweigerde of mislukte actie (bv. geen wifi) altijd tonen
window.addEventListener('unhandledrejection', (e) => { if (e.reason instanceof SB.VagantFout) { toast(e.reason.message); e.preventDefault(); } });

async function startOnline(melding = '') {
  let s;
  try { s = await SB.leerkrachtSessie(); } catch (e) { return showOnlineLogin(e.message); }
  if (!s) return showOnlineLogin(melding);
  const kl = SB.huidigeKlas();
  if (kl?.rol === 'leerkracht') { markeerLeerkracht(); return start(); }
  let klassen;
  try { klassen = await SB.mijnKlassen(); } catch (e) { return showOnlineLogin(e.message); }
  if (klassen.length) { SB.kiesKlas(klassen[klassen.length - 1]); markeerLeerkracht(); return start(); }
  showMaakKlas();
}
function loginKader(...inhoud) {
  const app = $('#app'); app.innerHTML = '';
  app.append(h('main', { class: 'login' }, h('div', { class: 'login-kop' }, h('h1', { class: 'logo' }, METHODE), h('p', {}, 'Leerkrachtendashboard - klas online')),
    ...inhoud,
    h('p', { class: 'login-voet' }, h('a', { href: 'index.html' }, 'Naar de stad'), ' - ',
      h('a', { href: '#', id: 'naar-lokaal', onclick: (e) => { e.preventDefault(); if (confirm('De klas online uitzetten op dit toestel? Je werkt dan weer met de gegevens van dit toestel alleen (PIN).')) { zetBackend({ aan: false }); location.reload(); } } }, 'Werk zonder klasdatabank (enkel dit toestel)'))));
}
function showOnlineLogin(melding = '') {
  const email = h('input', { type: 'email', class: 'invoer', id: 'lk-email', autocomplete: 'username', placeholder: 'naam@school.be', 'aria-label': 'E-mailadres' });
  const ww = h('input', { type: 'password', class: 'invoer', id: 'lk-wachtwoord', autocomplete: 'current-password', placeholder: 'wachtwoord', 'aria-label': 'Wachtwoord' });
  const fout = h('p', { class: 'fout', 'aria-live': 'polite' }, melding);
  const bezig = (aan) => { for (const b of document.querySelectorAll('.pin-blok button')) b.disabled = aan; };
  const aanmelden = async () => {
    bezig(true); fout.textContent = '';
    try { await SB.leerkrachtAanmelden(email.value.trim(), ww.value); await startOnline(); }
    catch (e) { fout.textContent = e.message; bezig(false); }
  };
  const registreren = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { fout.textContent = 'Typ je e-mailadres.'; return; }
    if (ww.value.length < 8) { fout.textContent = 'Kies een wachtwoord van minstens 8 tekens.'; return; }
    bezig(true); fout.textContent = '';
    try {
      const r = await SB.leerkrachtRegistreren(email.value.trim(), ww.value);
      if (r.bevestigen) { fout.textContent = 'Bijna klaar: klik op de link in de mail van Supabase en meld je daarna hier aan.'; bezig(false); return; }
      await startOnline();
    } catch (e) { fout.textContent = e.message; bezig(false); }
  };
  ww.addEventListener('keydown', e => { if (e.key === 'Enter') aanmelden(); });
  loginKader(h('section', { class: 'kaart-blok pin-blok' },
    h('h2', {}, 'Aanmelden als leerkracht'),
    h('label', { class: 'lbl', for: 'lk-email' }, 'E-mailadres'), email,
    h('label', { class: 'lbl', for: 'lk-wachtwoord' }, 'Wachtwoord'), ww, fout,
    h('button', { class: 'btn primair groot', type: 'button', id: 'lk-aanmelden', onclick: aanmelden }, 'Aanmelden'),
    h('button', { class: 'btn', type: 'button', id: 'lk-registreren', onclick: registreren }, 'Eerste keer? Maak een account'),
    h('p', { class: 'tip' }, 'Enkel de leerkracht heeft een account. Reizigers gebruiken geen e-mail: zij melden zich aan met de klascode en een bijnaam.')));
  email.focus();
}
function showMaakKlas() {
  const naam = h('input', { type: 'text', class: 'invoer', id: 'klas-naam', maxlength: 40, placeholder: 'bv. 6A', 'aria-label': 'Naam van de klas' });
  const fout = h('p', { class: 'fout', 'aria-live': 'polite' });
  const knop = h('button', { class: 'btn primair groot', type: 'button', id: 'klas-maken' }, 'Maak de klas');
  knop.onclick = async () => {
    knop.disabled = true;
    try { const k = await SB.maakKlas(naam.value.trim()); markeerLeerkracht(); toonNieuweKlas(k); }
    catch (e) { fout.textContent = e.message; knop.disabled = false; }
  };
  loginKader(h('section', { class: 'kaart-blok pin-blok' },
    h('h2', {}, 'Maak je klas'),
    h('p', {}, 'Je klas krijgt een klascode van 6 tekens. Reizigers typen die code (of scannen de QR-code) en kiezen een bijnaam.'),
    h('label', { class: 'lbl', for: 'klas-naam' }, 'Naam van de klas (mag leeg blijven, geen schoolnaam nodig)'), naam, fout, knop,
    h('button', { class: 'btn zacht', type: 'button', onclick: async () => { await SB.afmelden(); showOnlineLogin(); } }, 'Afmelden')));
  naam.focus();
}
function toonNieuweKlas(k) {
  loginKader(h('section', { class: 'kaart-blok pin-blok' },
    h('h2', {}, 'Je klas is klaar'),
    h('p', {}, 'De klascode:'), h('p', { class: 'klascode-groot', id: 'nieuwe-klascode' }, k.code),
    h('p', { class: 'tip' }, 'Bij Instellingen vind je de klaslink en de QR-code voor de Chromebooks, en bij Reizigers de pincodes.'),
    h('button', { class: 'btn primair groot', type: 'button', id: 'naar-dashboard', onclick: () => start() }, 'Naar het dashboard')));
}
/** QR-code als SVG (vendor/qrcode-generator, geen netwerk). */
async function qrBeeld(tekst) {
  const { default: qrcode } = await import('../../vendor/qrcode-generator-1.4.4.esm.js');
  const q = qrcode(0, 'M'); q.addData(tekst); q.make();
  return h('div', { class: 'qr', html: q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: 'QR-code met de klaslink' }) });
}

function showPin() {
  const app = $('#app'); app.innerHTML = '';
  const inp = h('input', { type: 'password', inputmode: 'numeric', class: 'invoer', id: 'pin', autocomplete: 'off', 'aria-label': 'PIN', placeholder: 'PIN' });
  const fout = h('p', { class: 'fout', 'aria-live': 'polite' });
  const go = async () => {
    const s = await store.getSettings();
    if (inp.value === s.pin) { localStorage.setItem('klets:v1:leerkrachtTot', String(Date.now() + 4 * 3600 * 1000)); start(); }
    else { fout.textContent = 'Die PIN klopt niet.'; inp.select(); }
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  app.append(h('main', { class: 'login' }, h('div', { class: 'login-kop' }, h('h1', { class: 'logo' }, METHODE), h('p', {}, 'Leerkrachtendashboard')),
    h('section', { class: 'kaart-blok pin-blok' }, h('label', { class: 'lbl', for: 'pin' }, 'Geef de PIN van de leerkracht'), inp, fout,
      h('button', { class: 'btn primair groot', type: 'button', id: 'pin-ok', onclick: go }, 'Open het dashboard'),
      h('p', { class: 'tip' }, 'De standaard-PIN staat in de README. Verander hem bij Instellingen.')),
    h('p', { class: 'login-voet' }, h('a', { href: 'index.html' }, 'Naar de stad'))));
  inp.focus();
}

async function start() { await reload(); }
async function reload() {
  if (ONLINE) { D.klas = SB.huidigeKlas(); try { D.pins = Object.fromEntries((await SB.reizigersMetPin()).map(r => [r.pid, r.pin])); } catch { D.pins = D.pins || {}; } }
  D.settings = await store.getSettings();
  zetThema(D.settings);
  D.pupils = (await store.listPupils()).filter(p => !p.leerkracht);
  D.attempts = await store.listAttempts();
  D.events = await store.listEvents();
  D.stats = doelStats(D.attempts);
  D.water = waterStand({ thema: THEMA, attempts: D.attempts, pupils: D.pupils, events: D.events });
  render();
}
async function saveSettings(patch) { D.settings = await store.saveSettings(patch); zetThema(D.settings); sync.publish('klas:update', {}); toast('Opgeslagen.'); render(); }

function render() {
  const app = $('#app'); app.innerHTML = '';
  const nav = h('nav', { class: 'dash-tabs', 'aria-label': 'Onderdelen' }, ...TABS.map(([id, naam]) => h('button', { type: 'button', class: 'tab' + (D.tab === id ? ' sel' : ''), 'aria-current': D.tab === id ? 'page' : null, dataset: { tab: id }, onclick: () => { D.tab = id; render(); } }, naam)));
  const main = h('main', { class: 'dash-main' });
  app.append(h('div', { class: 'dash' },
    h('header', { class: 'dash-kop' }, h('h1', { class: 'logo mini' }, METHODE),
      h('span', { class: 'dash-sub' }, `Thema ${THEMA.nr}: ${THEMA.naam} - ${stadNaam()} - week ${D.settings.huidigeWeek}`),
      themaKiezer(), weekKiezer(),
      ONLINE && D.klas ? h('span', { class: 'klascode-chip', id: 'kop-klascode', title: 'Klascode voor de reizigers' }, 'Klascode ', h('b', {}, D.klas.code)) : null,
      h('a', { class: 'btn klein', href: 'index.html?leerkracht=1' }, 'Open de stad als leerkracht'),
      h('button', { class: 'btn klein zacht', type: 'button', onclick: async () => { localStorage.removeItem('klets:v1:leerkrachtTot'); if (ONLINE) { await SB.afmelden(); showOnlineLogin(); } else showPin(); } }, 'Afmelden')),
    nav, main));
  ({ overzicht, leerlingen, doelen, revanche, weken, labos, raid, codes, instellingen })[D.tab](main);
}

function themaKiezer() {
  return h('label', { class: 'kop-kiezer' }, 'Thema ', h('select', {
    id: 'set-thema', 'aria-label': 'Thema van de klas',
    onchange: (e) => saveSettings({ huidigThema: e.target.value }),
  }, ...THEMAS.map(t => h('option', { value: t.id, selected: D.settings.huidigThema === t.id, disabled: !t.data }, `${t.nr}. ${t.naam} (${t.stad})${t.data ? '' : ' - binnenkort'}`))));
}
function weekKiezer() {
  return h('label', { class: 'kop-kiezer' }, 'Week ', h('select', {
    id: 'set-week-kop', 'aria-label': 'Huidige week',
    onchange: (e) => saveSettings({ huidigeWeek: +e.target.value }),
  }, ...THEMA.weken.map(w => h('option', { value: w.week, selected: D.settings.huidigeWeek === w.week }, `${w.week}. ${w.titel}`))));
}

// ---------- hulp ----------
function avatar(look) { return avatarBeeld(look, { px: 40, klasse: 'avatar dash-avatar' }); }
function doelRoute(code) { return THEMA.doelen[code]?.route || ''; }
function doelTekst(code) { return THEMA.doelen[code]?.doel || ''; }
function doelWeek(code) { return THEMA.doelen[code]?.week || 0; }
function codesVanWeek(week, route = 'alle') {
  return Object.keys(THEMA.doelen)
    .filter(c => (week === 'alle' || doelWeek(c) === week) && (route === 'alle' || doelRoute(c) === route))
    .sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
}
/** Volgt deze reiziger de route van dit doel voor het bijhorende domein? */
function volgtRoute(p, code) {
  const r = doelRoute(code); if (!r || !['kompas', 'telescoop'].includes(r)) return true;
  const domein = THEMA.doelen[code]?.domein || machtVanCode(code, THEMA);
  return (p.routes?.[domein] || 'kompas') === r;
}
function stat(pid, code) { return D.stats[pid]?.[code]; }
const STATUS_TXT = { behaald: 'behaald', oefenen: 'Revanche', open: 'nog niet' };

// ---------- overzicht ----------
function overzicht(main) {
  const xp = klasXP(D.pupils);
  const gebouwen = klasstadGebouwen(D.stats, THEMA.doelen);
  let behaald = 0, revanche = 0;
  for (const s of Object.values(D.stats)) for (const st of Object.values(s)) doelStatus(st) === 'behaald' ? behaald++ : revanche++;
  const gehaaldeLabos = Object.values(D.water.labos).filter(l => l.klaar).length;
  add(main,
    h('div', { class: 'tegels' },
      tegel(D.pupils.length, 'reizigers'), tegel(xp, 'XP van de klas'),
      tegel(Math.round(D.water.helder * 100) + ' %', 'proper water in de stad'),
      tegel(`${gehaaldeLabos}/${Object.keys(D.water.labos).length}`, 'labo\'s gehaald door de klas'),
      tegel(D.attempts.length, 'gemaakte missies'), tegel(behaald, 'doelen behaald (reiziger x doel)'),
      tegel(revanche, 'op de Revanchelijst'), tegel(gebouwen.length, 'gebouwen in de klasstad')),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Snel'),
      h('div', { class: 'knoppen links' },
        h('label', { class: 'schakel' }, h('input', { type: 'checkbox', id: 'alles-open', checked: D.settings.allesOpen, onchange: (e) => saveSettings({ allesOpen: e.target.checked }) }), ' Alles open (ook latere weken)'),
        h('a', { class: 'btn primair', href: 'digibord.html' }, 'Start de eindbaas op het digibord'),
        h('a', { class: 'btn', href: 'digibord.html?view=stad', id: 'open-stad' }, 'Toon de klasstad op het digibord'),
        h('button', { class: 'btn', type: 'button', onclick: exportCSV }, 'Exporteer resultaten (CSV)'))),
    D.raid && ['lobby', 'actief'].includes(D.raid.status) ? h('p', { class: 'info-blok' }, `De eindbaas loopt: ${D.raid.naam} - ${D.raid.hp}/${D.raid.maxHp} HP.`) : null,
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Zo werkt het'),
      h('ul', {}, h('li', {}, `${METHODE} werkt in thema's van vijf weken. Elk thema is een stad: dit thema is ${THEMA.naam} in ${THEMA.stad}.`),
        h('li', {}, 'Reizigers melden zich aan met een voornaam of bijnaam en een avatar. Geen e-mail, geen wachtwoord.'),
        h('li', {}, 'In de stad gaan ze themagebouwen binnen: daar bekijken ze een filmpje, doen ze een proefopstelling en maken ze de check. Alles wordt automatisch verbeterd en per doelcode bewaard.'),
        h('li', {}, 'Een doel is behaald vanaf 70 % juist in een poging. Lager = Revanchelijst.'),
        h('li', {}, `Haalt de helft van de klas een labo, dan wordt een stuk water van ${THEMA.stad} weer helder. Na de eindbaas is alles blauw.`),
        h('li', {}, 'Het weer en het seizoen in de stad volgen de echte weersvoorspelling van Brugge.'),
        h('li', {}, 'Let op: elk toestel bewaart zijn eigen gegevens (localStorage). Gebruik Exporteer/Importeer (JSON) bij Instellingen om toestellen samen te voegen.'))));
}
const tegel = (b, s) => h('div', { class: 'tegel-stat' }, h('b', {}, String(b)), h('small', {}, s));

// ---------- reizigers ----------
function leerlingen(main) {
  const naam = h('input', { type: 'text', class: 'invoer', placeholder: 'Voornaam of bijnaam', maxlength: 16, 'aria-label': 'Nieuwe reiziger', id: 'nieuwe-naam' });
  const voegToe = async () => {
    const n = naam.value.trim(); if (n.length < 2) return toast('Typ een naam van minstens 2 letters.');
    if (D.pupils.some(p => p.naam.toLowerCase() === n.toLowerCase())) return toast('Die naam bestaat al.');
    const r = rng(n);
    await store.savePupil({ id: uid('ll'), naam: n, xp: 0, codes: [], kosmetiek: [], gemaakt: Date.now(), routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])), look: willekeurigeLook(r) });
    sync.publish('klas:update', {}); reload();
  };
  const tabel = h('table', { class: 'dash-tabel' },
    h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Naam'), ONLINE ? h('th', { title: 'Om op een ander toestel verder te spelen: naam + pincode' }, 'Pincode') : null, h('th', {}, 'XP en rang'), ...MACHTEN.map(m => h('th', { title: m.uitleg }, m.kort)), h('th', {}, 'Codes'), h('th', {}, ''))),
    h('tbody', {}, ...D.pupils.map(p => h('tr', {},
      h('td', {}, avatar(p.look)), h('td', {}, h('b', {}, p.naam), p.demo ? h('small', { class: 'tip' }, ' demo') : null),
      ONLINE ? h('td', { class: 'pin-cel' }, h('code', { class: 'code-chip', dataset: { pin: p.id } }, D.pins?.[p.id] || '----'), ' ',
        h('button', { class: 'btn klein zacht', type: 'button', title: 'Nieuwe pincode (heft ook een blokkering op)', onclick: async () => {
          if (!confirm(`Een nieuwe pincode voor ${p.naam}? De oude werkt dan niet meer op een nieuw toestel.`)) return;
          try { const pin = await SB.nieuwePin(p.id); toast(`Nieuwe pincode voor ${p.naam}: ${pin}`); reload(); } catch (e) { toast(e.message); }
        } }, 'Nieuw')) : null,
      h('td', {}, `${p.xp || 0} XP`, h('br'), h('small', {}, rangVoor(p.xp || 0).naam)),
      ...MACHTEN.map(m => h('td', {}, h('select', { class: 'route-select', 'aria-label': `Route ${m.naam} voor ${p.naam}`, dataset: { pid: p.id, macht: m.id }, onchange: async (e) => {
        const fresh = await store.getPupil(p.id); fresh.routes = { ...(fresh.routes || {}), [m.id]: e.target.value }; await store.savePupil(fresh); sync.publish('klas:update', {}); toast(`${p.naam}: ${m.naam} = ${ROUTE[e.target.value].naam}`); reload();
      } }, ...ROUTES.map(r => h('option', { value: r.id, selected: (p.routes?.[m.id] || 'kompas') === r.id }, r.naam))))),
      h('td', {}, String((p.codes || []).length)),
      h('td', {}, h('button', { class: 'btn klein gevaar', type: 'button', onclick: async () => { if (confirm(`${p.naam} en alle resultaten verwijderen?`)) { await store.deletePupil(p.id); sync.publish('klas:update', {}); reload(); } } }, 'Verwijder'))))));
  add(main,
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Routes per domein'),
      h('p', {}, 'Kies per reiziger en per domein de route: Kompas (doelen van het 4de leerjaar, met voorleesknop en stap voor stap) of Telescoop (doelen van het 6de leerjaar, met eigen onderzoek en rekenwerk). Een reiziger kan per domein een andere route volgen.'),
      h('div', { class: 'knoppen links' }, ...ROUTES.map(r => h('button', { class: 'btn klein', type: 'button', onclick: () => alleRoutes(r.id) }, `Iedereen ${r.naam}`)))),
    h('div', { class: 'tabel-scroll' }, tabel),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Reiziger toevoegen'), h('div', { class: 'code-rij' }, naam, h('button', { class: 'btn primair', type: 'button', onclick: voegToe }, 'Toevoegen')),
      h('p', { class: 'tip' }, ONLINE ? 'Reizigers kunnen zichzelf ook aanmaken op de startpagina (klascode + bijnaam). Elke reiziger krijgt een pincode: met naam + pincode speelt hij verder op een ander toestel. Verwijderen wist ook alle resultaten en koppelt zijn toestellen los.' : 'Reizigers kunnen zichzelf ook aanmaken op de startpagina.')));
}
async function alleRoutes(r) {
  if (!confirm(`Alle routes van alle reizigers op ${ROUTE[r].naam} zetten?`)) return;
  for (const p of D.pupils) { const f = await store.getPupil(p.id); f.routes = Object.fromEntries(MACHTEN.map(m => [m.id, r])); await store.savePupil(f); }
  sync.publish('klas:update', {}); reload();
}

// ---------- doelen ----------
function filters(onChange, { metRoute = true } = {}) {
  return h('div', { class: 'filters' },
    h('label', {}, 'Week ', h('select', { id: 'f-week', onchange: (e) => { D.week = e.target.value === 'alle' ? 'alle' : +e.target.value; onChange(); } },
      h('option', { value: 'alle', selected: D.week === 'alle' }, 'alle weken'), ...THEMA.weken.map(w => h('option', { value: w.week, selected: D.week === w.week }, `week ${w.week}: ${w.titel}`)))),
    metRoute ? h('label', {}, ' Route ', h('select', { id: 'f-route', onchange: (e) => { D.routeFilter = e.target.value; onChange(); } },
      h('option', { value: 'alle' }, 'alle routes'), ...ROUTES.map(r => h('option', { value: r.id, selected: D.routeFilter === r.id }, r.naam)))) : null);
}
function doelen(main) {
  const codes = codesVanWeek(D.week, D.routeFilter);
  const head = h('tr', {}, h('th', { class: 'sticky' }, 'Doelcode'), h('th', {}, 'Klas'), ...D.pupils.map(p => h('th', { class: 'naam-th' }, p.naam)));
  const rows = codes.map(code => {
    let b = 0, t = 0;
    const cells = D.pupils.map(p => {
      const st = stat(p.id, code); const s = doelStatus(st);
      if (st) { t++; if (s === 'behaald') b++; }
      if (!st && !volgtRoute(p, code)) return h('td', { class: 'cel nvt', title: 'Andere route' }, '-');
      return h('td', { class: 'cel ' + s, title: st ? `${p.naam}: ${Math.round(st.goed * 10) / 10}/${st.totaal} juist, beste poging ${Math.round(st.best * 100)} %, ${st.pogingen} poging(en)` : `${p.naam}: nog niet geoefend` }, st ? `${Math.round(st.best * 100)}%` : '');
    });
    const dm = THEMA.doelen[code]?.domein;
    return h('tr', {}, h('th', { class: 'sticky code-th', title: doelTekst(code) },
      h('span', { class: 'route-badge r-' + doelRoute(code) }, ROUTE[doelRoute(code)]?.kort || doelRoute(code).slice(0, 1).toUpperCase() || '?'), ' ',
      h('span', { class: 'macht-chip', style: { '--k': MACHT[dm]?.kleur } }, MACHT[dm]?.kort || ''), ' ', code,
      h('small', {}, doelTekst(code).slice(0, 80) + (doelTekst(code).length > 80 ? ' ...' : ''))),
    h('td', { class: 'cel klas' }, t ? `${b}/${t}` : '-'), ...cells);
  });
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Resultaten per doelcode'),
    h('p', {}, 'Groen = behaald (beste poging minstens 70 %). Oranje = Revanche (geprobeerd, nog niet behaald). Leeg = nog niet geoefend. Streepje = deze reiziger volgt een andere route voor dit domein.'),
    filters(() => render()),
    codes.length ? h('div', { class: 'tabel-scroll' }, h('table', { class: 'dash-tabel matrix', id: 'doelen-matrix' }, h('thead', {}, head), h('tbody', {}, ...rows))) : h('p', {}, 'Geen doelen voor deze keuze.')));
}

// ---------- revanche ----------
function revancheLijst() {
  const wk = D.week === 'alle' ? 'alle' : D.week;
  const codes = codesVanWeek(wk, D.routeFilter);
  const out = [];
  for (const code of codes) {
    const oefenen = [], nooit = [];
    for (const p of D.pupils) {
      const st = stat(p.id, code);
      if (st && doelStatus(st) === 'oefenen') oefenen.push({ p, st });
      else if (!st && volgtRoute(p, code) && (wk === 'alle' ? true : wk <= D.settings.huidigeWeek) && heeftOefening(code)) nooit.push({ p });
    }
    if (oefenen.length || nooit.length) out.push({ code, oefenen, nooit });
  }
  return out;
}
function heeftOefening(code) { return CATALOG.some(m => m.sets && Object.values(m.sets).some(items => (items || []).some(it => (it.goals || []).includes(code)))); }
function missiesVoorDoel(code) { return CATALOG.filter(m => m.sets && Object.values(m.sets).some(items => (items || []).some(it => (it.goals || []).includes(code)))); }
function revanche(main) {
  const lijst = revancheLijst();
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Revanchelijst'),
    h('p', {}, 'Welke doelen zijn nog niet behaald, en door wie? Reizigers zien dit als "Revanche: nog oefenen", nooit als een fout.'),
    filters(() => render()),
    h('div', { class: 'knoppen links' }, h('button', { class: 'btn', type: 'button', onclick: () => exportRevanche(lijst) }, 'Exporteer revanchelijst (CSV)')),
    lijst.length ? h('div', { class: 'revanche', id: 'revanche-lijst' }, ...lijst.map(r => {
      const mis = missiesVoorDoel(r.code);
      return h('div', { class: 'rev-kaart' },
        h('h3', {}, h('span', { class: 'route-badge r-' + doelRoute(r.code) }, ROUTE[doelRoute(r.code)]?.naam || doelRoute(r.code)), ' ', r.code),
        h('p', { class: 'tip' }, doelTekst(r.code)),
        r.oefenen.length ? h('p', {}, h('b', {}, 'Nog niet behaald: '), r.oefenen.map(x => `${x.p.naam} (${Math.round(x.st.best * 100)} %)`).join(', ')) : null,
        r.nooit.length ? h('p', {}, h('b', {}, 'Nog niet geoefend: '), r.nooit.map(x => x.p.naam).join(', ')) : null,
        mis.length ? h('p', { class: 'knoppen links' }, h('small', {}, 'Oefen opnieuw: '), ...mis.slice(0, 3).flatMap(m => ROUTES.map(rt =>
          h('a', { class: 'btn klein', href: `index.html?preview=${m.id}&route=${rt.id}`, title: `${m.naam} als ${rt.naam}` }, `${m.naam.slice(0, 22)} ${rt.kort}`)))) : null);
    }))
      : h('p', { class: 'info-blok' }, 'Niemand staat op de Revanchelijst voor deze keuze.')));
}

// ---------- weekoverzicht ----------
function weken(main) {
  const week = D.week === 'alle' ? D.settings.huidigeWeek : D.week;
  const w = weekVan(week);
  const blok = h('section', { class: 'dash-blok' }, h('h2', {}, `Week ${week}: ${w.titel}`),
    h('div', { class: 'week-tabs' }, ...THEMA.weken.map(x => h('button', { type: 'button', class: 'tab' + (x.week === week ? ' sel' : ''), onclick: () => { D.week = x.week; render(); } }, `Week ${x.week}`))),
    h('div', { class: 'knoppen links' },
      h('button', { class: 'btn klein' + (D.settings.huidigeWeek === week ? ' sel' : ''), type: 'button', onclick: () => saveSettings({ huidigeWeek: week }) }, 'Zet deze week als huidige week')),
    w.verhaal ? h('details', {}, h('summary', {}, 'Weekverhaal'), h('p', {}, w.verhaal), leesKnop([`Week ${week}: ${w.titel}`, w.verhaal], { label: 'Lees het weekverhaal voor' })) : null,
    w.stad ? h('details', {}, h('summary', {}, 'Wat gebeurt er in de stad?'), h('p', {}, w.stad)) : null);
  const lijst = CATALOG.filter(m => m.week === week);
  for (const dag of [...DAGEN, null]) {
    const deel = lijst.filter(m => (m.dag || null) === dag);
    if (!deel.length) continue;
    const tb = h('tbody');
    for (const m of deel) {
      const acties = h('td', {});
      if (m.kind === 'labo') acties.append(h('small', { class: 'tip' }, 'open de stad als leerkracht en ga het gebouw binnen'));
      else if (m.sets) for (const r of ROUTES) acties.append(h('a', { class: 'btn klein', href: `index.html?preview=${m.id}&route=${r.id}`, title: `Bekijk de missie zoals een ${r.naam}-reiziger` }, r.kort));
      const codes = new Set();
      for (const items of Object.values(m.sets || {})) for (const it of items || []) for (const g of it.goals || []) codes.add(g);
      tb.append(h('tr', {},
        h('td', {}, h('b', {}, { oefening: 'Oefenmissie', check: 'Stadsmissie', labo: 'Labo', eindbaas: 'Eindbaas' }[m.kind] || m.kind), h('br'), h('small', {}, GIDSEN[m.gids]?.naam || '')),
        h('td', {}, h('b', {}, m.naam), m.intro ? h('div', { class: 'tip' }, m.intro.slice(0, 150)) : null),
        h('td', {}, h('span', { class: 'macht-chip', style: { '--k': MACHT[m.macht]?.kleur } }, MACHT[m.macht]?.kort || m.macht)),
        h('td', {}, ...[...codes].sort().map(c => h('code', { title: doelTekst(c) }, c + ' '))),
        acties));
    }
    blok.append(h('h3', { class: 'dag' }, dag ? dag : 'wanneer je wil'), h('div', { class: 'tabel-scroll' }, h('table', { class: 'dash-tabel week' }, h('thead', {}, h('tr', {}, h('th', {}, 'Soort'), h('th', {}, 'Missie'), h('th', {}, 'Domein'), h('th', {}, 'Doelen'), h('th', {}, 'Bekijk als'))), tb)));
  }
  const wkCodes = Object.values(CODES).filter(c => c.week === week);
  if (wkCodes.length) blok.append(h('p', {}, h('b', {}, 'Geheime code van deze week: '), ...wkCodes.map(c => h('code', { class: 'code-chip' }, c.code))));
  add(main, blok);
}

// ---------- labo's en water ----------
function labos(main) {
  const st = D.water;
  const rows = [];
  for (const [id, lab] of Object.entries(THEMA.labos)) {
    const s = st.labos[id];
    const gebouw = THEMA.gebouwen[lab.gebouw];
    rows.push(h('tr', {},
      h('td', {}, String(lab.week)), h('td', {}, h('b', {}, lab.naam), h('br'), h('small', {}, gebouw?.naam || lab.gebouw)),
      h('td', {}, GIDSEN[lab.gids]?.naam || ''),
      h('td', {}, (lab.stations || []).join(', ')),
      h('td', {}, `${s.aantal}/${s.drempel}`), h('td', {}, s.klaar ? 'ja' : 'nog niet'),
      h('td', {}, h('small', {}, lab.herstel?.tekst || ''))));
  }
  add(main,
    h('section', { class: 'dash-blok' }, h('h2', {}, `Proper water in ${stadNaam()}`),
      h('p', {}, `${waterTekst(st)}. Elke zone wordt helder wanneer ${st.drempel} reizigers de check van het bijhorende labo halen (70 % juist). Na de eindbaas is alles blauw.`),
      h('div', { class: 'tegels' }, ...Object.values(st.zones).map(z => h('div', { class: 'tegel-stat' }, h('b', {}, Math.round(z.helder * 100) + ' %'), h('small', {}, z.naam)))),
      h('div', { class: 'tabel-scroll' }, h('table', { class: 'dash-tabel' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Week'), h('th', {}, 'Labo en gebouw'), h('th', {}, 'Gids'), h('th', {}, 'Werkbanken'), h('th', {}, 'Geslaagd'), h('th', {}, 'Klaar'), h('th', {}, 'Wat herstelt er'))),
        h('tbody', {}, ...rows)))),
    heeftVerhaal(THEMA) ? h('section', { class: 'dash-blok' }, h('h2', {}, `Het verhaal in ${stadNaam()}`),
      h('p', {}, 'De stad toont het verhaal vanzelf: in week 1 staat alles onder water en zit De Slijkkraak in de reien. Elk labo dat de klas haalt, laat het water zakken en een slijkarm verdwijnen. Week per week verandert er iets (zie de weekplanning). Wilt u een stap vooraf bekijken? Open een voorbeeld (er verandert niets aan de echte voortgang):'),
      h('div', { class: 'knoppenrij verhaal-voorbeelden' }, ...VERHAAL_STAPPEN.map(([code, naam]) =>
        h('a', { class: 'btn klein', href: `index.html?leerkracht=1&verhaal=${code}`, title: naam }, code))),
      h('p', {}, h('small', {}, 'Op het digibord: digibord.html?view=stad&verhaal=w3start. Tijd testen: &uur=22:30 (nacht) of &datum=2026-12-18.'))) : null,
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Uitrusting van dit thema'),
      h('ul', {}, ...Object.entries(UITRUSTING).filter(([, v]) => v.thema).map(([id, v]) => h('li', {}, h('b', {}, v.naam), ` (${v.slot}) - ${v.uitleg || ''}`, h('small', {}, ' ' + id))))));
}

// ---------- eindbaas ----------
function raid(main) {
  const eb = THEMA.eindbaas;
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, `Eindbaas: ${eb?.naam || 'nog geen'}`),
    h('p', {}, eb?.verhaal || ''),
    h('p', {}, 'Open het digibordscherm. Daar start u de eindbaas. Reizigers zien op hun laptop een knop "Doe mee". Elk juist antwoord spuit proper water op het monster. Het digibord toont nooit wie fout antwoordde, alleen de juiste antwoorden van de klas samen.'),
    h('a', { class: 'btn primair groot', href: 'digibord.html', id: 'open-digibord' }, 'Open het digibord'),
    h('a', { class: 'btn groot', href: 'digibord.html?view=stad' }, 'Digibord met de klasstad'),
    D.raid ? h('p', { class: 'info-blok' }, `Laatste eindbaas: ${D.raid.naam} - status ${D.raid.status} - ${D.raid.hp}/${D.raid.maxHp} HP - ${D.raid.deelnemers || 0} deelnemers.`) : h('p', { class: 'tip' }, 'De eindbaas loopt nu niet.'),
    h('p', {}, 'Naast de raid op het digibord is er ook een individueel eindproefwerk in de app (week 5). Dat wordt automatisch verbeterd en komt in de doelenmatrix.'),
    h('div', { class: 'knoppen links' }, ...ROUTES.map(r => h('a', { class: 'btn klein', href: `index.html?preview=eindbaas:${eb?.id}&route=${r.id}` }, `Bekijk het eindproefwerk (${r.naam})`))),
    h('p', { class: 'tip' }, 'Versie 1 werkt op een toestel (tabbladen in dezelfde browser). Voor echte laptops in de klas is de Supabase-koppeling nodig (zie README).')));
}

// ---------- codes ----------
function codes(main) {
  const rows = Object.values(CODES).sort((a, b) => a.week - b.week).map(c => {
    const bel = beloningVoor(c.code, THEMA);
    const n = D.pupils.filter(p => (p.codes || []).includes(c.code)).length;
    return h('tr', {}, h('td', {}, String(c.week)), h('td', {}, h('code', { class: 'code-chip' }, c.code)), h('td', {}, c.waar || ''), h('td', {}, bel.naam), h('td', {}, `${n}/${D.pupils.length}`));
  });
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Geheime codes uit het Expeditieboek'),
    h('p', {}, 'Codes geven enkel extraatjes (uitrusting, versiering voor het huis, +25 XP). Ze openen nooit kerninhoud: alle missies en labo\'s zijn bereikbaar zonder code.'),
    h('div', { class: 'tabel-scroll' }, h('table', { class: 'dash-tabel' }, h('thead', {}, h('tr', {}, h('th', {}, 'Week'), h('th', {}, 'Code'), h('th', {}, 'Waar'), h('th', {}, 'Beloning'), h('th', {}, 'Gevonden'))), h('tbody', {}, ...rows)))));
}

// ---------- instellingen ----------
function instellingen(main) {
  const s = D.settings;
  const pin = h('input', { type: 'text', class: 'invoer kort', inputmode: 'numeric', value: s.pin, maxlength: 8, 'aria-label': 'PIN' });
  const file = h('input', { type: 'file', accept: 'application/json', class: 'file', 'aria-label': 'Exportbestand kiezen' });
  file.addEventListener('change', async () => {
    const f = file.files?.[0]; if (!f) return;
    try { await store.importAll(JSON.parse(await f.text()), { merge: true }); toast('Samengevoegd.'); sync.publish('klas:update', {}); reload(); } catch (e) { toast(e.message); }
  });
  const stemRegel = h('p', { id: 'stem-tekst' }), stemHint = h('p', { class: 'tip', id: 'stem-hint' });
  const zetStem = () => {
    const i = stemInfo();
    stemRegel.textContent = stemTekst();
    stemHint.textContent = i.vlaams ? '' : 'De vaste teksten (missies, labo\'s, filmpjes, gidsen, het verhaal) zijn opgenomen met een Vlaamse stem. Voor andere teksten, zoals namen, gebruikt de browser zijn eigen stem. Op dit toestel is dat geen Vlaamse stem, dus die kan Nederlands klinken.';
    stemHint.hidden = !stemHint.textContent;
  };
  zetStem(); opStemmen(zetStem); setTimeout(zetStem, 800);
  add(main,
    klasOnlineBlok(),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Voorlezen'),
      h('p', {}, 'Elke tekst die een reiziger leest, heeft een luidspreker. Reizigers kiezen zelf (luidspreker rechtsboven in de stad): altijd, op vraag of uit. Voor de Kompasroute staat het standaard op altijd: filmpjes, gidsen en het verhaal lezen vanzelf voor.'),
      stemRegel, stemHint, leesKnop(`Dag reizigers. Welkom in ${THEMA.stad}. Wie helpt het water weer proper te maken?`, { label: 'Probeer de stem' })),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Klas'),
      h('div', { class: 'form-grid' },
        h('label', {}, 'Thema'), h('select', { id: 'set-thema2', onchange: (e) => saveSettings({ huidigThema: e.target.value }) }, ...THEMAS.map(t => h('option', { value: t.id, selected: s.huidigThema === t.id, disabled: !t.data }, `${t.nr}. ${t.naam} - ${t.stad}${t.data ? '' : ' (binnenkort)'}`))),
        h('label', {}, 'Huidige week'), h('select', { id: 'set-week', onchange: (e) => saveSettings({ huidigeWeek: +e.target.value }) }, ...THEMA.weken.map(w => h('option', { value: w.week, selected: s.huidigeWeek === w.week }, `week ${w.week}: ${w.titel}`))),
        h('label', {}, 'Alles open'), h('label', { class: 'schakel' }, h('input', { type: 'checkbox', checked: s.allesOpen, onchange: (e) => saveSettings({ allesOpen: e.target.checked }) }), ' ook latere weken openzetten voor reizigers'),
        h('label', {}, 'Dag en nacht'), h('select', { onchange: (e) => saveSettings({ dagNacht: e.target.value }) }, ...[['auto', 'automatisch: de echte tijd in Brugge (dag, schemering en nacht)'], ['nacht', 'altijd nacht'], ['dag', 'altijd dag']].map(([v, t]) => h('option', { value: v, selected: s.dagNacht === v }, t))),
        h('label', {}, 'Klasmeter'), h('span', {}, h('input', { type: 'number', class: 'invoer kort', min: 100, step: 100, value: s.mistDoel, onchange: (e) => saveSettings({ mistDoel: Math.max(100, +e.target.value || 1200) }) }), ' XP per reiziger voor een volle klasmeter'),
        h('label', {}, 'Naam van de stad'), h('span', {}, h('input', { type: 'text', class: 'invoer', value: s.klasNaam, maxlength: 40, placeholder: THEMA.stad, onchange: (e) => saveSettings({ klasNaam: e.target.value.trim() }) }), ` leeg = ${THEMA.stad}`),
        ONLINE ? null : h('label', {}, 'PIN'), ONLINE ? null : h('span', { class: 'code-rij' }, pin, h('button', { class: 'btn', type: 'button', onclick: () => { if (!/^\d{4,8}$/.test(pin.value)) return toast('Een PIN heeft 4 tot 8 cijfers.'); saveSettings({ pin: pin.value }); } }, 'PIN bewaren')))),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Gegevens'),
      h('div', { class: 'knoppen links' },
        h('button', { class: 'btn primair', type: 'button', id: 'export-csv', onclick: exportCSV }, 'Exporteer resultaten (CSV)'),
        h('button', { class: 'btn', type: 'button', onclick: async () => downloadFile(`vagant-export-${datum()}.json`, JSON.stringify(await store.exportAll()), 'application/json') }, 'Exporteer alles (JSON)'),
        h('label', { class: 'btn upload-btn' }, 'Importeer en voeg samen (JSON)', file)),
      h('p', { class: 'tip' }, ONLINE ? 'Importeren voegt een export van een toestel (uit de tijd zonder klasdatabank) samen met de klasdatabank.' : 'Samenvoegen is handig zolang elk toestel zijn eigen opslag heeft: exporteer op elke laptop en importeer hier.')),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Demo'),
      h('p', {}, 'Maak 8 voorbeeldreizigers met resultaten (missies en labo\'s) om het dashboard en de stad te verkennen. Ze zijn gemarkeerd als demo.'),
      h('div', { class: 'knoppen links' },
        h('button', { class: 'btn', type: 'button', id: 'demo', onclick: maakDemo }, 'Demodata maken'),
        h('button', { class: 'btn', type: 'button', onclick: wisDemo }, 'Demodata verwijderen'),
        h('button', { class: 'btn gevaar', type: 'button', onclick: async () => { if (confirm(ONLINE ? 'Alles wissen in de klasdatabank? Alle reizigers (en hun pincodes), resultaten, galerij en instellingen van deze klas. De klascode blijft.' : 'Alles wissen op dit toestel? Reizigers, resultaten, galerij en instellingen.') && confirm('Zeker? Dit kan niet ongedaan gemaakt worden.')) { await store.reset(); sync.publish('klas:update', {}); localStorage.removeItem('klets:v1:leerkrachtTot'); location.reload(); } } }, 'Alles wissen'))));
  void AVATAR_OPTIES;
}
const datum = () => new Date().toISOString().slice(0, 10);

/** Instellingen > Klas online (Supabase): aan/uit, Test verbinding, klascode, klaslink en QR-code. */
function klasOnlineBlok() {
  const b = backendKeuze();
  const uitslag = h('ul', { class: 'test-uitslag', id: 'test-uitslag', 'aria-live': 'polite' });
  const url = h('input', { type: 'url', class: 'invoer', id: 'sb-url', value: b.url, placeholder: 'https://xxxx.supabase.co', 'aria-label': 'Project URL' });
  const key = h('input', { type: 'text', class: 'invoer', id: 'sb-key', value: b.anonKey, placeholder: 'sb_publishable_...', 'aria-label': 'Publishable key', spellcheck: 'false' });
  const geldig = () => {
    const u = projectUrl(url.value), k = key.value.trim();
    if (!u) { toast('Die Project URL klopt niet (https://....supabase.co).'); return null; }
    if (/^sb_secret_/.test(k) || /service_role/.test(k)) { toast('Dat is een GEHEIME sleutel. Gebruik de publishable key, en maak in Supabase meteen een nieuwe secret key aan.'); return null; }
    if (!k) { toast('De publishable key ontbreekt.'); return null; }
    return { url: u, anonKey: k };
  };
  const test = async () => {
    const g = geldig(); if (!g) return;
    if (g.url !== b.url || g.anonKey !== b.anonKey) { zetBackend({ aan: b.online, ...g }); toast('Opgeslagen. De pagina laadt opnieuw.'); setTimeout(() => location.reload(), 600); return; }
    uitslag.innerHTML = ''; uitslag.append(h('li', {}, 'Even testen ...'));
    const lijst = await SB.testVerbinding();
    uitslag.innerHTML = '';
    for (const r of lijst) uitslag.append(h('li', { class: r.ok ? 'ok' : 'niet-ok' }, (r.ok ? 'In orde: ' : 'Nog niet: ') + r.tekst));
  };
  const schakel = h('input', { type: 'checkbox', id: 'klas-online', checked: b.online, onchange: (e) => {
    const aan = e.target.checked;
    const g = geldig(); if (!g) { e.target.checked = !aan; return; }
    const vraag = aan
      ? 'De klas online zetten op dit toestel? Je meldt je daarna aan met e-mail en wachtwoord en maakt je klas. (Voer eerst het SQL-script uit in Supabase en test de verbinding.)'
      : 'De klas online uitzetten op dit toestel? De klasdatabank blijft bestaan; dit toestel werkt dan weer met zijn eigen gegevens (PIN).';
    if (!confirm(vraag)) { e.target.checked = !aan; return; }
    zetBackend({ aan, ...g }); location.reload();
  } });
  const blok = h('section', { class: 'dash-blok', id: 'klas-online-blok' }, h('h2', {}, 'Klas online (Supabase)'),
    h('p', {}, 'Met een gedeelde klasdatabank in de EU zien het dashboard en het digibord meteen wat elke reiziger doet, op elk toestel, en werkt de eindbaas tussen het digibord en de Chromebooks. Reizigers gebruiken enkel een voornaam of bijnaam en een pincode: geen e-mail, geen achternaam.'),
    h('label', { class: 'schakel' }, schakel, ' Klas online (Supabase) op dit toestel'),
    h('details', { class: 'geavanceerd' }, h('summary', {}, 'Project URL en publishable key'),
      h('div', { class: 'form-grid' }, h('label', { for: 'sb-url' }, 'Project URL'), url, h('label', { for: 'sb-key' }, 'Publishable key'), key),
      h('p', { class: 'tip' }, `Standaard: ${BACKEND.supabase.url}. De publishable key is publiek bedoeld. Zet hier NOOIT de secret key (sb_secret_... of service_role).`)),
    h('div', { class: 'knoppen links' }, h('button', { class: 'btn', type: 'button', id: 'test-verbinding', onclick: test }, 'Test verbinding')),
    uitslag);
  if (ONLINE && D.klas) {
    const link = klaslink(D.klas.code);
    const qrVak = h('div', { class: 'qr-vak' });
    qrBeeld(link).then(el => qrVak.append(el)).catch(() => qrVak.append(h('p', { class: 'tip' }, 'QR-code maken lukte niet.')));
    add(blok,
      h('h3', {}, `Klas ${D.klas.naam || ''}`),
      h('p', {}, 'Klascode: ', h('span', { class: 'klascode-groot', id: 'klascode' }, D.klas.code)),
      h('p', {}, 'Klaslink voor de Chromebooks (zet de klas meteen online op dat toestel en vult de klascode in):'),
      h('div', { class: 'code-rij' }, h('input', { type: 'text', class: 'invoer', readonly: true, value: link, id: 'klaslink', 'aria-label': 'Klaslink' }),
        h('button', { class: 'btn', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(link); toast('Gekopieerd.'); } catch { $('#klaslink').select(); } } }, 'Kopieer')),
      qrVak,
      h('p', { class: 'tip' }, 'Op het digibord tonen en laten scannen, of de link delen via Smartschool/Classroom. Wie de klascode kent, kan een reiziger aanmaken: deel ze enkel met je klas. Een reiziger die je verwijdert, verliest meteen de toegang.'),
      h('div', { class: 'knoppen links' }, h('button', { class: 'btn zacht', type: 'button', onclick: async () => {
        let klassen = []; try { klassen = await SB.mijnKlassen(); } catch (e) { return toast(e.message); }
        const keuze = prompt('Typ de klascode van de klas die je wil openen, of NIEUW voor een nieuwe klas:\n' + klassen.map(k => `${k.code} ${k.naam || ''}`).join('\n'));
        if (!keuze) return;
        if (keuze.trim().toUpperCase() === 'NIEUW') { showMaakKlas(); return; }
        const k = klassen.find(x => x.code === keuze.trim().toUpperCase()); if (!k) return toast('Die klas vind ik niet.');
        SB.kiesKlas(k); location.reload();
      } }, 'Andere klas of nieuwe klas')));
  }
  return blok;
}

// ---------- export ----------
function csv(rows) { return '﻿' + rows.map(r => r.map(v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'); }
function exportCSV() {
  const rows = [['reiziger', 'domein', 'route reiziger', 'doelcode', 'route doel', 'week', 'vak', 'doel', 'juist', 'totaal', 'percentage', 'beste poging', 'status', 'pogingen', 'laatste']];
  for (const p of D.pupils) {
    const s = D.stats[p.id] || {};
    for (const [code, st] of Object.entries(s).sort((a, b) => a[0].localeCompare(b[0], 'nl', { numeric: true }))) {
      const domein = THEMA.doelen[code]?.domein || machtVanCode(code, THEMA);
      rows.push([p.naam, domein, p.routes?.[domein] || 'kompas', code, doelRoute(code), doelWeek(code), THEMA.doelen[code]?.vak || '', doelTekst(code), Math.round(st.goed * 100) / 100, st.totaal,
        Math.round((st.goed / st.totaal) * 100) + '%', Math.round(st.best * 100) + '%', STATUS_TXT[doelStatus(st)], st.pogingen, new Date(st.laatste).toLocaleString('nl-BE')]);
    }
  }
  downloadFile(`vagant-resultaten-${datum()}.csv`, csv(rows), 'text/csv;charset=utf-8');
}
function exportRevanche(lijst) {
  const rows = [['doelcode', 'doel', 'reiziger', 'situatie', 'beste poging']];
  for (const r of lijst) {
    for (const x of r.oefenen) rows.push([r.code, doelTekst(r.code), x.p.naam, 'nog niet behaald', Math.round(x.st.best * 100) + '%']);
    for (const x of r.nooit) rows.push([r.code, doelTekst(r.code), x.p.naam, 'nog niet geoefend', '']);
  }
  downloadFile(`vagant-revanche-${datum()}.csv`, csv(rows), 'text/csv;charset=utf-8');
}

// ---------- demo ----------
function telItems(it) {
  if (it.type === 'sorteer') return it.kaarten.length;
  if (it.type === 'koppel') return it.paren.length;
  return ['upload', 'tekst'].includes(it.type) ? 0 : 1;
}
async function maakDemo() {
  const namen = ['Amira', 'Bilal', 'Daria', 'Elif', 'Jonas', 'Mei', 'Omar', 'Yara'];
  const r = rng('demo');
  const tot = D.settings.huidigeWeek;
  const missies = CATALOG.filter(m => m.sets && m.week <= tot);
  for (const naam of namen) {
    if (D.pupils.some(p => p.naam === naam)) continue;
    const routes = Object.fromEntries(MACHTEN.map(m => [m.id, ROUTES[Math.floor(r() * ROUTES.length)].id]));
    const p = { id: uid('ll'), naam, demo: true, xp: 0, codes: [], kosmetiek: [], gemaakt: Date.now(), routes, look: willekeurigeLook(r) };
    const kans = 0.45 + r() * 0.5;
    for (const m of missies) {
      if (r() < 0.2) continue;
      const routeWens = routes[m.macht] || 'kompas';
      const set = m.sets[routeWens] || m.sets.kompas || m.sets.alle || [];
      const route = m.sets[routeWens] ? routeWens : (m.sets.kompas ? 'kompas' : routeWens);
      const items = set.map(it => { const totaal = telItems(it); let goed = 0; for (let i = 0; i < totaal; i++) if (r() < kans) goed++; return { id: it.id, goals: it.goals || [], goed, totaal, type: it.type }; });
      const goed = items.reduce((s, x) => s + x.goed, 0), totaal = items.reduce((s, x) => s + x.totaal, 0);
      const xp = goed * 10 + 20; p.xp += xp;
      await store.addAttempt({ id: uid('p'), pid: p.id, missie: m.id, labo: m.labo, week: m.week, route, items, goed, totaal, xp, ts: Date.now() - Math.floor(r() * 4e8), bron: 'missie' });
      // ook de werkbanken van een labo (filmpje en proefopstelling)
      if (m.kind === 'labo' && r() < 0.8) {
        for (const station of ['filmpje', 'simulatie']) {
          await store.addAttempt({ id: uid('p'), pid: p.id, missie: `labo:${m.labo}:${station}`, labo: m.labo, station, week: m.week, route, items: [], goed: 0, totaal: 0, xp: 10, ts: Date.now() - Math.floor(r() * 4e8), bron: 'labo' });
          p.xp += 10;
        }
      }
    }
    for (const c of Object.values(CODES)) if (c.week <= tot && r() < 0.5) { p.codes.push(c.code); const b = beloningVoor(c.code, THEMA); p.kosmetiek.push(b.id); }
    await store.savePupil(p);
  }
  sync.publish('klas:update', {}); toast('Demodata gemaakt.'); reload();
}
async function wisDemo() { for (const p of D.pupils.filter(p => p.demo)) await store.deletePupil(p.id); sync.publish('klas:update', {}); reload(); }

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, 'Fout bij het starten: ' + err.message)); });
