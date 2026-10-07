// Leerkrachtendashboard: leerlingen, routes, resultaten per doelcode, Revanche, weekoverzicht, raid, codes, instellingen.
import { QUESTE1 } from '../../data/queste1.js';
import { WEEK1 } from '../missions/week1.js';
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, rng, toast, downloadFile } from '../core/util.js';
import { MACHTEN, ROUTES, ROUTE, GIDSEN, DAGEN } from '../config.js';
import { buildCatalog, doelStats, doelStatus, rangVoor, klasXP, mistDichtheid, codeIndex, beloningVoor, machtVanCode, klasstadGebouwen } from '../core/model.js';
import { drawPerson, AVATAR_OPTIES } from '../game/sprites.js';

const store = createStore();
const sync = createSync('klas');
const CATALOG = buildCatalog(QUESTE1, WEEK1);
const CODES = codeIndex(QUESTE1);
const D = { settings: null, pupils: [], attempts: [], stats: {}, tab: 'overzicht', week: 1, routeFilter: 'alle', raid: null };
window.__dash = D;

const TABS = [
  ['overzicht', 'Overzicht'], ['leerlingen', 'Leerlingen en routes'], ['doelen', 'Doelen'], ['revanche', 'Revanche'],
  ['weken', 'Weekoverzicht'], ['raid', 'Raid'], ['codes', 'Geheime codes'], ['instellingen', 'Instellingen'],
];

async function init() {
  D.settings = await store.getSettings();
  D.week = D.settings.huidigeWeek;
  await sync.connect();
  sync.subscribe('raid:state', (st) => { D.raid = st; if (D.tab === 'raid' || D.tab === 'overzicht') render(); });
  sync.subscribe('klas:update', () => reload());
  store.onChange(() => reload());
  if (Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now()) return start();
  showPin();
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
  app.append(h('main', { class: 'login' }, h('div', { class: 'login-kop' }, h('h1', { class: 'logo' }, 'Klets!'), h('p', {}, 'Leerkrachtendashboard')),
    h('section', { class: 'kaart-blok pin-blok' }, h('label', { class: 'lbl', for: 'pin' }, 'Geef de PIN van de leerkracht'), inp, fout,
      h('button', { class: 'btn primair groot', type: 'button', id: 'pin-ok', onclick: go }, 'Open het dashboard'),
      h('p', { class: 'tip' }, 'De standaard-PIN staat in de README. Verander hem bij Instellingen.')),
    h('p', { class: 'login-voet' }, h('a', { href: 'index.html' }, 'Naar Station Klets'))));
  inp.focus();
}

async function start() { await reload(); }
async function reload() {
  D.settings = await store.getSettings();
  D.pupils = (await store.listPupils()).filter(p => !p.leerkracht);
  D.attempts = await store.listAttempts();
  D.stats = doelStats(D.attempts);
  render();
}
async function saveSettings(patch) { D.settings = await store.saveSettings(patch); sync.publish('klas:update', {}); toast('Opgeslagen.'); render(); }

function render() {
  const app = $('#app'); app.innerHTML = '';
  const nav = h('nav', { class: 'dash-tabs', 'aria-label': 'Onderdelen' }, ...TABS.map(([id, naam]) => h('button', { type: 'button', class: 'tab' + (D.tab === id ? ' sel' : ''), 'aria-current': D.tab === id ? 'page' : null, dataset: { tab: id }, onclick: () => { D.tab = id; render(); } }, naam)));
  const main = h('main', { class: 'dash-main' });
  app.append(h('div', { class: 'dash' },
    h('header', { class: 'dash-kop' }, h('h1', { class: 'logo mini' }, 'Klets!'), h('span', { class: 'dash-sub' }, `Leerkracht - ${D.settings.klasNaam} - week ${D.settings.huidigeWeek}`),
      h('a', { class: 'btn klein', href: 'index.html?leerkracht=1', target: '_blank' }, 'Open de stad als leerkracht'),
      h('button', { class: 'btn klein zacht', type: 'button', onclick: () => { localStorage.removeItem('klets:v1:leerkrachtTot'); showPin(); } }, 'Afmelden')),
    nav, main));
  ({ overzicht, leerlingen, doelen, revanche, weken, raid, codes, instellingen })[D.tab](main);
}

