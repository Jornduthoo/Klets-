// Leerlingenapp: aanmelden, de 3D-klasstad, adviseurs (gidsen), missies, codekluis, eigen huis en raid.
import { QUESTE1 } from '../../data/queste1.js';
import { WEEK1 } from '../missions/week1.js';
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, clamp, speak, blip, toast, rng } from '../core/util.js';
import { MACHTEN, ROUTE, ROUTES, GIDSEN, RANGEN, XP, DAGEN } from '../config.js';
import { buildCatalog, kiesSet, routeVoor, isOpen, rangVoor, klasXP, doelStats, doelStatus, codeIndex, beloningVoor, normCode, KOSMETIEK } from '../core/model.js';
import { drawPerson, AVATAR_OPTIES, DEFAULT_LOOK } from '../game/sprites.js';
import { maakStad, bewaarKwaliteit } from '../city/stad.js';
import { stadModel, goalMissieIndex, HUISDECOR, NIVEAU_NAAM } from '../city/stadmodel.js';
import { WIJK, WIJKEN } from '../city/layout.js';
import { icoon } from './iconen.js';
import { runMission, gidsPortret } from '../missions/engine.js';
import { renderItem } from '../missions/types.js';
import { raidItem } from '../missions/raidbank.js';

const store = createStore();
const sync = createSync('klas');
const CATALOG = buildCatalog(QUESTE1, WEEK1);
const CODES = codeIndex(QUESTE1);
const GOAL_MISSIES = goalMissieIndex(CATALOG);
const S = { settings: null, pupil: null, pupils: [], stad: null, model: null, week: 1, raid: null, preview: false };
window.__klets = S; // voor testen en foutopsporing

// ---------- opstart ----------
async function init() {
  S.settings = await store.getSettings();
  S.week = S.settings.huidigeWeek;
  await sync.connect();
  sync.subscribe('raid:state', onRaidState);
  sync.subscribe('klas:update', () => refresh());
  store.onChange(() => refresh());
  const qs = new URLSearchParams(location.search);
  const teacherOk = isTeacher();
  if (qs.get('preview') && teacherOk) return previewMission(qs.get('preview'), qs.get('route') || 'kompas');
  if (qs.get('leerkracht') && teacherOk) {
    S.preview = true;
    S.pupil = { id: 'leerkracht', naam: 'Leerkracht', leerkracht: true, xp: 0, routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])), look: { ...DEFAULT_LOOK, haar: 'pet', kleren: 6, uitrusting: { hand: 'lantaarn', rug: 'cape' } }, codes: [], kosmetiek: Object.keys(KOSMETIEK) };
    return enterWorld();
  }
  const pid = sessionStorage.getItem('klets-pid');
  if (pid) { const p = await store.getPupil(pid); if (p) { S.pupil = p; return enterWorld(); } }
  showLogin();
}
function isTeacher() { try { return Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now(); } catch { return false; } }

async function refresh({ vlieg = false } = {}) {
  S.settings = await store.getSettings();
  S.pupils = await store.listPupils();
  if (S.pupil && !S.pupil.leerkracht) { const p = await store.getPupil(S.pupil.id); if (p) S.pupil = p; else { logout(); return; } }
  if (S.stad) await bouwStad({ vlieg });
}

// ---------- aanmelden ----------
async function showLogin() {
  S.pupils = await store.listPupils();
  const app = $('#app'); app.innerHTML = '';
  const kaarten = S.pupils.map(p => h('button', { class: 'reiziger-kaart', type: 'button', onclick: () => login(p) }, avatarCanvas(p.look, 4), h('span', {}, p.naam)));
  app.append(h('main', { class: 'login' },
    h('div', { class: 'login-kop' }, h('h1', { class: 'logo' }, 'Klets!'), h('p', {}, 'Queste 1: Aankomst in Station Klets')),
    h('section', { class: 'kaart-blok' },
      h('h2', {}, 'Wie stapt er uit de nachttrein?'),
      kaarten.length ? h('div', { class: 'reizigers' }, ...kaarten) : h('p', { class: 'tip' }, 'Nog geen reizigers op dit toestel. Maak je eigen reiziger.'),
      h('button', { class: 'btn groot primair', type: 'button', onclick: showCreator }, 'Ik ben een nieuwe reiziger')),
    h('p', { class: 'login-voet' }, h('a', { href: 'leerkracht.html' }, 'Leerkracht'), ' - ', h('a', { href: 'digibord.html' }, 'Digibord'))));
}
async function login(p) { sessionStorage.setItem('klets-pid', p.id); S.pupil = p; enterWorld(); }
function logout() { sessionStorage.removeItem('klets-pid'); location.href = location.pathname; }

function avatarCanvas(look, scale = 4, dir = 'down') {
  const c = h('canvas', { width: 16 * scale, height: 20 * scale, class: 'avatar', 'aria-hidden': 'true' });
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(scale, scale);
  drawPerson(g, 0, 4, look || DEFAULT_LOOK, dir, 0);
  return c;
}

function showCreator() {
  const look = { ...DEFAULT_LOOK, huid: Math.floor(Math.random() * 6), kleren: Math.floor(Math.random() * 8), uitrusting: {} };
  const app = $('#app'); app.innerHTML = '';
  const prev = h('div', { class: 'creator-prev' });
  let dirI = 0; const dirs = ['down', 'right', 'up', 'left'];
  const paint = () => { prev.innerHTML = ''; prev.append(avatarCanvas(look, 9, dirs[dirI])); };
  const naam = h('input', { type: 'text', class: 'invoer', maxlength: 16, autocomplete: 'off', placeholder: 'Voornaam of bijnaam', 'aria-label': 'Voornaam of bijnaam', id: 'naam' });
  const fout = h('p', { class: 'fout', 'aria-live': 'polite' });
  const rij = (label, key, opties, render) => h('div', { class: 'keuze-rij' }, h('span', { class: 'rij-lbl' }, label),
    h('div', { class: 'stalen' }, ...opties.map((o, i) => {
      const val = typeof o === 'string' && key === 'haar' ? o : i;
      const b = h('button', { type: 'button', class: 'staal' + (look[key] === val ? ' sel' : ''), 'aria-label': `${label} ${i + 1}`, onclick: () => { look[key] = val; b.parentElement.querySelectorAll('.staal').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); paint(); } }, render(o, i));
      return b;
    })));
  const sw = (c) => h('span', { class: 'kleur', style: { background: c } });
  const hairPrev = (style) => avatarCanvas({ ...look, haar: style, uitrusting: {} }, 2);
  app.append(h('main', { class: 'creator' },
    h('h1', { class: 'logo klein' }, 'Klets!'),
    h('div', { class: 'creator-grid' },
      h('div', { class: 'creator-links' }, prev, h('button', { type: 'button', class: 'btn klein', onclick: () => { dirI = (dirI + 1) % 4; paint(); } }, 'Draai')),
      h('div', { class: 'creator-rechts' },
        h('label', { class: 'lbl', for: 'naam' }, 'Hoe heet je in Station Klets?'), naam,
        h('p', { class: 'tip' }, 'Gebruik je voornaam of een bijnaam. Geen achternaam.'),
        rij('Huid', 'huid', AVATAR_OPTIES.huid, sw),
        rij('Haar', 'haar', AVATAR_OPTIES.haar, (o) => hairPrev(o)),
        rij('Haarkleur', 'haarKleur', AVATAR_OPTIES.haarKleur, sw),
        rij('Jas', 'kleren', AVATAR_OPTIES.kleren, sw),
        rij('Broek', 'broek', AVATAR_OPTIES.broek, sw),
        fout,
        h('div', { class: 'knoppen' },
          h('button', { type: 'button', class: 'btn', onclick: showLogin }, 'Terug'),
          h('button', { type: 'button', class: 'btn groot primair', id: 'start-reis', onclick: maak }, 'Stap uit de trein'))))));
  paint(); naam.focus();
  async function maak() {
    const n = naam.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { fout.textContent = 'Typ een naam van minstens 2 letters.'; return; }
    if (/@|\d{3,}/.test(n)) { fout.textContent = 'Gebruik enkel een voornaam of bijnaam.'; return; }
    const all = await store.listPupils();
    const bestaat = all.find(p => p.naam.toLowerCase() === n.toLowerCase());
    if (bestaat) { fout.textContent = `${bestaat.naam} bestaat al. Ga terug en klik op je kaartje.`; return; }
    const p = { id: uid('ll'), naam: n, look, xp: 0, routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])), codes: [], kosmetiek: [], gemaakt: Date.now() };
    await store.savePupil(p);
    sync.publish('klas:update', {});
    login(p);
  }
}