// ---------- hulp ----------
function avatar(look, s = 2) { const c = h('canvas', { width: 16 * s, height: 18 * s, class: 'avatar', 'aria-hidden': 'true' }); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(s, s); drawPerson(g, 0, 2, look, 'down', 0); return c; }
function doelRoute(code) { return QUESTE1.doelen[code]?.route || ''; }
function doelTekst(code) { return QUESTE1.doelen[code]?.doel || ''; }
function codesVanWeek(week, route = 'alle') {
  const set = new Set();
  for (const l of QUESTE1.lessen) if (week === 'alle' || l.week === week) for (const r of ['taalsleutels', 'kompas', 'telescoop']) if (route === 'alle' || route === r) l.doelen[r].forEach(c => set.add(c));
  return [...set].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }));
}
/** Volgt deze leerling de route van dit doel voor de bijhorende macht? */
function volgtRoute(p, code) {
  const r = doelRoute(code); if (!r) return true;
  const macht = machtVanCode(code);
  const pr = p.routes?.[macht] || 'kompas';
  return pr === r || (pr === 'taalsleutels' && r === 'kompas' && macht !== 'Taal');
}
function stat(pid, code) { return D.stats[pid]?.[code]; }
const STATUS_TXT = { behaald: 'behaald', oefenen: 'Revanche', open: 'nog niet' };

// ---------- overzicht ----------
function overzicht(main) {
  const xp = klasXP(D.pupils), mist = mistDichtheid(D.settings, D.pupils);
  const gebouwen = klasstadGebouwen(D.stats, QUESTE1.doelen);
  let behaald = 0, revanche = 0;
  for (const s of Object.values(D.stats)) for (const st of Object.values(s)) doelStatus(st) === 'behaald' ? behaald++ : revanche++;
  add(main, 
    h('div', { class: 'tegels' },
      tegel(D.pupils.length, 'reizigers'), tegel(xp, 'XP van de klas'), tegel(Math.round(mist * 100) + ' %', 'mist over het station'),
      tegel(D.attempts.length, 'gemaakte missies'), tegel(behaald, 'doelen behaald (leerling x doel)'), tegel(revanche, 'op de Revanchelijst'), tegel(gebouwen.length, 'gebouwen in de Klasstad')),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Snel'),
      h('div', { class: 'knoppen links' },
        h('label', { class: 'schakel' }, h('input', { type: 'checkbox', id: 'alles-open', checked: D.settings.allesOpen, onchange: (e) => saveSettings({ allesOpen: e.target.checked }) }), ' Alles open (ook latere weken)'),
        h('a', { class: 'btn primair', href: 'digibord.html', target: '_blank' }, 'Start een raid op het digibord'),
        h('a', { class: 'btn', href: 'digibord.html?view=stad', target: '_blank', id: 'open-stad' }, 'Toon de klasstad op het digibord'),
        h('button', { class: 'btn', type: 'button', onclick: exportCSV }, 'Exporteer resultaten (CSV)'))),
    D.raid && ['lobby', 'actief'].includes(D.raid.status) ? h('p', { class: 'info-blok' }, `Er loopt een raid: ${D.raid.naam} - ${D.raid.hp}/${D.raid.maxHp} HP.`) : null,
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Zo werkt het'),
      h('ul', {}, h('li', {}, 'Leerlingen melden zich aan met een voornaam of bijnaam en een avatar. Geen e-mail, geen wachtwoord.'),
        h('li', {}, "Alle oefeningen worden automatisch verbeterd. Elk resultaat wordt per doelcode bewaard. U hoeft niets te verbeteren."),
        h('li', {}, "Een doel is 'behaald' vanaf 70 % juist in een poging. Lager = Revanchelijst."),
        h('li', {}, "Niets is op slot voor u: 'Alles open' zet ook latere weken open, en 'Open de stad als leerkracht' toont alles."),
        h('li', {}, 'De klasstad: elk doel dat minstens één leerling haalt, wordt een gebouw in de wijk van zijn macht. Hoe meer leerlingen het halen, hoe groter. De stad toont enkel aantallen, nooit wie iets nog niet haalde.'),
        h('li', {}, 'Let op: in deze versie bewaart elk toestel zijn eigen gegevens (localStorage). Gebruik Exporteer/Importeer (JSON) bij Instellingen om toestellen samen te voegen.'))));
}
const tegel = (b, s) => h('div', { class: 'tegel-stat' }, h('b', {}, String(b)), h('small', {}, s));