// ---------- de stad ----------
const GIDS_VOLGORDE = ['atlas', 'woordje', 'tella', 'kroniek', 'bram', 'byte'];
const TIJDEN = [['cyclus', 'Dag en nacht', 'cyclus'], ['dag', 'Dag', 'zon'], ['avond', 'Avond', 'avond'], ['nacht', 'Nacht', 'maan']];
const LAGEN = [[null, 'Geen kaartlaag'], ['sterkte', 'Doelen: sterk en zwak'], ['wijken', 'Wijken'], ['mijn', 'Mijn bijdrage']];

async function enterWorld() {
  S.pupils = await store.listPupils();
  const app = $('#app'); app.innerHTML = '';
  document.body.classList.add('in-stad');
  const view = h('div', { class: 'stad-view', id: 'stad' });
  const top = h('header', { class: 'stad-top' });
  const adviseurs = h('aside', { class: 'adviseurs', 'aria-label': 'Adviseurs' });
  const ballon = h('div', { class: 'adviseur-ballon', id: 'ballon', hidden: true, role: 'status', 'aria-live': 'polite' });
  const info = h('section', { class: 'info-kaart', id: 'info-kaart', hidden: true, 'aria-live': 'polite' });
  const legende = h('div', { class: 'legende', id: 'legende', hidden: true });
  const balk = h('nav', { class: 'stad-balk', 'aria-label': 'Werkbalk' });
  const cam = h('div', { class: 'cam-knoppen', 'aria-label': 'Camera' });
  app.append(h('div', { class: 'stad-wrap' }, view, top, adviseurs, ballon, info, legende, balk, cam, h('div', { id: 'raid-banner', class: 'raid-banner', hidden: true })));
  bouwTopbalk(top); bouwAdviseurs(adviseurs); bouwWerkbalk(balk); bouwCamKnoppen(cam);

  S.stad = await maakStad(view, {
    onPick: (id) => kiesInStad(id),
    onKwaliteit: (q, auto) => { if (auto) toast('De stad schakelt naar een lichtere grafische stand, zodat alles vlot blijft.'); updateKwaliteitKnop(); },
    onBouw: (id) => { const g = S.model?.gebouwen.find(x => x.id === id); if (g) blip('code'); },
  });
  if (S.stad.is2D) view.classList.add('is-2d');
  S.stad.setTijd(S.tijd || tijdUitInstelling());
  // vaste markers
  for (const id of GIDS_VOLGORDE) {
    const g = GIDSEN[id], w = MACHTEN.find(m => m.id === g.macht);
    const el = h('button', { type: 'button', class: 'marker hq', style: { '--k': w.kleur }, 'aria-label': `${g.naam}: ${g.plek}`, onclick: () => kiesInStad('gids:' + id) },
      h('span', { class: 'marker-rond' }, gidsPortret(id, 2)), h('span', { class: 'marker-naam' }, g.plek), h('span', { class: 'marker-badge', hidden: true, 'data-gids': id }));
    S.stad.zetMarker('hq:' + id, el, 'gids:' + id);
  }
  S.stad.zetMarker('station', h('button', { type: 'button', class: 'marker label', onclick: () => kiesInStad('station') }, 'Station Klets'), { x: 0, y: 6.4, z: -2.2 });
  S.stad.zetMarker('poort', h('button', { type: 'button', class: 'marker label poort', onclick: () => kiesInStad('poort') }, 'De Poort'), { x: 57.5, y: 10.5, z: 0 });
  S.stad.zetMarker('kluis', h('button', { type: 'button', class: 'marker label klein', onclick: () => kiesInStad('kluis') }, 'Codekluis'), { x: -4.1, y: 2.6, z: 3.9 });
  S.stad.zetMarker('missiebord', h('button', { type: 'button', class: 'marker label klein', onclick: () => kiesInStad('missiebord') }, 'Missiebord'), { x: 4.1, y: 2.6, z: 3.9 });
  await bouwStad({ eerste: true });
  view.querySelector('canvas')?.focus();
  if (!S.pupil.leerkracht && !(S.pupil.gezien || []).includes('intro')) showIntro();
  else setTimeout(() => adviseurPraat(), 2500);
  clearInterval(S.praatIv); S.praatIv = setInterval(() => { if (!document.querySelector('.overlay')) adviseurPraat(); }, 45000);
  sync.publish('raid:vraag', {});
}
function tijdUitInstelling() { const dn = S.settings.dagNacht; return dn === 'dag' ? 'dag' : dn === 'nacht' ? 'nacht' : 'cyclus'; }

/** Lees alle gegevens en toon ze in de stad. */
async function bouwStad({ eerste = false, vlieg = false } = {}) {
  if (!S.stad) return;
  const attempts = await store.listAttempts();
  S.model = stadModel({ pupils: S.pupils, attempts, settings: S.settings, doelen: QUESTE1.doelen, meId: S.pupil.leerkracht ? null : S.pupil.id, goalMissies: GOAL_MISSIES });
  const sleutel = 'klets:stad:gezien:' + S.pupil.id;
  if (eerste) { try { const oud = JSON.parse(localStorage.getItem(sleutel) || 'null'); if (oud) S.stad.bekend = new Map(Object.entries(oud)); } catch { /* niets */ } }
  const nieuw = S.stad.update(S.model, { animeer: true, vlieg });
  try { localStorage.setItem(sleutel, JSON.stringify(Object.fromEntries(S.model.gebouwen.filter(g => g.gebouwd).map(g => [g.id, g.niveau])))); } catch { /* vol */ }
  // marker "Jij" boven het eigen huis
  const mijn = S.model.huizen.find(x => x.ik);
  if (mijn && !S.stad.markers.has('jij')) S.stad.zetMarker('jij', h('button', { type: 'button', class: 'marker jij', onclick: () => kiesInStad(mijn.id) }, 'Jouw huis'), mijn.id);
  if (nieuw.length) {
    const g = nieuw[0], w = WIJK[g.macht];
    setTimeout(() => {
      toast(nieuw.length === 1 ? `Nieuw in de ${w.naam}: ${g.type} (${g.code})` : `${nieuw.length} nieuwe gebouwen in de stad!`);
      adviseurPraat(w.gids, nieuw.length === 1 ? `Kijk! In de ${w.naam} verrijst een ${g.type.toLowerCase()}. Dat doel heeft de klas samen gehaald.` : `De stad groeit: ${nieuw.length} nieuwe gebouwen. Knap werk van de hele klas!`);
    }, eerste ? 1200 : 600);
  }
  updateHud();
}