// ---------- leerlingen ----------
function leerlingen(main) {
  const naam = h('input', { type: 'text', class: 'invoer', placeholder: 'Voornaam of bijnaam', maxlength: 16, 'aria-label': 'Nieuwe leerling', id: 'nieuwe-naam' });
  const voegToe = async () => {
    const n = naam.value.trim(); if (n.length < 2) return toast('Typ een naam van minstens 2 letters.');
    if (D.pupils.some(p => p.naam.toLowerCase() === n.toLowerCase())) return toast('Die naam bestaat al.');
    const r = rng(n);
    await store.savePupil({ id: uid('ll'), naam: n, xp: 0, codes: [], kosmetiek: [], gemaakt: Date.now(), routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])),
      look: { huid: Math.floor(r() * 6), haar: AVATAR_OPTIES.haar[Math.floor(r() * 6)], haarKleur: Math.floor(r() * 6), kleren: Math.floor(r() * 8), broek: Math.floor(r() * 4), uitrusting: {} } });
    sync.publish('klas:update', {}); reload();
  };
  const tabel = h('table', { class: 'dash-tabel' },
    h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Naam'), h('th', {}, 'XP en rang'), ...MACHTEN.map(m => h('th', {}, m.naam)), h('th', {}, 'Codes'), h('th', {}, ''))),
    h('tbody', {}, ...D.pupils.map(p => h('tr', {},
      h('td', {}, avatar(p.look)), h('td', {}, h('b', {}, p.naam), p.demo ? h('small', { class: 'tip' }, ' demo') : null),
      h('td', {}, `${p.xp || 0} XP`, h('br'), h('small', {}, rangVoor(p.xp || 0).naam)),
      ...MACHTEN.map(m => h('td', {}, h('select', { class: 'route-select', 'aria-label': `Route ${m.naam} voor ${p.naam}`, dataset: { pid: p.id, macht: m.id }, onchange: async (e) => {
        const fresh = await store.getPupil(p.id); fresh.routes = { ...(fresh.routes || {}), [m.id]: e.target.value }; await store.savePupil(fresh); sync.publish('klas:update', {}); toast(`${p.naam}: ${m.naam} = ${ROUTE[e.target.value].naam}`); reload();
      } }, ...ROUTES.map(r => h('option', { value: r.id, selected: (p.routes?.[m.id] || 'kompas') === r.id }, r.naam))))),
      h('td', {}, String((p.codes || []).length)),
      h('td', {}, h('button', { class: 'btn klein gevaar', type: 'button', onclick: async () => { if (confirm(`${p.naam} en alle resultaten verwijderen?`)) { await store.deletePupil(p.id); sync.publish('klas:update', {}); reload(); } } }, 'Verwijder'))))));
  add(main, 
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Routes per macht'),
      h('p', {}, 'Kies per leerling en per macht de route: Taalsleutels (nieuwkomersdoelen, met veel beeld en voorlezen), Kompas (4de leerjaar) of Telescoop (6de leerjaar). Een leerling kan per macht een andere route volgen. Voor machten zonder eigen Taalsleutels-oefeningen krijgt een Taalsleutels-leerling de Kompas-oefeningen met voorleesknop.'),
      h('div', { class: 'knoppen links' }, ...ROUTES.map(r => h('button', { class: 'btn klein', type: 'button', onclick: () => alleRoutes(r.id) }, `Iedereen ${r.naam}`)))),
    h('div', { class: 'tabel-scroll' }, tabel),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Leerling toevoegen'), h('div', { class: 'code-rij' }, naam, h('button', { class: 'btn primair', type: 'button', onclick: voegToe }, 'Toevoegen')),
      h('p', { class: 'tip' }, 'Leerlingen kunnen zichzelf ook aanmaken op de startpagina.')));
}
async function alleRoutes(r) {
  if (!confirm(`Alle routes van alle leerlingen op ${ROUTE[r].naam} zetten?`)) return;
  for (const p of D.pupils) { const f = await store.getPupil(p.id); f.routes = Object.fromEntries(MACHTEN.map(m => [m.id, r])); await store.savePupil(f); }
  sync.publish('klas:update', {}); reload();
}

// ---------- doelen ----------
function filters(onChange, { metRoute = true } = {}) {
  return h('div', { class: 'filters' },
    h('label', {}, 'Week ', h('select', { id: 'f-week', onchange: (e) => { D.week = e.target.value === 'alle' ? 'alle' : +e.target.value; onChange(); } },
      h('option', { value: 'alle', selected: D.week === 'alle' }, 'alle weken'), ...QUESTE1.weken.map(w => h('option', { value: w.week, selected: D.week === w.week }, `week ${w.week}: ${w.titel}`)))),
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
    return h('tr', {}, h('th', { class: 'sticky code-th', title: doelTekst(code) }, h('span', { class: 'route-badge r-' + doelRoute(code) }, ROUTE[doelRoute(code)]?.kort || '?'), ' ', code, h('small', {}, doelTekst(code).slice(0, 80) + (doelTekst(code).length > 80 ? ' ...' : ''))), h('td', { class: 'cel klas' }, t ? `${b}/${t}` : '-'), ...cells);
  });
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Resultaten per doelcode'),
    h('p', {}, 'Groen = behaald (beste poging minstens 70 %). Oranje = Revanche (geprobeerd, nog niet behaald). Leeg = nog niet geoefend. Streepje = deze leerling volgt een andere route voor deze macht.'),
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
      else if (!st && volgtRoute(p, code) && (wk === 'alle' ? true : wk <= D.settings.huidigeWeek) && lesHeeftOefening(code)) nooit.push({ p });
    }
    if (oefenen.length || nooit.length) out.push({ code, oefenen, nooit });
  }
  return out;
}
function lesHeeftOefening(code) { return CATALOG.some(m => m.sets && Object.values(m.sets).some(items => items.some(it => (it.goals || []).includes(code)))); }
function revanche(main) {
  const lijst = revancheLijst();
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Revanchelijst'),
    h('p', {}, 'Welke doelen zijn nog niet behaald, en door wie? Leerlingen zien dit als "Revanche: nog oefenen", nooit als een fout.'),
    filters(() => render()),
    h('div', { class: 'knoppen links' }, h('button', { class: 'btn', type: 'button', onclick: () => exportRevanche(lijst) }, 'Exporteer revanchelijst (CSV)')),
    lijst.length ? h('div', { class: 'revanche', id: 'revanche-lijst' }, ...lijst.map(r => h('div', { class: 'rev-kaart' },
      h('h3', {}, h('span', { class: 'route-badge r-' + doelRoute(r.code) }, ROUTE[doelRoute(r.code)]?.naam || ''), ' ', r.code),
      h('p', { class: 'tip' }, doelTekst(r.code)),
      r.oefenen.length ? h('p', {}, h('b', {}, 'Nog niet behaald: '), r.oefenen.map(x => `${x.p.naam} (${Math.round(x.st.best * 100)} %)`).join(', ')) : null,
      r.nooit.length ? h('p', {}, h('b', {}, 'Nog niet geoefend: '), r.nooit.map(x => x.p.naam).join(', ')) : null)))
      : h('p', { class: 'info-blok' }, 'Niemand staat op de Revanchelijst voor deze keuze.')));
}