function bouwTopbalk(top) {
  top.append(
    h('div', { class: 'top-ik' }, h('div', { id: 'hud-avatar', class: 'top-avatar' }), h('div', { class: 'top-ik-tekst' }, h('b', { id: 'hud-naam' }), h('small', { id: 'hud-rang' }), h('div', { class: 'balkje' }, h('span', { id: 'hud-xp' })))),
    h('div', { class: 'top-stad', title: 'Klasmeter: alle XP van de klas samen' },
      h('div', { class: 'top-stadnaam' }, h('b', { id: 'hud-stadnaam' }, S.settings.klasNaam || 'Klets'), h('small', {}, 'jouw klasstad')),
      h('div', { class: 'top-cijfers' },
        h('span', { class: 'cijfer' }, h('b', { id: 'hud-bevolking' }, '0'), h('small', {}, 'reizigers')),
        h('span', { class: 'cijfer' }, h('b', { id: 'hud-gebouwen' }, '0'), h('small', {}, 'gebouwen')),
        h('span', { class: 'cijfer' }, h('b', { id: 'hud-klasxp' }, '0'), h('small', {}, 'klas-XP')),
        h('span', { class: 'cijfer mist' }, h('b', { id: 'hud-mist' }, '0 %'), h('small', {}, 'mist'))),
      h('div', { class: 'balkje klas', 'aria-label': 'Klasmeter' }, h('span', { id: 'hud-klas' }))),
    h('div', { class: 'top-rechts' },
      h('button', { class: 'rond klein', type: 'button', id: 'btn-tijd', title: 'Dag en nacht', 'aria-label': 'Dag en nacht', onclick: wisselTijd }, icoon('cyclus')),
      h('button', { class: 'rond klein', type: 'button', id: 'btn-kwaliteit', title: 'Grafische kwaliteit', 'aria-label': 'Grafische kwaliteit', onclick: wisselKwaliteit }, icoon('kwaliteit')),
      h('button', { class: 'rond klein zacht', type: 'button', title: S.pupil.leerkracht ? 'Stop' : 'Afmelden', 'aria-label': S.pupil.leerkracht ? 'Stop' : 'Afmelden', onclick: logout }, icoon('uit'))));
}
function bouwAdviseurs(el) {
  for (const id of GIDS_VOLGORDE) {
    const g = GIDSEN[id], w = MACHTEN.find(m => m.id === g.macht);
    el.append(h('button', { type: 'button', class: 'adviseur', id: 'adv-' + id, style: { '--k': w.kleur }, title: `${g.naam}: ${g.plek}`, 'aria-label': `Adviseur ${g.naam}`, onclick: () => kiesInStad('gids:' + id) },
      gidsPortret(id, 3), h('span', { class: 'adv-badge', hidden: true })));
  }
}
function bouwWerkbalk(balk) {
  const knop = (id, ico, label, fn) => h('button', { type: 'button', class: 'balk-knop', id, onclick: fn }, h('span', { class: 'rond' }, icoon(ico)), h('span', { class: 'balk-lbl' }, label));
  balk.append(
    knop('btn-missies', 'missies', 'Missies', () => openMissiebord()),
    knop('btn-adviseurs', 'adviseurs', 'Adviseurs', () => openGidsenLijst()),
    knop('btn-lagen', 'lagen', 'Kaartlagen', () => wisselLaag()),
    knop('btn-huis', 'huis', 'Mijn huis', () => openHuis()),
    knop('btn-kluis', 'kluis', 'Codekluis', () => openKluis()),
    knop('btn-stad', 'stad', 'Klasstad', () => openKlasstad()),
    knop('btn-poort', 'poort', 'De Poort', () => openPoort()),
    knop('btn-trein', 'trein', 'Nachttrein', () => openTrein()));
}
function bouwCamKnoppen(el) {
  const k = (ico, label, fn) => h('button', { type: 'button', class: 'rond klein', title: label, 'aria-label': label, onclick: fn }, icoon(ico));
  el.append(k('links', 'Draai links', () => S.stad.draai(-1)), k('rechts', 'Draai rechts', () => S.stad.draai(1)),
    k('plus', 'Inzoomen', () => S.stad.zoom(-1)), k('min', 'Uitzoomen', () => S.stad.zoom(1)), k('thuis', 'Terug naar het station', () => S.stad.thuis()));
}

function updateHud() {
  const p = S.pupil, rang = rangVoor(p.xp || 0);
  const av = $('#hud-avatar'); if (!av) return;
  av.innerHTML = ''; av.append(avatarCanvas(p.look, 2));
  $('#hud-naam').textContent = p.naam;
  $('#hud-rang').textContent = `${rang.naam} - ${p.xp || 0} XP`;
  $('#hud-xp').style.width = Math.round(rang.pct * 100) + '%';
  const m = S.model;
  if (m) {
    $('#hud-bevolking').textContent = String(m.bevolking);
    $('#hud-gebouwen').textContent = String(m.aantalGebouwd);
    $('#hud-klasxp').textContent = fmtGetal(m.xp);
    $('#hud-mist').textContent = Math.round(m.mist * 100) + ' %';
    $('#hud-klas').style.width = Math.round(clamp(m.xp / Math.max(1, m.doelXp), 0, 1) * 100) + '%';
  }
  $('#hud-stadnaam').textContent = S.settings.klasNaam || 'Klets';
  updateKwaliteitKnop(); updateTijdKnop();
  updateBadges();
}
const fmtGetal = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
async function updateBadges() {
  const attempts = S.pupil.leerkracht ? [] : await store.listAttempts({ pid: S.pupil.id });
  const gedaan = new Set(attempts.map(a => a.missie));
  const b = {};
  for (const m of CATALOG) if (m.week === S.settings.huidigeWeek && m.sets && !gedaan.has(m.id)) b[m.gids] = (b[m.gids] || 0) + 1;
  S.badges = b;
  for (const id of GIDS_VOLGORDE) {
    const n = b[id] || 0;
    const ab = document.querySelector(`#adv-${id} .adv-badge`); if (ab) { ab.hidden = !n; ab.textContent = String(n); }
    const mb = document.querySelector(`.marker-badge[data-gids="${id}"]`); if (mb) { mb.hidden = !n; mb.textContent = String(n); }
  }
}

function wisselTijd() {
  const i = TIJDEN.findIndex(t => t[0] === (S.tijd || tijdUitInstelling()));
  S.tijd = TIJDEN[(i + 1) % TIJDEN.length][0];
  S.stad.setTijd(S.tijd); updateTijdKnop();
  toast(TIJDEN.find(t => t[0] === S.tijd)[1]);
}
function updateTijdKnop() {
  const b = $('#btn-tijd'); if (!b) return;
  const t = TIJDEN.find(x => x[0] === (S.tijd || tijdUitInstelling())) || TIJDEN[0];
  b.innerHTML = ''; b.append(icoon(t[2])); b.title = `Dag en nacht: ${t[1]}`;
}
function wisselKwaliteit() {
  if (S.stad.is2D) { toast('Dit toestel toont de eenvoudige kaart (geen 3D).'); return; }
  const nu = S.stad.kwaliteit === 'hoog' ? 'laag' : 'hoog';
  S.stad.setKwaliteit(nu); bewaarKwaliteit(nu); S.stad.autoKwaliteit = false;
  updateKwaliteitKnop();
  toast(nu === 'hoog' ? 'Mooie grafische stand' : 'Lichte grafische stand (sneller)');
}
function updateKwaliteitKnop() { const b = $('#btn-kwaliteit'); if (b && S.stad) { b.classList.toggle('aan', S.stad.kwaliteit === 'hoog'); b.title = S.stad.is2D ? 'Eenvoudige kaart' : `Grafische kwaliteit: ${S.stad.kwaliteit === 'hoog' ? 'mooi' : 'licht'}`; } }

function wisselLaag() {
  const i = LAGEN.findIndex(l => l[0] === (S.laag || null));
  S.laag = LAGEN[(i + 1) % LAGEN.length][0];
  S.stad.setOverlay(S.laag);
  $('#btn-lagen').classList.toggle('aan', !!S.laag);
  const lg = $('#legende');
  lg.hidden = !S.laag; lg.innerHTML = '';
  if (!S.laag) return;
  const rij = (kleur, tekst) => h('li', {}, h('span', { class: 'stip-k', style: { background: kleur } }), tekst);
  lg.append(h('b', {}, LAGEN.find(l => l[0] === S.laag)[1]));
  if (S.laag === 'sterkte' || S.laag === 'wijken') lg.append(h('ul', {}, rij('#35e08f', 'sterk: bijna iedereen die oefende, haalde het'), rij('#c6ea3a', 'goed op weg'), rij('#ffc23a', 'groeit nog'), rij('#ff8a3d', 'hier oefenen we samen verder')),
    h('small', {}, 'Enkel aantallen van de klas, nooit namen.'));
  if (S.laag === 'mijn') lg.append(h('ul', {}, rij('#4fd2ff', 'gebouwen waar jij aan meebouwde'), rij('#ffe066', 'jouw huis')));
  lg.append(h('button', { type: 'button', class: 'btn klein', onclick: () => { S.laag = LAGEN[LAGEN.length - 1][0]; wisselLaag(); } }, 'Kaartlaag uit'));
}