// ---------- weekoverzicht ----------
function weken(main) {
  const week = D.week === 'alle' ? D.settings.huidigeWeek : D.week;
  const w = QUESTE1.weken[week - 1];
  const blok = h('section', { class: 'dash-blok' }, h('h2', {}, `Week ${week}: ${w.titel}`),
    h('div', { class: 'week-tabs' }, ...QUESTE1.weken.map(x => h('button', { type: 'button', class: 'tab' + (x.week === week ? ' sel' : ''), onclick: () => { D.week = x.week; render(); } }, `Week ${x.week}`))),
    h('details', {}, h('summary', {}, 'Weekverhaal'), h('p', {}, w.verhaal)));
  for (const dag of DAGEN) {
    const lessen = QUESTE1.lessen.filter(l => l.week === week && l.dag === dag);
    if (!lessen.length) continue;
    const tb = h('tbody');
    for (const l of lessen) {
      const m = CATALOG.find(x => x.id === l.id);
      const doelCel = h('td', {}, ...ROUTES.map(r => l.doelen[r.id].length ? h('div', {}, h('span', { class: 'route-badge r-' + r.id }, r.kort), ' ', ...l.doelen[r.id].map(c => h('code', { title: doelTekst(c) }, c + ' '))) : null));
      const acties = h('td', {});
      if (m?.sets) for (const r of ROUTES) acties.append(h('a', { class: 'btn klein', href: `index.html?preview=${l.id}&route=${r.id}`, target: '_blank', title: `Bekijk de missie zoals een ${r.naam}-leerling` }, r.kort));
      else if (m) acties.append(h('small', { class: 'tip' }, m.kind === 'overzicht' ? 'weekoverzicht in de app' : m.kind === 'klasmeter' ? 'klasmeter' : 'nog geen digitale oefening'));
      tb.append(h('tr', {}, h('td', {}, h('b', {}, l.blok), h('br'), h('small', {}, `${GIDSEN[m?.gids || l.gids]?.naam || ''}`)),
        h('td', {}, h('b', {}, l.titel), m ? h('div', { class: 'tip' }, `Missie: ${m.naam}`) : null, l.webapp ? h('details', {}, h('summary', {}, 'Webapp'), h('p', {}, l.webapp)) : null),
        doelCel, h('td', {}, ...(l.codes || []).map(c => h('code', { class: 'code-chip' }, c))), acties));
    }
    blok.append(h('h3', { class: 'dag' }, dag), h('div', { class: 'tabel-scroll' }, h('table', { class: 'dash-tabel week' }, h('thead', {}, h('tr', {}, h('th', {}, 'Blok'), h('th', {}, 'Les en missie'), h('th', {}, 'Doelen'), h('th', {}, 'Logboekcode'), h('th', {}, 'Bekijk als'))), tb)));
  }
  add(main, blok);
}

// ---------- raid ----------
function raid(main) {
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Raid op het digibord'),
    h('p', {}, 'Open het digibordscherm. Daar kiest u de raid en start u ze. Leerlingen zien op hun laptop een knop "Doe mee". Elk juist antwoord doet schade aan de Grijze Mist. Het digibord toont nooit wie fout antwoordde, alleen de juiste antwoorden van de klas samen.'),
    h('a', { class: 'btn primair groot', href: 'digibord.html', target: '_blank', id: 'open-digibord' }, 'Open het digibord'),
    h('a', { class: 'btn groot', href: 'digibord.html?view=stad', target: '_blank' }, 'Digibord met de klasstad'),
    h('p', { class: 'tip' }, 'In de stadsweergave hangt de Grijze Mist tijdens een raid als een storm boven de klasstad.'),
    D.raid ? h('p', { class: 'info-blok' }, `Laatste raid: ${D.raid.naam} - status ${D.raid.status} - ${D.raid.hp}/${D.raid.maxHp} HP - ${D.raid.deelnemers || 0} deelnemers.`) : h('p', { class: 'tip' }, 'Er loopt nu geen raid.'),
    h('p', { class: 'tip' }, 'Versie 1 werkt op een toestel (tabbladen in dezelfde browser). Voor echte laptops in de klas is de Supabase-koppeling nodig (zie README).')));
}

// ---------- codes ----------
function codes(main) {
  const rows = Object.values(CODES).sort((a, b) => a.week - b.week).map(c => {
    const les = QUESTE1.lessen.find(l => l.id === c.lessen[0]);
    const bel = beloningVoor(c.code);
    const n = D.pupils.filter(p => (p.codes || []).includes(c.code)).length;
    return h('tr', {}, h('td', {}, String(c.week)), h('td', {}, h('code', { class: 'code-chip' }, c.code)), h('td', {}, `${les.dag}: ${les.titel}`), h('td', {}, bel.naam), h('td', {}, `${n}/${D.pupils.length}`));
  });
  add(main, h('section', { class: 'dash-blok' }, h('h2', {}, 'Geheime codes uit het Logboek'),
    h('p', {}, 'Codes geven enkel extraatjes (kleding, sporen, stukken van de wereldkaart, +25 XP). Ze openen nooit kerninhoud: alle missies zijn bereikbaar zonder code.'),
    h('div', { class: 'tabel-scroll' }, h('table', { class: 'dash-tabel' }, h('thead', {}, h('tr', {}, h('th', {}, 'Week'), h('th', {}, 'Code'), h('th', {}, 'Logboekles'), h('th', {}, 'Beloning'), h('th', {}, 'Gevonden'))), h('tbody', {}, ...rows)))));
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
  add(main, 
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Klas'),
      h('div', { class: 'form-grid' },
        h('label', {}, 'Huidige week'), h('select', { id: 'set-week', onchange: (e) => saveSettings({ huidigeWeek: +e.target.value }) }, ...QUESTE1.weken.map(w => h('option', { value: w.week, selected: s.huidigeWeek === w.week }, `week ${w.week}: ${w.titel}`))),
        h('label', {}, 'Alles open'), h('label', { class: 'schakel' }, h('input', { type: 'checkbox', checked: s.allesOpen, onchange: (e) => saveSettings({ allesOpen: e.target.checked }) }), ' ook latere weken openzetten voor leerlingen'),
        h('label', {}, 'Dag en nacht'), h('select', { onchange: (e) => saveSettings({ dagNacht: e.target.value }) }, ...[['auto', 'automatisch: rustige dag-en-nachtcyclus'], ['nacht', 'altijd nacht'], ['dag', 'altijd dag']].map(([v, t]) => h('option', { value: v, selected: s.dagNacht === v }, t))),
        h('label', {}, 'Mistdoel'), h('span', {}, h('input', { type: 'number', class: 'invoer kort', min: 100, step: 100, value: s.mistDoel, onchange: (e) => saveSettings({ mistDoel: Math.max(100, +e.target.value || 1200) }) }), ' XP per leerling tot de mist helemaal weg is'),
        h('label', {}, 'Naam van de klas'), h('input', { type: 'text', class: 'invoer', value: s.klasNaam, maxlength: 40, onchange: (e) => saveSettings({ klasNaam: e.target.value || 'Station Klets' }) }),
        h('label', {}, 'PIN'), h('span', { class: 'code-rij' }, pin, h('button', { class: 'btn', type: 'button', onclick: () => { if (!/^\d{4,8}$/.test(pin.value)) return toast('Een PIN heeft 4 tot 8 cijfers.'); saveSettings({ pin: pin.value }); } }, 'PIN bewaren')))),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Gegevens'),
      h('div', { class: 'knoppen links' },
        h('button', { class: 'btn primair', type: 'button', id: 'export-csv', onclick: exportCSV }, 'Exporteer resultaten (CSV)'),
        h('button', { class: 'btn', type: 'button', onclick: async () => downloadFile(`klets-export-${datum()}.json`, JSON.stringify(await store.exportAll()), 'application/json') }, 'Exporteer alles (JSON)'),
        h('label', { class: 'btn upload-btn' }, 'Importeer en voeg samen (JSON)', file)),
      h('p', { class: 'tip' }, 'Samenvoegen is handig zolang elk toestel zijn eigen opslag heeft: exporteer op elke laptop en importeer hier.')),
    h('section', { class: 'dash-blok' }, h('h2', {}, 'Demo'),
      h('p', {}, 'Maak 8 voorbeeldleerlingen met resultaten om het dashboard te verkennen. Ze zijn gemarkeerd als demo.'),
      h('div', { class: 'knoppen links' },
        h('button', { class: 'btn', type: 'button', id: 'demo', onclick: maakDemo }, 'Demodata maken'),
        h('button', { class: 'btn', type: 'button', onclick: wisDemo }, 'Demodata verwijderen'),
        h('button', { class: 'btn gevaar', type: 'button', onclick: async () => { if (confirm('Alles wissen op dit toestel? Leerlingen, resultaten, galerij en instellingen.') && confirm('Zeker? Dit kan niet ongedaan gemaakt worden.')) { await store.reset(); sync.publish('klas:update', {}); localStorage.removeItem('klets:v1:leerkrachtTot'); location.reload(); } } }, 'Alles wissen'))));
}
const datum = () => new Date().toISOString().slice(0, 10);