/** Iets in de stad werd aangeklikt (of gekozen via een marker of adviseur). */
function kiesInStad(id) {
  if (!id) { sluitInfo(); return; }
  S.stad.selecteer(id);
  if (id === 'kluis') { sluitInfo(); return openKluis(); }
  if (id === 'missiebord') { sluitInfo(); return openMissiebord(); }
  if (id === 'poort') { sluitInfo(); return openPoort(); }
  if (id === 'trein') { sluitInfo(); return openTrein(); }
  toonInfo(id);
}
function sluitInfo() { const k = $('#info-kaart'); if (k) { k.hidden = true; k.innerHTML = ''; } S.stad?.selecteer(null); }

async function toonInfo(id) {
  const k = $('#info-kaart'); k.innerHTML = ''; k.hidden = false;
  const kop = (titel, sub, kleur, beeld) => h('header', { class: 'ik-kop', style: { '--k': kleur || '#4c8fd6' } }, beeld || null, h('div', {}, h('small', {}, sub), h('h2', {}, titel)),
    h('button', { type: 'button', class: 'rond klein zacht', 'aria-label': 'Sluiten', onclick: sluitInfo }, icoon('sluit')));
  if (id.startsWith('gids:')) {
    const gid = id.slice(5), g = GIDSEN[gid], w = MACHTEN.find(m => m.id === g.macht);
    const lijst = CATALOG.filter(m => m.gids === gid && m.week === S.settings.huidigeWeek);
    add(k, kop(g.plek, `${g.naam} de ${g.dier} - ${WIJK[g.macht].naam}`, w.kleur, gidsPortret(gid, 3)),
      h('p', { class: 'ik-groet' }, lijst.length ? GROET[gid] : 'Deze week heb ik geen digitale missie. Kijk op het Missiebord.'),
      h('ul', { class: 'ik-missies' }, ...await Promise.all(lijst.slice(0, 5).map(m => compacteMissie(m)))),
      h('div', { class: 'ik-knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => openGids(gid) }, 'Alle missies van ' + g.naam),
        h('button', { type: 'button', class: 'btn', onclick: () => S.stad.focus(id, 26) }, 'Zoom in')));
    return;
  }
  if (id.startsWith('doel:')) {
    const g = S.model.gebouwen.find(x => x.id === id); if (!g) return sluitInfo();
    const w = WIJK[g.macht], kleur = MACHTEN.find(m => m.id === g.macht).kleur;
    const sterkTxt = g.sterkte >= 0.75 ? 'Sterk' : g.sterkte >= 0.5 ? 'Goed op weg' : g.sterkte >= 0.25 ? 'Groeit nog' : 'Samen verder oefenen';
    const missies = (g.missies || []).map(mid => CATALOG.find(m => m.id === mid)).filter(Boolean);
    add(k, kop(g.gebouwd ? `${g.type}` : 'Bouwplaats', `${w.naam} - doel ${g.code}`, kleur),
      h('p', { class: 'ik-doel' }, g.doel || 'Een doel uit de handleiding.'),
      h('div', { class: 'ik-stats' },
        h('div', {}, h('b', {}, String(g.aantal)), h('small', {}, g.aantal === 1 ? 'reiziger bouwde mee' : 'reizigers bouwden mee')),
        h('div', {}, h('b', {}, g.gebouwd ? NIVEAU_NAAM[g.niveau] : 'In aanbouw'), h('small', {}, 'grootte')),
        h('div', {}, h('b', {}, sterkTxt), h('small', {}, 'sterkte van de klas'))),
      g.ik ? h('p', { class: 'ik-jij' }, 'Jij hebt dit doel behaald. Jouw steen zit in dit gebouw.') : null,
      !g.gebouwd ? h('p', { class: 'tip' }, 'Zodra iemand dit doel haalt, komt hier een gebouw. Hoe meer reizigers het halen, hoe groter.') : null,
      missies.length ? h('h3', {}, 'Oefen dit doel') : null,
      missies.length ? h('ul', { class: 'ik-missies' }, ...await Promise.all(missies.slice(0, 3).map(m => compacteMissie(m)))) : null);
    return;
  }
  if (id.startsWith('huis:')) {
    const hu = S.model.huizen.find(x => x.id === id); if (!hu) return sluitInfo();
    const deco = Object.keys(hu.huis?.deco || {}).filter(x => hu.huis.deco[x]);
    add(k, kop(hu.ik ? 'Jouw huis' : `Huis van ${hu.naam}`, 'Reizigerswijk', '#e9a23b', avatarCanvas(hu.look, 2)),
      h('p', {}, deco.length ? 'Versierd met: ' + deco.map(d => HUISDECOR[d]).filter(Boolean).join(', ') + '.' : (hu.ik ? 'Je huis is nog niet versierd. Codes uit je Logboek geven versiering.' : 'Een gezellig huis in de Reizigerswijk.')),
      hu.ik ? h('div', { class: 'ik-knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => openHuis() }, 'Versier je huis')) : null);
    return;
  }
  if (id === 'station') {
    const w = QUESTE1.weken[S.settings.huidigeWeek - 1];
    add(k, kop('Station Klets', 'Het hart van de stad', '#2f8f8a'),
      h('p', {}, `Hier stopt de nachttrein. Deze week: ${w.titel}.`),
      h('div', { class: 'ik-knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => openTrein() }, 'Het weekverhaal'), h('button', { type: 'button', class: 'btn', onclick: () => openMissiebord() }, 'Missiebord')));
    return;
  }
  if (id === 'klasmeter') {
    const m = S.model;
    add(k, kop('Klasmeter', 'Stationsplein', '#f2c94c'),
      h('p', {}, `De klas verzamelde samen ${fmtGetal(m.xp)} XP van de ${fmtGetal(m.doelXp)}. Hoe hoger de gouden ring, hoe verder de Grijze Mist wegtrekt.`),
      h('div', { class: 'balkje klas groot' }, h('span', { style: { width: Math.round(clamp(m.xp / Math.max(1, m.doelXp), 0, 1) * 100) + '%' } })),
      h('div', { class: 'ik-knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => openKlasstad() }, 'Klasstad-overzicht')));
    return;
  }
  sluitInfo();
}
async function compacteMissie(m) {
  const open = isOpen(m, S.settings, S.pupil);
  const att = S.pupil.leerkracht ? [] : (await store.listAttempts({ pid: S.pupil.id })).filter(a => a.missie === m.id && a.bron === 'missie');
  const best = att.reduce((b, a) => (!b || a.goed / Math.max(1, a.totaal) > b.goed / Math.max(1, b.totaal) ? a : b), null);
  return h('li', {}, h('div', { class: 'ikm-tekst' }, h('b', {}, m.naam), h('small', {}, best ? `Gedaan: ${best.goed}/${best.totaal}` : `${cap(m.dag)} - nieuw`)),
    open ? h('button', { type: 'button', class: 'btn primair klein missie-start', 'data-missie': m.id, onclick: () => startMissie(m) }, best ? 'Opnieuw' : 'Start') : h('small', { class: 'later-uitleg' }, `Week ${m.week}`));
}

/** Een adviseur zegt iets in een ballon. Zonder argumenten: een gids met nieuwe missies. */
function adviseurPraat(gid, tekst) {
  if (!S.stad || document.querySelector('.overlay')) return;
  const b = S.badges || {};
  if (!gid) {
    const kand = GIDS_VOLGORDE.filter(id => b[id]);
    if (!kand.length) return;
    S.praatI = ((S.praatI ?? -1) + 1) % kand.length;
    gid = kand[S.praatI];
    const n = b[gid], w = WIJK[GIDSEN[gid].macht];
    tekst = `${S.pupil.naam}, in de ${w.naam} ${n === 1 ? 'wacht een nieuwe missie' : `wachten ${n} nieuwe missies`} op jou.`;
  }
  const g = GIDSEN[gid], el = $('#ballon');
  el.innerHTML = ''; el.hidden = false; el.style.setProperty('--k', MACHTEN.find(m => m.id === g.macht).kleur);
  el.append(h('div', { class: 'ballon-portret' }, gidsPortret(gid, 3)),
    h('div', { class: 'ballon-tekst' }, h('b', {}, g.naam), h('p', {}, tekst),
      h('div', { class: 'ballon-knoppen' },
        h('button', { type: 'button', class: 'btn primair klein', onclick: () => { el.hidden = true; kiesInStad('gids:' + gid); } }, 'Toon missies'),
        h('button', { type: 'button', class: 'btn klein', onclick: () => { el.hidden = true; S.stad.focus('gids:' + gid, 26); } }, 'Breng me erheen'),
        h('button', { type: 'button', class: 'btn klein zacht', 'aria-label': 'Sluiten', onclick: () => { el.hidden = true; } }, 'Later'))));
  document.querySelectorAll('.adviseur').forEach(a => a.classList.toggle('praat', a.id === 'adv-' + gid));
  clearTimeout(S.ballonT);
  S.ballonT = setTimeout(() => { el.hidden = true; document.querySelectorAll('.adviseur.praat').forEach(a => a.classList.remove('praat')); }, 14000);
}

function showIntro() {
  const w = QUESTE1.weken[S.settings.huidigeWeek - 1];
  const pan = panel('Welkom in Klets', 'trein');
  add(pan.body,
    h('div', { class: 'gids-zegt groot' }, gidsPortret('atlas', 4), h('p', {}, `Welkom, ${S.pupil.naam}. Ik ben Atlas. De Grijze Mist heeft de wereld uitgewist. Samen bouwen we een stad: elk doel dat iemand in de klas haalt, wordt een gebouw. En hoe meer we leren, hoe verder de mist wegtrekt.`)),
    h('ul', { class: 'uitleg-lijst' },
      h('li', {}, 'Sleep om de stad te verschuiven. Scroll of knijp om te zoomen. Draai met de rechtermuisknop of de pijlknoppen rechtsonder.'),
      h('li', {}, 'Klik op een gebouw: je ziet welk doel het is en hoeveel reizigers meebouwden.'),
      h('li', {}, 'De zes gidsen zijn je adviseurs (links). Klik op een gids voor de missies van deze week.'),
      h('li', {}, 'Je hebt je eigen huis in de Reizigerswijk. Versier het met codes uit je Logboek.')),
    h('p', { class: 'tip' }, `Deze week: ${w.titel}.`));
  add(pan.foot, h('button', { class: 'btn groot primair', type: 'button', onclick: async () => { pan.close(); const p = await store.getPupil(S.pupil.id); if (p) { p.gezien = [...(p.gezien || []), 'intro']; await store.savePupil(p); S.pupil = p; } setTimeout(() => adviseurPraat(), 800); } }, 'Aan de slag!'));
}

// ---------- panelen ----------
function panel(titel, soort = '', { breed = false } = {}) {
  S.stad?.pause(true);
  const body = h('div', { class: 'p-body' }), foot = h('footer', { class: 'p-foot' });
  const sluit = h('button', { class: 'btn sluit', type: 'button', 'aria-label': 'Sluiten' }, 'Sluiten');
  const pan = h('div', { class: 'paneel ' + soort + (breed ? ' breed' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': titel }, h('header', { class: 'p-head' }, h('h2', {}, titel), sluit), body, foot);
  const ov = h('div', { class: 'overlay' }, pan);
  document.body.append(ov);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  function close() { ov.remove(); document.removeEventListener('keydown', onKey); if (!document.querySelector('.overlay')) { S.stad?.pause(false); $('#stad canvas')?.focus(); } }
  sluit.onclick = close;
  ov.addEventListener('pointerdown', (e) => { if (e.target === ov) close(); });
  return { body, foot, close, el: pan };
}

function weekTabs(cur, onPick) {
  return h('div', { class: 'week-tabs', role: 'tablist' }, ...QUESTE1.weken.map(w => {
    const open = S.settings.allesOpen || S.pupil.leerkracht || w.week <= S.settings.huidigeWeek;
    return h('button', { type: 'button', role: 'tab', 'aria-selected': String(w.week === cur), class: 'tab' + (w.week === cur ? ' sel' : '') + (open ? '' : ' later'), onclick: () => onPick(w.week) }, `Week ${w.week}`);
  }));
}

async function missieRij(m, { metGids = false } = {}) {
  const pupil = S.pupil;
  const open = isOpen(m, S.settings, pupil);
  const attempts = pupil.leerkracht ? [] : (await store.listAttempts({ pid: pupil.id })).filter(a => a.missie === m.id && a.bron === 'missie');
  const best = attempts.reduce((b, a) => (!b || a.goed / Math.max(1, a.totaal) > b.goed / Math.max(1, b.totaal) ? a : b), null);
  const route = routeVoor(pupil, m.macht);
  const status = !m.sets && !['overzicht', 'klasmeter', 'raid'].includes(m.kind) ? h('span', { class: 'status klas' }, 'In de klas')
    : best ? h('span', { class: 'status gedaan' }, `Gedaan: ${best.goed}/${best.totaal}`) : h('span', { class: 'status nieuw' }, 'Nieuw');
  const knop = open
    ? h('button', { class: 'btn primair', type: 'button', onclick: () => startMissie(m) }, best ? 'Opnieuw' : 'Start')
    : h('span', { class: 'later-uitleg' }, `Opent in week ${m.week}. Je leerkracht kan ze nu al openzetten.`);
  const routeKeuze = pupil.leerkracht && m.sets ? h('select', { class: 'route-select', 'aria-label': 'Route', onchange: (e) => { pupil.routes[m.macht] = e.target.value; } }, ...ROUTES.map(r => h('option', { value: r.id, selected: r.id === route }, r.naam))) : null;
  return h('li', { class: 'missie-rij' + (open ? '' : ' later') },
    metGids ? gidsPortret(m.gids, 2) : null,
    h('div', { class: 'mr-tekst' }, h('b', {}, m.naam), h('small', {}, `${cap(m.dag)} - ${m.les.titel}`)),
    h('span', { class: 'macht-chip', style: { '--k': (MACHTEN.find(x => x.id === m.macht) || {}).kleur } }, m.macht),
    routeKeuze || (m.sets ? h('span', { class: 'route-badge r-' + kiesSet(m, route).route }, ROUTE[kiesSet(m, route).route]?.naam) : null),
    status, knop);
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

async function openGids(gid) {
  const g = GIDSEN[gid];
  const pan = panel(`${g.naam} de ${g.dier}`, 'gids');
  let week = S.settings.huidigeWeek;
  async function draw() {
    pan.body.innerHTML = '';
    const lijst = CATALOG.filter(m => m.gids === gid && m.week === week);
    const groet = lijst.length ? GROET[gid] : `Deze week heb ik geen digitale missie voor jou. Kijk op het Missiebord in de stationshal.`;
    add(pan.body, h('div', { class: 'gids-zegt groot' }, gidsPortret(gid, 4), h('div', {}, h('p', {}, groet), h('button', { class: 'btn klein', type: 'button', onclick: () => speak(groet) }, 'Lees voor'))),
      weekTabs(week, (w) => { week = w; draw(); }),
      h('p', { class: 'week-titel' }, `Week ${week}: ${QUESTE1.weken[week - 1].titel}`));
    const ul = h('ul', { class: 'missie-lijst' });
    for (const m of lijst) ul.append(await missieRij(m));
    if (!lijst.length) ul.append(h('li', { class: 'leeg' }, 'Geen missies bij deze gids in deze week.'));
    add(pan.body, ul);
  }
  draw();
}
const GROET = {
  tella: 'Hallo reiziger! Ik ben Tella. Getallen zijn mijn sterren. Kies een missie.',
  woordje: 'Woorden zijn sleutels! Ik ben Woordje. Welke deur openen we vandaag?',
  atlas: 'Ik ben Atlas, de kaartenmaker. Elke missie tekent een stukje kaart terug.',
  kroniek: 'Oehoe. Ik ben Kroniek. Ik bewaar wat we beleefden. Kijk met mij terug.',
  bram: 'Welkom bij mijn kampvuur. Ik ben Bram. Hier mag je zeggen hoe je je voelt. Je moet niet.',
  byte: 'Biep! Ik ben Byte. Ik help je met je laptop, muziek en beeld.',
};

function openGidsenLijst() {
  const pan = panel('De adviseurs van Klets');
  const ul = h('ul', { class: 'gidsen-lijst' });
  for (const [id, g] of Object.entries(GIDSEN)) {
    ul.append(h('li', {}, gidsPortret(id, 3), h('div', {}, h('b', {}, `${g.naam} de ${g.dier}`), h('small', {}, `${g.plek} - ${g.rol}`)),
      h('button', { class: 'btn', type: 'button', onclick: () => { pan.close(); S.stad.focus('gids:' + id, 26); kiesInStad('gids:' + id); } }, 'Toon in de stad'),
      h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openGids(id); } }, 'Open')));
  }
  add(pan.body, h('p', { class: 'tip' }, 'Elke gids heeft een gebouw in zijn eigen wijk. Klik er in de stad op om zijn missies te zien.'), ul);
}

async function openMissiebord() {
  const pan = panel('Missiebord', 'bord', { breed: true });
  let week = S.settings.huidigeWeek;
  async function draw() {
    pan.body.innerHTML = '';
    const w = QUESTE1.weken[week - 1];
    add(pan.body, weekTabs(week, (x) => { week = x; draw(); }), h('p', { class: 'week-titel' }, `Week ${week}: ${w.titel}`));
    if (!(S.settings.allesOpen || S.pupil.leerkracht || week <= S.settings.huidigeWeek)) add(pan.body, h('p', { class: 'info-blok' }, `Deze week opent later in het jaar. Je kan alvast kijken wat er komt. Je leerkracht kan alles openzetten in het dashboard.`));
    for (const dag of DAGEN) {
      const lijst = CATALOG.filter(m => m.week === week && m.dag === dag);
      if (!lijst.length) continue;
      const ul = h('ul', { class: 'missie-lijst' });
      for (const m of lijst) ul.append(await missieRij(m, { metGids: true }));
      add(pan.body, h('h3', { class: 'dag' }, cap(dag)), ul);
    }
  }
  draw();
}

async function startMissie(m) {
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  S.stad?.pause(true);
  if (m.kind === 'overzicht') return openWeekoverzicht(m.week);
  if (m.kind === 'klasmeter') return openKlasstad();
  const routeWens = routeVoor(S.pupil, m.macht);
  await runMission({ missie: m, pupil: S.pupil, routeWens, store, mode: S.pupil.leerkracht ? 'voorbeeld' : 'missie', doelen: QUESTE1.doelen });
  if (!S.pupil.leerkracht) sync.publish('klas:update', {});
  sluitInfo();
  S.stad?.pause(false);
  await refresh({ vlieg: true });
  $('#stad canvas')?.focus();
}

async function previewMission(id, route) {
  const m = CATALOG.find(x => x.id === id);
  const app = $('#app'); app.innerHTML = '';
  app.append(h('main', { class: 'login' }, h('h1', { class: 'logo' }, 'Klets!'), h('p', {}, 'Voorbeeldmodus voor de leerkracht. Er wordt niets bewaard.'),
    h('a', { class: 'btn', href: 'leerkracht.html' }, 'Terug naar het dashboard')));
  if (!m) return toast('Missie niet gevonden.');
  if (m.kind === 'overzicht' || m.kind === 'klasmeter') return toast('Dit is een overzichtsscherm, geen oefenreeks.');
  await runMission({ missie: m, pupil: { id: 'voorbeeld', naam: 'Leerkracht', routes: {} }, routeWens: route, mode: 'voorbeeld', doelen: QUESTE1.doelen });
}

// ---------- codekluis en garderobe ----------
async function openKluis() {
  const pan = panel('Codekluis', 'kluis');
  async function draw(msg) {
    const p = S.pupil;
    pan.body.innerHTML = '';
    const inp = h('input', { type: 'text', class: 'invoer code', id: 'code-invoer', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', placeholder: 'GEHEIME-CODE', 'aria-label': 'Geheime code' });
    const res = h('p', { class: 'code-res', 'aria-live': 'polite' }, msg || '');
    const probeer = async () => {
      const code = normCode(inp.value);
      if (!code) return;
      if (!CODES[code]) { res.textContent = 'Die code ken ik niet. Kijk nog eens goed in je Logboek.'; res.className = 'code-res mis'; blip('nee'); return; }
      if ((p.codes || []).includes(code)) { res.textContent = 'Die code had je al gevonden.'; res.className = 'code-res'; return; }
      const bel = beloningVoor(code);
      if (!p.leerkracht) {
        const fresh = (await store.getPupil(p.id)) || p;
        fresh.codes = [...(fresh.codes || []), code];
        if (bel.soort === 'kosmetiek' && !(fresh.kosmetiek || []).includes(bel.id)) fresh.kosmetiek = [...(fresh.kosmetiek || []), bel.id];
        if (bel.soort === 'kaartstuk') fresh.kaartstukken = [...new Set([...(fresh.kaartstukken || []), bel.id])];
        fresh.xp = (fresh.xp || 0) + XP.code;
        await store.savePupil(fresh); S.pupil = fresh;
        sync.publish('klas:update', {});
      } else { p.codes = [...(p.codes || []), code]; }
      blip('code');
      await refresh();
      draw(`De kluis klikt open! Je krijgt: ${bel.naam} (+${XP.code} XP).`);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') probeer(); });
    add(pan.body, h('p', {}, 'Elke bladzijde in je Logboek kan een geheime code hebben. Codes geven extraatjes: kleding, sporen en stukken van de wereldkaart. Missies zijn altijd open, ook zonder code.'),
      h('div', { class: 'code-rij' }, inp, h('button', { class: 'btn primair', type: 'button', id: 'code-knop', onclick: probeer }, 'Open')), res);
    // overzicht per week
    const wk = S.settings.huidigeWeek;
    const weekCodes = Object.values(CODES).filter(c => c.week === wk);
    const gevonden = weekCodes.filter(c => (p.codes || []).includes(c.code));
    add(pan.body, h('h3', {}, `Week ${wk}: ${gevonden.length} van ${weekCodes.length} codes gevonden`),
      h('ul', { class: 'code-lijst' }, ...weekCodes.map(c => {
        const les = QUESTE1.lessen.find(l => l.id === c.lessen[0]);
        const ok = (p.codes || []).includes(c.code);
        return h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'slotje' + (ok ? ' open' : ''), 'aria-hidden': 'true' }), ok ? h('b', {}, c.code) : h('span', {}, 'Nog te vinden'), h('small', {}, ` ${cap(les.dag)}: ${les.titel}`));
      })));
    // garderobe
    const mine = p.leerkracht ? Object.keys(KOSMETIEK) : (p.kosmetiek || []);
    const prevBox = h('div', { class: 'garderobe-prev' }, avatarCanvas(p.look, 6));
    const slots = {};
    for (const id of mine) { const k = KOSMETIEK[id]; if (k) (slots[k.slot] = slots[k.slot] || []).push(id); }
    const SLOTNAMEN = { hoofd: 'Hoofd', nek: 'Nek', gezicht: 'Gezicht', rug: 'Rug', hand: 'Hand', spoor: 'Spoor', kleur: 'Jas' };
    const gar = h('div', { class: 'garderobe' }, prevBox, h('div', { class: 'gar-slots' }, ...Object.entries(slots).map(([slot, ids]) => h('div', { class: 'keuze-rij' }, h('span', { class: 'rij-lbl' }, SLOTNAMEN[slot]),
      h('div', { class: 'stalen' }, h('button', { type: 'button', class: 'staal tekst' + (!p.look.uitrusting?.[slot] ? ' sel' : ''), onclick: () => equip(slot, null) }, 'Geen'),
        ...ids.map(id => h('button', { type: 'button', class: 'staal tekst' + (p.look.uitrusting?.[slot] === id ? ' sel' : ''), onclick: () => equip(slot, id) }, KOSMETIEK[id].naam)))))));
    add(pan.body, h('h3', {}, 'Garderobe'), mine.length ? gar : h('p', { class: 'tip' }, 'Nog leeg. Vind codes in je Logboek om kleding en sporen te verdienen.'));
    if (mine.length && !p.leerkracht) add(pan.body, h('p', { class: 'tip' }, 'Elk extraatje kan je ook aan je huis in de Reizigerswijk hangen. ', h('button', { type: 'button', class: 'btn klein', onclick: () => { pan.close(); openHuis(); } }, 'Versier je huis')));
    if ((p.kaartstukken || []).length) add(pan.body, h('p', { class: 'tip' }, `Stukken van de wereldkaart: ${(p.kaartstukken || []).length}. Ze hangen bij de Klasmeter op het stationsplein.`));
    setTimeout(() => inp.focus(), 30);
  }
  async function equip(slot, id) {
    const p = S.pupil;
    p.look = { ...p.look, uitrusting: { ...(p.look.uitrusting || {}), [slot]: id || undefined } };
    if (!id) delete p.look.uitrusting[slot];
    if (!p.leerkracht) { const fresh = (await store.getPupil(p.id)) || p; fresh.look = p.look; await store.savePupil(fresh); S.pupil = fresh; }
    updateHud(); draw();
  }
  draw();
}

// ---------- klasstad-overzicht en eigen huis ----------
async function openKlasstad() {
  const pan = panel('De Klasstad', 'klasstad', { breed: true });
  const m = S.model;
  const pupils = (await store.listPupils()).filter(p => !p.leerkracht);
  const kaartstukken = new Set(pupils.flatMap(p => p.kaartstukken || []));
  add(pan.body,
    h('div', { class: 'klasmeter-groot' }, h('b', {}, `Klasmeter: ${fmtGetal(m.xp)} XP`), h('div', { class: 'balk klas groot' }, h('span', { style: { width: Math.round(clamp(m.xp / Math.max(1, m.doelXp), 0, 1) * 100) + '%' } })),
      h('small', {}, `Doel: ${fmtGetal(m.doelXp)} XP. Hoe meer XP, hoe verder de Grijze Mist wegtrekt. Nu nog ${Math.round(m.mist * 100)} % mist.`)),
    h('p', {}, 'Elk doel dat iemand in de klas behaalt, wordt een gebouw in de wijk van zijn macht. Hoe meer reizigers het doel halen, hoe groter het gebouw. Een bouwplaats betekent: er wordt geoefend, het gebouw komt eraan.'),
    h('div', { class: 'wijk-tegels' }, ...m.wijken.map(w => h('button', { type: 'button', class: 'wijk-tegel', style: { '--k': (MACHTEN.find(x => x.id === w.macht) || {}).kleur }, onclick: () => { pan.close(); S.stad.focus('gids:' + w.gids, 40); } },
      h('b', {}, w.naam), h('span', {}, `${w.gebouwd} gebouw${w.gebouwd === 1 ? '' : 'en'}`), h('small', {}, `${w.bouwplaatsen} bouwplaats${w.bouwplaatsen === 1 ? '' : 'en'} - ${w.macht}`)))),
    kaartstukken.size ? h('p', { class: 'tip' }, `De klas vond al ${kaartstukken.size} stukken van de wereldkaart.`) : null);
  const gebouwd = m.gebouwen.filter(g => g.gebouwd);
  const lijst = h('ul', { class: 'gebouwen-lijst' }, ...gebouwd.map(g => h('li', {}, h('span', { class: 'macht-chip', style: { '--k': (MACHTEN.find(x => x.id === g.macht) || {}).kleur } }, g.type), h('b', {}, g.code),
    h('small', {}, ` ${g.aantal} reiziger${g.aantal > 1 ? 's' : ''} - ${g.doel}`), h('button', { type: 'button', class: 'btn klein', onclick: () => { pan.close(); S.stad.focus(g.id, 22); kiesInStad(g.id); } }, 'Toon'))));
  add(pan.body, h('h3', {}, `Gebouwen (${gebouwd.length})`), gebouwd.length ? lijst : h('p', { class: 'tip' }, 'Nog geen gebouwen. Doe een missie: elk behaald doel bouwt mee.'));
  const gal = await store.listGallery();
  if (gal.length) add(pan.body, h('h3', {}, 'Galerij'), h('div', { class: 'galerij' }, ...gal.slice(-24).reverse().map(g => h('figure', {}, h('img', { src: g.data, alt: g.titel }), h('figcaption', {}, `${g.titel} - ${g.naam}`)))));
}

async function openHuis() {
  const p = S.pupil;
  if (p.leerkracht) { toast('De leerkracht heeft geen huis in de stad. Leerlingen versieren hier hun eigen huis.'); return; }
  const pan = panel('Mijn huis', 'kluis');
  async function draw() {
    pan.body.innerHTML = '';
    const mine = (S.pupil.kosmetiek || []).filter(id => HUISDECOR[id]);
    const deco = { ...(S.pupil.huis?.deco || {}) };
    add(pan.body, h('div', { class: 'gids-zegt' }, gidsPortret('bram', 3), h('p', {}, 'Dit is jouw plek in de Reizigerswijk. Het dak heeft de kleur van je jas. Met extraatjes uit de Codekluis versier je je huis.')));
    if (!mine.length) { add(pan.body, h('p', { class: 'tip' }, 'Nog geen versiering. Vind geheime codes in je Logboek en typ ze in de Codekluis.')); return; }
    add(pan.body, h('div', { class: 'stalen huis-deco' }, ...mine.map(id => h('button', { type: 'button', class: 'staal tekst' + (deco[id] ? ' sel' : ''), 'aria-pressed': String(!!deco[id]), onclick: () => zet(id, !deco[id]) }, HUISDECOR[id]))),
      h('p', { class: 'tip' }, 'Klik om aan of uit te zetten. Je ziet het meteen in de stad.'));
  }
  async function zet(id, aan) {
    const fresh = (await store.getPupil(S.pupil.id)) || S.pupil;
    fresh.huis = { ...(fresh.huis || {}), deco: { ...(fresh.huis?.deco || {}), [id]: aan } };
    await store.savePupil(fresh); S.pupil = fresh;
    sync.publish('klas:update', {});
    await refresh(); draw();
  }
  pan.el.querySelector('.sluit').addEventListener('click', () => { const hu = S.model?.huizen.find(x => x.ik); if (hu) { S.stad.focus(hu.id, 18); kiesInStad(hu.id); } });
  draw();
}

// ---------- de poort en de trein ----------
function openPoort() {
  const pan = panel('De Poort', 'poort');
  const p = S.pupil, rang = rangVoor(p.xp || 0);
  const questes = ['Aankomst', 'Queste 2', 'Queste 3', 'Queste 4', 'Queste 5', 'Queste 6'];
  add(pan.body, 
    h('p', {}, 'Achter De Poort ligt de middelbare school. Elke queste brengt je een stuk dichter. Dit is jouw reis.'),
    h('ol', { class: 'reis' }, ...questes.map((q, i) => h('li', { class: i === 0 ? 'nu' : '' }, h('b', {}, `Queste ${i + 1}`), h('small', {}, i === 0 ? 'Aankomst: nu bezig' : 'later dit schooljaar')))),
    h('h3', {}, 'Rangen'),
    h('ol', { class: 'rangen' }, ...RANGEN.map((r, i) => h('li', { class: i === rang.index ? 'nu' : i < rang.index ? 'gehaald' : '' }, h('b', {}, r.naam), h('small', {}, `${r.xp} XP`)))));
}
function openTrein() {
  const w = QUESTE1.weken[S.settings.huidigeWeek - 1];
  const pan = panel('De nachttrein', 'trein');
  add(pan.body, h('p', { class: 'week-titel' }, `Week ${w.week}: ${w.titel}`), h('div', { class: 'verhaal' }, h('p', {}, w.verhaal)));
  add(pan.foot, h('button', { class: 'btn', type: 'button', onclick: () => speak(w.verhaal) }, 'Lees voor'));
}

// ---------- weekoverzicht ----------
async function openWeekoverzicht(week) {
  const pan = panel(`Mijn week ${week}`, 'overzicht', { breed: true });
  const p = S.pupil;
  const att = p.leerkracht ? [] : (await store.listAttempts({ pid: p.id })).filter(a => a.week === week);
  const stats = doelStats(att)[p.id] || {};
  const xpWeek = att.reduce((s, a) => s + (a.xp || 0), 0);
  const missies = CATALOG.filter(m => m.week === week && m.sets);
  const gedaan = new Set(att.map(a => a.missie));
  const weekCodes = Object.values(CODES).filter(c => c.week === week);
  add(pan.body, 
    h('div', { class: 'gids-zegt groot' }, gidsPortret('kroniek', 4), h('p', {}, `Oehoe, ${p.naam}. Dit beleefde je deze week. Wat ging goed? Wat oefen je nog?`)),
    h('div', { class: 'tegels' },
      h('div', { class: 'tegel-stat' }, h('b', {}, String(xpWeek)), h('small', {}, 'XP deze week')),
      h('div', { class: 'tegel-stat' }, h('b', {}, `${missies.filter(m => gedaan.has(m.id)).length}/${missies.length}`), h('small', {}, 'missies gedaan')),
      h('div', { class: 'tegel-stat' }, h('b', {}, String(Object.values(stats).filter(s => doelStatus(s) === 'behaald').length)), h('small', {}, 'schilden gekleurd')),
      h('div', { class: 'tegel-stat' }, h('b', {}, `${weekCodes.filter(c => (p.codes || []).includes(c.code)).length}/${weekCodes.length}`), h('small', {}, 'codes gevonden'))),
    h('h3', {}, 'Mijn schilden'),
    Object.keys(stats).length ? h('div', { class: 'schilden' }, ...Object.entries(stats).map(([code, st]) => {
      const s = doelStatus(st);
      return h('div', { class: 'schild ' + s, title: QUESTE1.doelen[code]?.doel || '' }, h('span', { class: 'schild-ico', 'aria-hidden': 'true' }), h('b', {}, code), h('small', {}, s === 'behaald' ? 'Schild gekleurd' : 'Revanche: nog oefenen'));
    })) : h('p', { class: 'tip' }, 'Nog geen resultaten deze week.'),
    h('h3', {}, 'Nog te doen'),
    h('ul', { class: 'missie-lijst' }, ...await Promise.all(missies.filter(m => !gedaan.has(m.id)).map(m => missieRij(m, { metGids: true })))));
  add(pan.foot, h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openKluis(); } }, 'Code van de week invullen'));
}

// ---------- raid (leerlingkant) ----------
function onRaidState(st) {
  S.raid = st;
  const ban = $('#raid-banner'); if (!ban) return;
  const vorigeHp = S.raidHp; S.raidHp = st.hp;
  if (S.stad) S.stad.setStorm(st.status === 'actief' || st.status === 'lobby' ? 0.35 + 0.65 * (st.hp / Math.max(1, st.maxHp)) : 0, { flits: vorigeHp != null && st.hp < vorigeHp });
  if (st.status === 'actief' || st.status === 'lobby') {
    ban.hidden = false; ban.innerHTML = '';
    ban.append(h('b', {}, st.status === 'lobby' ? 'Raid op komst: ' : 'RAID! '), `${st.naam}. `, h('button', { class: 'btn primair', type: 'button', id: 'raid-mee', onclick: openRaid }, 'Doe mee'));
  } else ban.hidden = true;
  if (S.raidPanel) S.raidPanel.update(st);
}

async function openRaid() {
  if (S.raidPanel) return;
  const st = S.raid; if (!st) return;
  const pan = panel(st.naam, 'raid', { breed: true });
  const route = routeVoor(S.pupil, 'Getal') === 'telescoop' ? 'telescoop' : 'kompas';
  const r = rng(S.pupil.id + st.raidId);
  const results = []; let n = 0, current = null, checked = false, saved = false;
  const hp = h('div', { class: 'balk hp' }, h('span', {}));
  const status = h('p', { class: 'raid-status' });
  const zone = h('div', { class: 'raid-zone' });
  const fb = h('div', { class: 'm-feedback', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn groot primair', type: 'button' }, 'Controleer');
  sync.publish('raid:join', { raidId: st.raidId, pid: S.pupil.id });
  add(pan.body, h('div', { class: 'raid-kop' }, h('b', {}, 'Mist-golem'), hp), status, zone, fb);
  add(pan.foot, btn);
  const update = (s) => {
    hp.firstChild.style.width = Math.round((s.hp / Math.max(1, s.maxHp)) * 100) + '%';
    status.textContent = s.status === 'gewonnen' ? 'De mist trekt op! De klas heeft gewonnen.' : s.status === 'gestopt' ? 'De raid is gestopt.' : s.status === 'lobby' ? 'Wacht tot de leerkracht start ... je mag al oefenen.' : `Elke juiste klik doet de golem pijn. Samen staan we sterk.`;
    if (s.status === 'gewonnen' || s.status === 'gestopt') { btn.textContent = 'Terug naar de stad'; btn.onclick = () => pan.close(); zone.innerHTML = ''; save(s.status === 'gewonnen'); }
  };
  S.raidPanel = { update };
  update(st);
  const origClose = pan.close;
  pan.close = () => { save(false); S.raidPanel = null; origClose(); };
  pan.el.querySelector('.sluit').onclick = pan.close;
  function next() {
    checked = false; fb.textContent = ''; fb.className = 'm-feedback';
    const item = raidItem(route, r, n++);
    current = renderItem(item, { rand: r });
    current.item = item;
    zone.innerHTML = '';
    zone.append(h('h3', { class: 'vraag' }, item.vraag), current.el);
    btn.textContent = 'Controleer'; btn.onclick = check;
    setTimeout(() => current.focus?.(), 30);
  }
  async function check() {
    if (checked) return next();
    if (current.ready && !current.ready()) { fb.textContent = 'Maak eerst je keuze.'; return; }
    const res = await current.check(); checked = true; current.reveal(res);
    results.push({ id: current.item.id, goals: current.item.goals, goed: res.goed, totaal: res.totaal, type: current.item.type });
    if (res.goed) { sync.publish('raid:hit', { raidId: st.raidId, hid: uid('h'), pid: S.pupil.id }); fb.className = 'm-feedback goed'; fb.textContent = 'Raak! De golem wankelt.'; blip('hit'); }
    else { fb.className = 'm-feedback mis'; fb.textContent = `Nog niet. Juist was: ${res.juist}. Probeer de volgende!`; }
    btn.textContent = 'Volgende vraag';
  }
  async function save(won) {
    if (saved || S.pupil.leerkracht || !results.length) return; saved = true;
    const goed = results.reduce((s, x) => s + x.goed, 0), totaal = results.reduce((s, x) => s + x.totaal, 0);
    const xp = goed * XP.raidJuist + (won ? XP.raidOverwinning : 0);
    await store.addAttempt({ id: uid('p'), pid: S.pupil.id, missie: 'raid:' + st.raidId, week: S.settings.huidigeWeek, route, items: results, goed, totaal, xp, ts: Date.now(), bron: 'raid' });
    const fresh = (await store.getPupil(S.pupil.id)) || S.pupil; fresh.xp = (fresh.xp || 0) + xp; await store.savePupil(fresh); S.pupil = fresh;
    toast(`Raid: +${xp} XP`);
    sync.publish('klas:update', {});
    refresh();
  }
  next();
}

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, 'Er ging iets mis bij het starten: ' + err.message)); });