// ---------- export ----------
function csv(rows) { return '﻿' + rows.map(r => r.map(v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n'); }
function exportCSV() {
  const rows = [['leerling', 'macht', 'route leerling', 'doelcode', 'route doel', 'vak', 'doel', 'juist', 'totaal', 'percentage', 'beste poging', 'status', 'pogingen', 'laatste']];
  for (const p of D.pupils) {
    const s = D.stats[p.id] || {};
    for (const [code, st] of Object.entries(s).sort((a, b) => a[0].localeCompare(b[0], 'nl', { numeric: true }))) {
      const macht = machtVanCode(code);
      rows.push([p.naam, macht, p.routes?.[macht] || 'kompas', code, doelRoute(code), QUESTE1.doelen[code]?.vak || '', doelTekst(code), Math.round(st.goed * 100) / 100, st.totaal,
        Math.round((st.goed / st.totaal) * 100) + '%', Math.round(st.best * 100) + '%', STATUS_TXT[doelStatus(st)], st.pogingen, new Date(st.laatste).toLocaleString('nl-BE')]);
    }
  }
  downloadFile(`klets-resultaten-${datum()}.csv`, csv(rows), 'text/csv;charset=utf-8');
}
function exportRevanche(lijst) {
  const rows = [['doelcode', 'doel', 'leerling', 'situatie', 'beste poging']];
  for (const r of lijst) {
    for (const x of r.oefenen) rows.push([r.code, doelTekst(r.code), x.p.naam, 'nog niet behaald', Math.round(x.st.best * 100) + '%']);
    for (const x of r.nooit) rows.push([r.code, doelTekst(r.code), x.p.naam, 'nog niet geoefend', '']);
  }
  downloadFile(`klets-revanche-${datum()}.csv`, csv(rows), 'text/csv;charset=utf-8');
}

// ---------- demo ----------
async function maakDemo() {
  const namen = ['Amira', 'Bilal', 'Daria', 'Elif', 'Jonas', 'Mei', 'Omar', 'Yara'];
  const r = rng('demo');
  const missies = CATALOG.filter(m => m.week === 1 && m.sets);
  for (const naam of namen) {
    if (D.pupils.some(p => p.naam === naam)) continue;
    const routes = Object.fromEntries(MACHTEN.map(m => [m.id, ROUTES[Math.floor(r() * 3)].id]));
    const p = { id: uid('ll'), naam, demo: true, xp: 0, codes: [], kosmetiek: [], gemaakt: Date.now(), routes,
      look: { huid: Math.floor(r() * 6), haar: AVATAR_OPTIES.haar[Math.floor(r() * 7)], haarKleur: Math.floor(r() * 6), kleren: Math.floor(r() * 8), broek: Math.floor(r() * 4), uitrusting: {} } };
    const kans = 0.45 + r() * 0.5;
    for (const m of missies) {
      if (r() < 0.25) continue;
      const routeWens = routes[m.macht];
      const set = m.sets[routeWens] || m.sets.kompas || m.sets.alle || [];
      const route = m.sets[routeWens] ? routeWens : (m.sets.kompas ? 'kompas' : routeWens);
      const items = set.map(it => { const totaal = it.type === 'sorteer' ? it.kaarten.length : it.type === 'koppel' ? it.paren.length : (['upload', 'tekst'].includes(it.type) ? 0 : 1); let goed = 0; for (let i = 0; i < totaal; i++) if (r() < kans) goed++; return { id: it.id, goals: it.goals || [], goed, totaal, type: it.type }; });
      const goed = items.reduce((s, x) => s + x.goed, 0), totaal = items.reduce((s, x) => s + x.totaal, 0);
      const xp = goed * 10 + 20; p.xp += xp;
      await store.addAttempt({ id: uid('p'), pid: p.id, missie: m.id, week: 1, route, items, goed, totaal, xp, ts: Date.now() - Math.floor(r() * 4e8), bron: 'missie' });
    }
    const wkCodes = Object.values(CODES).filter(c => c.week === 1);
    for (const c of wkCodes) if (r() < 0.4) { p.codes.push(c.code); const b = beloningVoor(c.code); if (b.soort === 'kosmetiek') p.kosmetiek.push(b.id); }
    await store.savePupil(p);
  }
  sync.publish('klas:update', {}); toast('Demodata gemaakt.'); reload();
}
async function wisDemo() { for (const p of D.pupils.filter(p => p.demo)) await store.deletePupil(p.id); sync.publish('klas:update', {}); reload(); }

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, 'Fout bij het starten: ' + err.message)); });
