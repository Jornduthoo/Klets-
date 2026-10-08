// Reizigersapp van Vagant: aanmelden, je eigen reiziger maken, de 3D-themastad verkennen, labo's
// binnengaan, missies van de week doen, geheime codes invullen, je huis versieren en samen de eindbaas
// verslaan. Het thema bepaalt alles: de stad, de weken, de doelen, de gebouwen en de eindbaas
// (zie data/themas.js). Het weer en het seizoen volgen het echte weer van Brugge (js/city/weer.js).
import { createStore } from '../core/store.js';
import { createSync } from '../core/sync.js';
import { h, $, add, uid, clamp, speak, blip, toast, rng } from '../core/util.js';
import { MACHTEN, MACHT, ROUTE, ROUTES, GIDSEN, RANGEN, XP, DAGEN, METHODE } from '../config.js';
import { THEMAS, THEMA as THEMA_LIJST, themaVoor } from '../../data/themas.js';
import { themaCatalog, kiesSet, routeVoor, isOpen, rangVoor, doelStats, doelStatus, codeIndex, beloningVoor, normCode, uitrustingLijst } from '../core/model.js';
import { AVATAR_OPTIES, DEFAULT_LOOK, HAAR_NAAM, STOFHAAR, STOF_KLEUREN, CREATOR_TABS, KEUZE_NAAM, willekeurigeLook } from '../figuren/uiterlijk.js';
import { avatarBeeld, maakVoorbeeld, warmOp } from '../figuren/portret.js';
import { maakStad, bewaarKwaliteit } from '../city/stad.js';
import { LABELS } from '../city/layout.js';
import { stadModel, goalMissieIndex, HUISDECOR, NIVEAU_NAAM } from '../city/stadmodel.js';
import { WIJK } from '../city/layout.js';
import { volgWeer, weerTekst, windstreek, huidigWeer } from '../city/weer.js';
import { waterTekst } from '../city/water.js';
import { openLabo } from '../labo/labo.js';
import { icoon } from './iconen.js';
import { runMission, gidsPortret } from '../missions/engine.js';
import { renderItem } from '../missions/types.js';
import { raidItem } from '../missions/raidbank.js';

const store = createStore();
const sync = createSync('klas');
const S = { settings: null, pupil: null, pupils: [], stad: null, model: null, raid: null, preview: false, weer: null };
window.__vagant = S;
window.__klets = S; // oude naam, voor bestaande tests

/** Het thema van de klas en alles wat eruit volgt. */
let THEMA = themaVoor(), CATALOG = [], CODES = {}, GOAL_MISSIES = {}, UITRUSTING = {};
function zetThema(settings) {
  const nieuw = themaVoor(settings);
  if (nieuw === THEMA && CATALOG.length) return false;
  THEMA = nieuw;
  CATALOG = themaCatalog(THEMA);
  CODES = codeIndex(THEMA);
  GOAL_MISSIES = goalMissieIndex(CATALOG);
  UITRUSTING = uitrustingLijst(THEMA);
  return true;
}
const stadNaam = () => S.settings?.klasNaam || THEMA.stad || METHODE;
const weekVan = (n) => THEMA.weken.find(w => w.week === n) || THEMA.weken[0] || { week: 1, titel: '' };

// ---------- opstart ----------
async function init() {
  S.settings = await store.getSettings();
  zetThema(S.settings);
  await sync.connect();
  sync.subscribe('raid:state', onRaidState);
  sync.subscribe('klas:update', () => refresh());
  store.onChange(() => refresh());
  const qs = new URLSearchParams(location.search);
  const teacherOk = isTeacher();
  if (qs.get('preview') && teacherOk) return previewMission(qs.get('preview'), qs.get('route') || 'kompas');
  if (qs.get('leerkracht') && teacherOk) {
    S.preview = true;
    S.pupil = { id: 'leerkracht', naam: 'Leerkracht', leerkracht: true, xp: 0, routes: Object.fromEntries(MACHTEN.map(m => [m.id, 'kompas'])), look: { ...DEFAULT_LOOK, haar: 'pet', kleren: 6, uitrusting: { jas: 'regenjas', hoofd: 'zuidwester' } }, codes: [], kosmetiek: Object.keys(UITRUSTING) };
    return enterWorld();
  }
  const pid = sessionStorage.getItem('vagant-pid') || sessionStorage.getItem('klets-pid');
  if (pid) { const p = await store.getPupil(pid); if (p) { S.pupil = p; return enterWorld(); } }
  showLogin();
}
function isTeacher() { try { return Number(localStorage.getItem('klets:v1:leerkrachtTot') || 0) > Date.now(); } catch { return false; } }

async function refresh({ vlieg = false } = {}) {
  S.settings = await store.getSettings();
  const anders = zetThema(S.settings);
  S.pupils = await store.listPupils();
  if (S.pupil && !S.pupil.leerkracht) { const p = await store.getPupil(S.pupil.id); if (p) S.pupil = p; else { logout(); return; } }
  if (S.stad) await bouwStad({ vlieg });
  if (anders) toast(`De klas speelt nu: ${THEMA.naam} in ${stadNaam()}.`);
}

// ---------- aanmelden ----------
async function showLogin() {
  S.pupils = await store.listPupils();
  document.body.classList.add('in-aanmelden');
  const app = $('#app'); app.innerHTML = '';
  warmOp(['atlas', 'woordje', 'tella', 'kroniek', 'bram', 'byte']);
  const kaarten = S.pupils.map(p => h('button', { class: 'reiziger-kaart', type: 'button', onclick: () => login(p) }, avatarBeeld(p.look, { px: 84, vorm: 'vol' }), h('span', {}, p.naam)));
  app.append(h('main', { class: 'login' },
    h('div', { class: 'login-kop' }, h('h1', { class: 'logo' }, METHODE), h('p', {}, `Thema ${THEMA.nr}: ${THEMA.naam} - de stad ${THEMA.stad}`)),
    h('section', { class: 'kaart-blok' },
      h('h2', {}, 'Wie trekt er mee op expeditie?'),
      kaarten.length ? h('div', { class: 'reizigers' }, ...kaarten) : h('p', { class: 'tip' }, 'Nog geen reizigers op dit toestel. Maak je eigen reiziger.'),
      h('button', { class: 'btn groot primair', type: 'button', onclick: showCreator }, 'Ik ben een nieuwe reiziger')),
    h('p', { class: 'login-voet' }, h('a', { href: 'leerkracht.html' }, 'Leerkracht'), ' - ', h('a', { href: 'digibord.html' }, 'Digibord'))));
}
async function login(p) { sessionStorage.setItem('vagant-pid', p.id); S.pupil = p; enterWorld(); }
function logout() { sessionStorage.removeItem('vagant-pid'); sessionStorage.removeItem('klets-pid'); location.href = location.pathname; }

/** Portret van een reiziger (3D-figuur, als beeld). */
function avatarPortret(look, px = 48, vorm = 'portret') { return avatarBeeld(look || DEFAULT_LOOK, { px, vorm }); }

// ---------- de avatarmaker ----------
const KLEURKEUZES = new Set(['huid', 'haarKleur', 'kleren', 'broek', 'schoenKleur']);
/**
 * De avatarmaker: tabbladen (gezicht, haar, kleren, extra), een levend voorbeeld dat ronddraait en
 * een knop "Verras me". Ook bruikbaar om een bestaande reiziger aan te passen (pupil meegeven).
 */
function showCreator({ pupil = null, onKlaar = null } = {}) {
  const look = pupil ? { ...DEFAULT_LOOK, ...pupil.look, uitrusting: { ...(pupil.look?.uitrusting || {}) } }
    : { ...willekeurigeLook(), uitrusting: {} };
  document.body.classList.add('in-aanmelden');
  const app = $('#app'); app.innerHTML = '';
  const prev = h('div', { class: 'creator-prev' });
  const vb = maakVoorbeeld(prev, look, { px: 220 });
  const paint = () => vb.zet({ ...look });
  const naam = h('input', { type: 'text', class: 'invoer', maxlength: 16, autocomplete: 'off', placeholder: 'Voornaam of bijnaam', 'aria-label': 'Voornaam of bijnaam', id: 'naam', value: pupil?.naam || '' });
  const fout = h('p', { class: 'fout', 'aria-live': 'polite' });
  const vakken = h('div', { class: 'creator-vakken' });
  let tab = CREATOR_TABS[0].id;

  const sw = (c) => h('span', { class: 'kleur', style: { background: c } });
  const tabsEl = h('div', { class: 'creator-tabs', role: 'tablist' }, ...CREATOR_TABS.map(t =>
    h('button', { type: 'button', role: 'tab', class: 'tab' + (t.id === tab ? ' sel' : ''), 'aria-selected': String(t.id === tab), onclick: () => { tab = t.id; tekenTabs(); tekenVakken(); } }, t.naam)));
  function tekenTabs() {
    [...tabsEl.children].forEach((b, i) => { const sel = CREATOR_TABS[i].id === tab; b.classList.toggle('sel', sel); b.setAttribute('aria-selected', String(sel)); });
  }
  function tekenVakken() {
    vakken.innerHTML = '';
    const t = CREATOR_TABS.find(x => x.id === tab);
    for (const key of t.keuzes) vakken.append(keuzeRij(key));
  }
  function keuzeRij(key) {
    const kleurRij = KLEURKEUZES.has(key);
    const stofHaar = key === 'haarKleur' && STOFHAAR.has(look.haar);
    const opties = stofHaar ? STOF_KLEUREN : AVATAR_OPTIES[key] || [];
    const stalen = h('div', { class: 'stalen' });
    const label = stofHaar ? 'Kleur van je stof' : (KEUZE_NAAM[key] || key);
    opties.forEach((o, i) => {
      const val = kleurRij ? i : o;
      const gekozen = kleurRij ? (look[key] ?? 0) % opties.length === i : look[key] === o;
      const naamOptie = key === 'haar' ? (HAAR_NAAM[o] || o) : (typeof o === 'string' ? o : `${label} ${i + 1}`);
      const b = h('button', {
        type: 'button', class: 'staal' + (kleurRij ? '' : ' tekst') + (gekozen ? ' sel' : ''),
        'aria-label': `${label}: ${naamOptie}`, 'aria-pressed': String(gekozen),
        onclick: () => { look[key] = val; paint(); tekenVakken(); },
      }, kleurRij ? sw(o) : (key === 'haar' ? h('span', { class: 'staal-beeld' }, avatarBeeld({ ...look, haar: o, uitrusting: {} }, { px: 42 }), h('small', {}, HAAR_NAAM[o] || o)) : naamOptie));
      stalen.append(b);
    });
    return h('div', { class: 'keuze-rij' }, h('span', { class: 'rij-lbl' }, label), stalen);
  }

  app.append(h('main', { class: 'creator' },
    h('h1', { class: 'logo klein' }, METHODE),
    h('div', { class: 'creator-grid' },
      h('div', { class: 'creator-links' }, prev,
        h('div', { class: 'knoppen' },
          h('button', { type: 'button', class: 'btn klein', onclick: () => vb.draai(Math.PI / 2) }, 'Draai'),
          h('button', { type: 'button', class: 'btn klein primair', id: 'verras', onclick: () => { Object.assign(look, willekeurigeLook(), { uitrusting: look.uitrusting }); paint(); tekenVakken(); } }, 'Verras me')),
        h('p', { class: 'tip' }, 'Sleep om je reiziger rond te draaien. Hij draait ook zelf.')),
      h('div', { class: 'creator-rechts' },
        h('label', { class: 'lbl', for: 'naam' }, `Hoe heet je in ${THEMA.stad}?`), naam,
        h('p', { class: 'tip' }, 'Gebruik je voornaam of een bijnaam. Geen achternaam.'),
        tabsEl, vakken, fout,
        h('div', { class: 'knoppen' },
          h('button', { type: 'button', class: 'btn', onclick: () => (pupil ? enterWorld() : showLogin()) }, 'Terug'),
          h('button', { type: 'button', class: 'btn groot primair', id: 'start-reis', onclick: bewaar }, pupil ? 'Bewaar' : 'Begin de expeditie'))))));
  tekenVakken(); paint(); naam.focus();

  async function bewaar() {
    const n = naam.value.trim().replace(/\s+/g, ' ');
    if (n.length < 2) { fout.textContent = 'Typ een naam van minstens 2 letters.'; return; }
    if (/@|\d{3,}/.test(n)) { fout.textContent = 'Gebruik enkel een voornaam of bijnaam.'; return; }
    const all = await store.listPupils();
    const bestaat = all.find(p => p.naam.toLowerCase() === n.toLowerCase() && p.id !== pupil?.id);
    if (bestaat) { fout.textContent = `${bestaat.naam} bestaat al. Ga terug en klik op je kaartje.`; return; }
    if (pupil) {
      const fresh = (await store.getPupil(pupil.id)) || pupil;
      fresh.naam = n; fresh.look = look;
      await store.savePupil(fresh); S.pupil = fresh;
      sync.publish('klas:update', {});
      onKlaar?.(); return enterWorld();
    }
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
const WEER_ICO = { regen: 'regen', motregen: 'regen', buien: 'regen', sneeuw: 'sneeuw', mist: 'mist', storm: 'storm', zon: 'zon', bewolkt: 'wolk', grijs: 'wolk' };

async function enterWorld() {
  S.pupils = await store.listPupils();
  document.body.classList.remove('in-aanmelden');
  const app = $('#app'); app.innerHTML = '';
  document.body.classList.add('in-stad');
  const view = h('div', { class: 'stad-view', id: 'stad' });
  const top = h('header', { class: 'stad-top' });
  const adviseurs = h('aside', { class: 'adviseurs', 'aria-label': 'Gidsen' });
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
    onBouw: () => blip('code'),
  });
  if (S.stad.is2D) view.classList.add('is-2d');
  S.stad.setTijd(S.tijd || tijdUitInstelling());
  // vaste markers: de gidsen en het stadsplein
  for (const id of GIDS_VOLGORDE) {
    const g = GIDSEN[id], w = MACHT[g.macht];
    const el = h('button', { type: 'button', class: 'marker hq', style: { '--k': w.kleur }, 'aria-label': `${g.naam}: ${g.plek}`, onclick: () => kiesInStad('gids:' + id) },
      h('span', { class: 'marker-rond' }, gidsPortret(id, 2)), h('span', { class: 'marker-naam' }, g.plek), h('span', { class: 'marker-badge', hidden: true, 'data-gids': id }));
    S.stad.zetMarker('hq:' + id, el, 'gids:' + id);
  }
  S.stad.zetMarker('station', h('button', { type: 'button', class: 'marker label', id: 'marker-stad', onclick: () => kiesInStad('station') }, stadNaam()), LABELS.station);
  S.stad.zetMarker('poort', h('button', { type: 'button', class: 'marker label poort', onclick: () => kiesInStad('poort') }, 'De Poort'), LABELS.poort);
  S.stad.zetMarker('kluis', h('button', { type: 'button', class: 'marker label klein', onclick: () => kiesInStad('kluis') }, 'Codekluis'), LABELS.kluis);
  S.stad.zetMarker('missiebord', h('button', { type: 'button', class: 'marker label klein', onclick: () => kiesInStad('missiebord') }, 'Missiebord'), LABELS.missiebord);
  await bouwStad({ eerste: true });
  startWeer();
  view.querySelector('canvas')?.focus();
  if (!S.pupil.leerkracht && !(S.pupil.gezien || []).includes('intro-' + THEMA.id)) showIntro();
  else setTimeout(() => adviseurPraat(), 2500);
  clearInterval(S.praatIv); S.praatIv = setInterval(() => { if (!document.querySelector('.overlay')) adviseurPraat(); }, 45000);
  sync.publish('raid:vraag', {});
}
function tijdUitInstelling() { const dn = S.settings.dagNacht; return dn === 'dag' ? 'dag' : dn === 'nacht' ? 'nacht' : 'cyclus'; }

/** Het echte weer van Brugge volgen: de stad en de weerwijzer in de balk. */
function startWeer() {
  S.stopWeer?.();
  S.stopWeer = volgWeer((w) => { S.weer = w; S.stad?.setWeer(w); updateWeerWijzer(); });
}
function updateWeerWijzer() {
  const el = $('#weer-wijzer'); if (!el || !S.weer) return;
  const w = S.weer;
  el.innerHTML = '';
  el.append(icoon(w.dag ? (WEER_ICO[w.soort] || 'wolk') : 'maan', 'ico weer-ico'),
    h('span', { class: 'weer-tekst' }, h('b', {}, `${Math.round(w.temp)} graden`), h('small', {}, `${w.tekst} - ${w.seizoen}`)));
  el.title = `Het echte weer in Brugge: ${weerTekst(w)}`;
}

/** Lees alle gegevens en toon ze in de stad. */
async function bouwStad({ eerste = false, vlieg = false } = {}) {
  if (!S.stad) return;
  const attempts = await store.listAttempts();
  const events = await store.listEvents();
  S.model = stadModel({ pupils: S.pupils, attempts, events, settings: S.settings, thema: THEMA, doelen: THEMA.doelen, meId: S.pupil.leerkracht ? null : S.pupil.id, goalMissies: GOAL_MISSIES });
  const sleutel = 'vagant:stad:gezien:' + THEMA.id + ':' + S.pupil.id;
  if (eerste) { try { const oud = JSON.parse(localStorage.getItem(sleutel) || 'null'); if (oud) S.stad.bekend = new Map(Object.entries(oud)); } catch { /* niets */ } }
  const nieuw = S.stad.update(S.model, { animeer: true, vlieg });
  try { localStorage.setItem(sleutel, JSON.stringify(Object.fromEntries(S.model.gebouwen.filter(g => g.gebouwd).map(g => [g.id, g.niveau])))); } catch { /* vol */ }
  // markers voor de themagebouwen die je kan binnengaan
  for (const g of S.model.themaGebouwen || []) {
    if (S.stad.markers.has('plek:' + g.gebouwId)) continue;
    const el = h('button', { type: 'button', class: 'marker labo', 'aria-label': `${g.naam}: naar binnen`, onclick: () => kiesInStad(g.id) },
      h('span', { class: 'marker-rond' }, icoon('labo')), h('span', { class: 'marker-naam' }, g.kort || g.naam));
    S.stad.zetMarker('plek:' + g.gebouwId, el, g.id);
  }
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
    h('div', { class: 'top-stad', title: 'De klasmeter: alle XP van de klas samen' },
      h('div', { class: 'top-stadnaam' }, h('b', { id: 'hud-stadnaam' }, stadNaam()), h('small', { id: 'hud-thema' }, THEMA.naam)),
      h('div', { class: 'top-cijfers' },
        h('span', { class: 'cijfer' }, h('b', { id: 'hud-bevolking' }, '0'), h('small', {}, 'reizigers')),
        h('span', { class: 'cijfer' }, h('b', { id: 'hud-gebouwen' }, '0'), h('small', {}, 'gebouwen')),
        h('span', { class: 'cijfer' }, h('b', { id: 'hud-week' }, '1'), h('small', {}, 'week')),
        h('span', { class: 'cijfer water' }, h('b', { id: 'hud-water' }, '0 %'), h('small', {}, 'proper water'))),
      h('div', { class: 'balkje klas', 'aria-label': 'Klasmeter' }, h('span', { id: 'hud-klas' }))),
    h('div', { class: 'top-rechts' },
      h('button', { class: 'weer-wijzer', type: 'button', id: 'weer-wijzer', 'aria-label': 'Het weer in Brugge', onclick: openWeer }, icoon('wolk', 'ico weer-ico')),
      h('button', { class: 'rond klein', type: 'button', id: 'btn-tijd', title: 'Dag en nacht', 'aria-label': 'Dag en nacht', onclick: wisselTijd }, icoon('cyclus')),
      h('button', { class: 'rond klein', type: 'button', id: 'btn-kwaliteit', title: 'Grafische kwaliteit', 'aria-label': 'Grafische kwaliteit', onclick: wisselKwaliteit }, icoon('kwaliteit')),
      h('button', { class: 'rond klein zacht', type: 'button', title: S.pupil.leerkracht ? 'Stop' : 'Afmelden', 'aria-label': S.pupil.leerkracht ? 'Stop' : 'Afmelden', onclick: logout }, icoon('uit'))));
}
function bouwAdviseurs(el) {
  for (const id of GIDS_VOLGORDE) {
    const g = GIDSEN[id], w = MACHT[g.macht];
    el.append(h('button', { type: 'button', class: 'adviseur', id: 'adv-' + id, style: { '--k': w.kleur }, title: `${g.naam}: ${g.rol}`, 'aria-label': `Gids ${g.naam}`, onclick: () => kiesInStad('gids:' + id) },
      gidsPortret(id, 3), h('span', { class: 'adv-badge', hidden: true })));
  }
}
function bouwWerkbalk(balk) {
  const knop = (id, ico, label, fn) => h('button', { type: 'button', class: 'balk-knop', id, onclick: fn }, h('span', { class: 'rond' }, icoon(ico)), h('span', { class: 'balk-lbl' }, label));
  balk.append(
    knop('btn-missies', 'missies', 'Missiebord', () => openMissiebord()),
    knop('btn-labos', 'labo', 'Labo\'s', () => openLaboLijst()),
    knop('btn-adviseurs', 'adviseurs', 'Gidsen', () => openGidsenLijst()),
    knop('btn-lagen', 'lagen', 'Kaartlagen', () => wisselLaag()),
    knop('btn-huis', 'huis', 'Mijn huis', () => openHuis()),
    knop('btn-kluis', 'kluis', 'Codekluis', () => openKluis()),
    knop('btn-stad', 'stad', 'Klasstad', () => openKlasstad()),
    knop('btn-water', 'water', 'Proper water', () => openWater()),
    knop('btn-trein', 'trein', 'Weekverhaal', () => openVerhaal()));
}
function bouwCamKnoppen(el) {
  const k = (ico, label, fn) => h('button', { type: 'button', class: 'rond klein', title: label, 'aria-label': label, onclick: fn }, icoon(ico));
  el.append(k('links', 'Draai links', () => S.stad.draai(-1)), k('rechts', 'Draai rechts', () => S.stad.draai(1)),
    k('plus', 'Inzoomen', () => S.stad.zoom(-1)), k('min', 'Uitzoomen', () => S.stad.zoom(1)), k('thuis', 'Terug naar de Markt', () => S.stad.thuis()));
}

function updateHud() {
  const p = S.pupil, rang = rangVoor(p.xp || 0);
  const av = $('#hud-avatar'); if (!av) return;
  av.innerHTML = ''; av.append(avatarPortret(p.look, 46));
  $('#hud-naam').textContent = p.naam;
  $('#hud-rang').textContent = `${rang.naam} - ${p.xp || 0} XP`;
  $('#hud-xp').style.width = Math.round(rang.pct * 100) + '%';
  const m = S.model;
  if (m) {
    $('#hud-bevolking').textContent = String(m.bevolking);
    $('#hud-gebouwen').textContent = String(m.aantalGebouwd);
    $('#hud-week').textContent = String(S.settings.huidigeWeek);
    $('#hud-water').textContent = Math.round((m.water?.helder || 0) * 100) + ' %';
    $('#hud-klas').style.width = Math.round(clamp(m.xp / Math.max(1, m.doelXp), 0, 1) * 100) + '%';
  }
  $('#hud-stadnaam').textContent = stadNaam();
  $('#hud-thema').textContent = THEMA.naam;
  const sm = $('#marker-stad'); if (sm) sm.textContent = stadNaam();
  updateKwaliteitKnop(); updateTijdKnop(); updateWeerWijzer();
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

/** Iets in de stad werd aangeklikt (of gekozen via een marker of gids). */
function kiesInStad(id) {
  if (!id) { sluitInfo(); return; }
  S.stad.selecteer(id);
  if (id === 'kluis') { sluitInfo(); return openKluis(); }
  if (id === 'missiebord') { sluitInfo(); return openMissiebord(); }
  if (id === 'poort') { sluitInfo(); return openPoort(); }
  if (id === 'trein') { sluitInfo(); return openVerhaal(); }
  if (id === 'klasmeter' || String(id).startsWith('water:')) { sluitInfo(); return openWater(); }
  toonInfo(id);
}
function sluitInfo() { const k = $('#info-kaart'); if (k) { k.hidden = true; k.innerHTML = ''; } S.stad?.selecteer(null); }

async function toonInfo(id) {
  const k = $('#info-kaart'); k.innerHTML = ''; k.hidden = false;
  const kop = (titel, sub, kleur, beeld) => h('header', { class: 'ik-kop', style: { '--k': kleur || '#4c8fd6' } }, beeld || null, h('div', {}, h('small', {}, sub), h('h2', {}, titel)),
    h('button', { type: 'button', class: 'rond klein zacht', 'aria-label': 'Sluiten', onclick: sluitInfo }, icoon('sluit')));
  if (id.startsWith('plek:')) {
    const g = (S.model.themaGebouwen || []).find(x => x.id === id);
    if (!g) return sluitInfo();
    const open = S.settings.allesOpen || S.pupil.leerkracht || g.week <= S.settings.huidigeWeek;
    const labos = g.labos.map(l => ({ id: l, ...THEMA.labos[l], stand: S.model.water?.labos?.[l] }));
    add(k, kop(g.naam, `Week ${g.week} - ${GIDSEN[g.gids]?.naam || 'gids'}`, THEMA.kleur, gidsPortret(g.gids, 3)),
      h('p', {}, g.uitleg),
      h('ul', { class: 'ik-missies' }, ...labos.map(l => h('li', {}, h('div', { class: 'ikm-tekst' }, h('b', {}, l.naam),
        h('small', {}, l.stand?.klaar ? 'De klas haalde dit labo' : `${l.stand?.aantal || 0} van de ${l.stand?.drempel || 1} reizigers geslaagd`))))),
      !open ? h('p', { class: 'tip' }, `Dit gebouw hoort bij week ${g.week}. Je mag al eens binnen gaan kijken.`) : null,
      h('div', { class: 'ik-knoppen' },
        h('button', { type: 'button', class: 'btn primair', id: 'ga-binnen', onclick: () => openGebouw(g.gebouwId) }, open ? 'Ga naar binnen' : 'Toch eens binnen kijken'),
        h('button', { type: 'button', class: 'btn', onclick: () => S.stad.focus(id, 20) }, 'Zoom in')));
    return;
  }
  if (id.startsWith('gids:')) {
    const gid = id.slice(5), g = GIDSEN[gid], w = MACHT[g.macht];
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
    const w = WIJK[g.macht], kleur = MACHT[g.macht]?.kleur;
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
    add(k, kop(hu.ik ? 'Jouw huis' : `Huis van ${hu.naam}`, 'Reizigerswijk', '#e9a23b', avatarPortret(hu.look, 48)),
      h('p', {}, deco.length ? 'Versierd met: ' + deco.map(d => HUISDECOR[d]).filter(Boolean).join(', ') + '.' : (hu.ik ? 'Je huis is nog niet versierd. Codes uit je Logboek geven versiering.' : 'Een gezellig huis in de Reizigerswijk.')),
      hu.ik ? h('div', { class: 'ik-knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => openHuis() }, 'Versier je huis'),
        h('button', { type: 'button', class: 'btn', onclick: () => showCreator({ pupil: S.pupil }) }, 'Pas je reiziger aan')) : null);
    return;
  }
  if (id === 'station') {
    const w = weekVan(S.settings.huidigeWeek);
    add(k, kop(stadNaam(), `${THEMA.naam} - ${THEMA.ondertitel || 'themastad'}`, THEMA.kleur),
      h('p', {}, `Dit is de Markt met het Belfort. Deze week: ${w.titel}.`),
      h('div', { class: 'ik-knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => openVerhaal() }, 'Het weekverhaal'), h('button', { type: 'button', class: 'btn', onclick: () => openMissiebord() }, 'Missiebord')));
    return;
  }
  sluitInfo();
}
async function compacteMissie(m) {
  const open = isOpen(m, S.settings, S.pupil);
  const att = S.pupil.leerkracht ? [] : (await store.listAttempts({ pid: S.pupil.id })).filter(a => a.missie === m.id && a.bron === 'missie');
  const best = att.reduce((b, a) => (!b || a.goed / Math.max(1, a.totaal) > b.goed / Math.max(1, b.totaal) ? a : b), null);
  return h('li', {}, h('div', { class: 'ikm-tekst' }, h('b', {}, m.naam), h('small', {}, best ? `Gedaan: ${best.goed}/${best.totaal}` : `${cap(m.dag || 'deze week')} - nieuw`)),
    open ? h('button', { type: 'button', class: 'btn primair klein missie-start', 'data-missie': m.id, onclick: () => startMissie(m) }, best ? 'Opnieuw' : 'Start') : h('small', { class: 'later-uitleg' }, `Week ${m.week}`));
}

/** Een gids zegt iets in een ballon. Zonder argumenten: een gids met nieuwe missies. */
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
  el.innerHTML = ''; el.hidden = false; el.style.setProperty('--k', MACHT[g.macht].kleur);
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
  const w = weekVan(S.settings.huidigeWeek);
  const pan = panel(`Welkom in ${THEMA.stad}`, 'trein');
  add(pan.body,
    h('div', { class: 'gids-zegt groot' }, gidsPortret(THEMA.gids || 'atlas', 4), h('p', {}, THEMA.verhaal?.intro || '')),
    h('ul', { class: 'uitleg-lijst' },
      h('li', {}, 'Sleep om de stad te verschuiven. Scroll of knijp om te zoomen. Draai met de rechtermuisknop of de pijlknoppen rechtsonder.'),
      h('li', {}, 'Klik op een gebouw met een labo-teken: je gaat naar binnen en doet er proeven, filmpjes en de check.'),
      h('li', {}, 'De zes gidsen (links) geven je de missies van de week.'),
      h('li', {}, 'Het weer en het seizoen in de stad zijn het echte weer van Brugge.'),
      h('li', {}, 'Je hebt je eigen huis in de Reizigerswijk. Versier het met codes uit je Logboek.')),
    h('p', { class: 'tip' }, `Deze week: ${w.titel}.`));
  add(pan.foot, h('button', { class: 'btn groot primair', type: 'button', onclick: async () => { pan.close(); const p = await store.getPupil(S.pupil.id); if (p) { p.gezien = [...(p.gezien || []), 'intro-' + THEMA.id]; await store.savePupil(p); S.pupil = p; } setTimeout(() => adviseurPraat(), 800); } }, 'Aan de slag!'));
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
  return h('div', { class: 'week-tabs', role: 'tablist' }, ...THEMA.weken.map(w => {
    const open = S.settings.allesOpen || S.pupil.leerkracht || w.week <= S.settings.huidigeWeek;
    return h('button', { type: 'button', role: 'tab', 'aria-selected': String(w.week === cur), class: 'tab' + (w.week === cur ? ' sel' : '') + (open ? '' : ' later'), onclick: () => onPick(w.week) }, `Week ${w.week}`);
  }));
}

const KIND_NAAM = { oefening: 'Oefenmissie', check: 'Stadsmissie (check)', labo: 'Labo', eindbaas: 'Eindbaas' };
async function missieRij(m, { metGids = false } = {}) {
  const pupil = S.pupil;
  const open = isOpen(m, S.settings, pupil);
  const attempts = pupil.leerkracht ? [] : (await store.listAttempts({ pid: pupil.id })).filter(a => a.missie === m.id && a.bron === 'missie');
  const best = attempts.reduce((b, a) => (!b || a.goed / Math.max(1, a.totaal) > b.goed / Math.max(1, b.totaal) ? a : b), null);
  const route = routeVoor(pupil, m.macht);
  const status = best ? h('span', { class: 'status gedaan' }, `Gedaan: ${best.goed}/${best.totaal}`) : h('span', { class: 'status nieuw' }, 'Nieuw');
  const knop = open
    ? h('button', { class: 'btn primair', type: 'button', onclick: () => startMissie(m) }, m.kind === 'labo' ? 'Ga naar binnen' : best ? 'Opnieuw' : 'Start')
    : h('button', { class: 'btn zacht', type: 'button', onclick: () => toast(`Deze missie hoort bij week ${m.week}. Je leerkracht kan alles openzetten.`) }, `Week ${m.week}`);
  const routeKeuze = pupil.leerkracht && m.sets ? h('select', { class: 'route-select', 'aria-label': 'Route', onchange: (e) => { pupil.routes[m.macht] = e.target.value; } }, ...ROUTES.map(r => h('option', { value: r.id, selected: r.id === route }, r.naam))) : null;
  return h('li', { class: 'missie-rij' + (open ? '' : ' later') },
    metGids ? gidsPortret(m.gids, 2) : null,
    h('div', { class: 'mr-tekst' }, h('b', {}, m.naam), h('small', {}, `${cap(m.dag || 'deze week')} - ${KIND_NAAM[m.kind] || 'missie'}`)),
    h('span', { class: 'macht-chip', style: { '--k': MACHT[m.macht]?.kleur } }, MACHT[m.macht]?.kort || m.macht),
    routeKeuze || (m.sets ? h('span', { class: 'route-badge r-' + kiesSet(m, route).route }, ROUTE[kiesSet(m, route).route]?.naam) : null),
    status, knop);
}
const cap = s => String(s).charAt(0).toUpperCase() + String(s).slice(1);

async function openGids(gid) {
  const g = GIDSEN[gid];
  const pan = panel(`${g.naam} de ${g.dier}`, 'gids');
  let week = S.settings.huidigeWeek;
  async function draw() {
    pan.body.innerHTML = '';
    const lijst = CATALOG.filter(m => m.gids === gid && m.week === week);
    const groet = lijst.length ? GROET[gid] : 'Deze week heb ik geen digitale missie voor jou. Kijk op het Missiebord.';
    add(pan.body, h('div', { class: 'gids-zegt groot' }, gidsPortret(gid, 4), h('div', {}, h('p', {}, groet), h('small', {}, `${g.rol} - ${g.uitrusting}`), h('button', { class: 'btn klein', type: 'button', onclick: () => speak(groet) }, 'Lees voor'))),
      weekTabs(week, (w) => { week = w; draw(); }),
      h('p', { class: 'week-titel' }, `Week ${week}: ${weekVan(week).titel}`));
    const ul = h('ul', { class: 'missie-lijst' });
    for (const m of lijst) ul.append(await missieRij(m));
    if (!lijst.length) ul.append(h('li', { class: 'leeg' }, 'Geen missies bij deze gids in deze week.'));
    add(pan.body, ul);
  }
  draw();
}
const GROET = {
  tella: 'Hallo reiziger! Ik ben Tella. In mijn labo onderzoeken we alles wat we niet snappen. Kies een missie.',
  woordje: 'Ahoi! Ik ben Woordje, verkenner en verteller. Eerst voorspellen, dan testen!',
  atlas: 'Ik ben Atlas, kaartenmaker en duiker. Elke missie tekent een stukje kaart terug.',
  kroniek: 'Oehoe. Ik ben Kroniek. Ik bewaar wat vroeger gebeurde. Kijk met mij terug in de tijd.',
  bram: 'Welkom bij mijn kampvuur. Ik ben Bram. Hier mag je zeggen hoe je je voelt. Je moet niet.',
  byte: 'Biep! Ik ben Byte. Ik bouw machines en schrijf programma\'s. Help je mee?',
};

function openGidsenLijst() {
  const pan = panel('De gidsen van ' + stadNaam());
  const ul = h('ul', { class: 'gidsen-lijst' });
  for (const [id, g] of Object.entries(GIDSEN)) {
    ul.append(h('li', {}, gidsPortret(id, 3), h('div', {}, h('b', {}, `${g.naam} de ${g.dier}`), h('small', {}, `${g.rol} - ${MACHT[g.macht]?.naam}`), h('small', {}, g.uitrusting)),
      h('button', { class: 'btn', type: 'button', onclick: () => { pan.close(); S.stad.focus('gids:' + id, 26); kiesInStad('gids:' + id); } }, 'Toon in de stad'),
      h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openGids(id); } }, 'Open')));
  }
  add(pan.body, h('p', { class: 'tip' }, 'Elke gids hoort bij een domein van wereldoriëntatie en heeft een eigen wijk in de stad.'), ul);
}

async function openMissiebord() {
  const pan = panel('Missiebord', 'bord', { breed: true });
  let week = S.settings.huidigeWeek;
  async function draw() {
    pan.body.innerHTML = '';
    const w = weekVan(week);
    add(pan.body, weekTabs(week, (x) => { week = x; draw(); }), h('p', { class: 'week-titel' }, `Week ${week}: ${w.titel}`));
    if (!(S.settings.allesOpen || S.pupil.leerkracht || week <= S.settings.huidigeWeek)) add(pan.body, h('p', { class: 'info-blok' }, 'Deze week komt later. Je kan alvast kijken wat er aankomt; je leerkracht kan alles openzetten in het dashboard.'));
    const lijst = CATALOG.filter(m => m.week === week);
    for (const dag of [...DAGEN, null]) {
      const deel = lijst.filter(m => (m.dag || null) === dag);
      if (!deel.length) continue;
      const ul = h('ul', { class: 'missie-lijst' });
      for (const m of deel) ul.append(await missieRij(m, { metGids: true }));
      add(pan.body, h('h3', { class: 'dag' }, dag ? cap(dag) : 'Wanneer je wil'), ul);
    }
    if (!lijst.length) add(pan.body, h('p', { class: 'tip' }, 'Voor deze week staat er nog niets digitaal klaar.'));
  }
  draw();
}

/** Alle labo's van het thema: in welk gebouw, en hoe ver de klas staat. */
async function openLaboLijst() {
  const pan = panel('De labo\'s van ' + THEMA.naam, 'bord', { breed: true });
  const stand = S.model?.water;
  add(pan.body, h('p', {}, 'In elk themagebouw kan je binnen. Daar zie je een filmpje, doe je een proefopstelling en maak je de check. Haalt de helft van de klas de check, dan wordt een stuk van de stad weer proper.'));
  const ul = h('ul', { class: 'missie-lijst labos' });
  for (const g of S.model?.themaGebouwen || []) {
    for (const lid of g.labos) {
      const l = THEMA.labos[lid], st = stand?.labos?.[lid];
      ul.append(h('li', { class: 'missie-rij' }, gidsPortret(l.gids || g.gids, 2),
        h('div', { class: 'mr-tekst' }, h('b', {}, l.naam), h('small', {}, `${g.naam} - week ${l.week}`)),
        h('span', { class: 'macht-chip', style: { '--k': MACHT[l.domein]?.kleur } }, MACHT[l.domein]?.kort || l.domein),
        h('div', { class: 'labo-meter' }, h('div', { class: 'balkje' }, h('span', { style: { width: Math.round((st?.deel || 0) * 100) + '%' } })), h('small', {}, st?.klaar ? 'Klaar: ' + (l.herstel?.tekst || '') : `${st?.aantal || 0}/${st?.drempel || 1} geslaagd`)),
        h('button', { type: 'button', class: 'btn primair', onclick: () => { pan.close(); openGebouw(g.gebouwId); } }, 'Ga naar binnen')));
    }
  }
  add(pan.body, ul);
  const eb = THEMA.eindbaas;
  if (eb) add(pan.body, h('h3', {}, 'Eindbaas'), h('p', {}, eb.verhaal),
    h('div', { class: 'knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => { pan.close(); startMissie(CATALOG.find(m => m.id === 'eindbaas:' + eb.id)); } }, 'Doe het eindproefwerk')));
}

/** Een themagebouw binnengaan: het labo-scherm. */
async function openGebouw(gebouwId, laboId = null) {
  const def = THEMA.gebouwen?.[gebouwId];
  if (!def) { toast('Dit gebouw bestaat niet in dit thema.'); return; }
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  sluitInfo();
  S.stad?.pause(true);
  await openLabo({
    gebouw: { id: gebouwId, ...def }, laboId, thema: THEMA, pupil: S.pupil, store,
    routeWens: routeVoor(S.pupil, THEMA.labos?.[laboId || def.labos?.[0]]?.domein),
    onVoortgang: () => { if (!S.pupil.leerkracht) sync.publish('klas:update', {}); refresh(); },
    onKlaar: async () => { S.stad?.pause(false); await refresh({ vlieg: true }); $('#stad canvas')?.focus(); },
  });
}

async function startMissie(m) {
  if (!m) return;
  if (m.kind === 'labo') { const lab = THEMA.labos[m.labo]; return openGebouw(lab?.gebouw || m.gebouw, m.labo); }
  document.querySelectorAll('.overlay').forEach(o => o.remove());
  S.stad?.pause(true);
  if (m.kind === 'eindbaas' && S.raid && (S.raid.status === 'actief' || S.raid.status === 'lobby')) return openRaid();
  const routeWens = routeVoor(S.pupil, m.macht);
  await runMission({ missie: m, pupil: S.pupil, routeWens, store, mode: S.pupil.leerkracht ? 'voorbeeld' : 'missie', doelen: THEMA.doelen });
  if (!S.pupil.leerkracht) sync.publish('klas:update', {});
  sluitInfo();
  S.stad?.pause(false);
  await refresh({ vlieg: true });
  $('#stad canvas')?.focus();
}

async function previewMission(id, route) {
  const m = CATALOG.find(x => x.id === id);
  const app = $('#app'); app.innerHTML = '';
  app.append(h('main', { class: 'login' }, h('h1', { class: 'logo' }, METHODE), h('p', {}, 'Voorbeeldmodus voor de leerkracht. Er wordt niets bewaard.'),
    h('a', { class: 'btn', href: 'leerkracht.html' }, 'Terug naar het dashboard')));
  if (!m) return toast('Missie niet gevonden.');
  if (m.kind === 'labo') { toast('Een labo bekijk je in de stad: open de leerlingenapp als leerkracht.'); return; }
  await runMission({ missie: m, pupil: { id: 'voorbeeld', naam: 'Leerkracht', routes: {} }, routeWens: route, mode: 'voorbeeld', doelen: THEMA.doelen });
}

// ---------- het weer en het water ----------
async function openWeer() {
  const pan = panel('Het weer in Brugge', 'weer');
  const w = S.weer || await huidigWeer();
  const bron = w.bron === 'open-meteo' ? 'echte meting (Open-Meteo)' : w.bron === 'cache' ? 'echte meting van even geleden' : w.bron === 'test' ? 'testweer uit de URL' : 'rustig seizoensweer (geen verbinding)';
  add(pan.body,
    h('p', {}, `De stad ${stadNaam()} volgt het echte weer van Brugge. Regent het daar, dan regent het hier.`),
    h('table', { class: 'weertabel' }, h('tbody', {},
      rij('Nu', w.tekst || ''), rij('Temperatuur', `${Math.round(w.temp * 10) / 10} graden`),
      rij('Wind', `${Math.round(w.wind)} km/u uit ${windstreek(w.richting)}`),
      rij('Neerslag', `${w.neerslag ?? 0} mm`), rij('Bewolking', `${Math.round(w.wolken)} %`),
      rij('Seizoen', w.seizoen), rij('Bron', bron))),
    h('p', { class: 'tip' }, 'In december staat de kerstmarkt op de Markt. In de herfst worden de bladeren bruin, in de winter liggen de bomen kaal onder de sneeuw en in de lente bloeien ze.'));
  add(pan.foot, h('button', { class: 'btn', type: 'button', onclick: () => speak(weerTekst(w)) }, 'Lees voor'));
  function rij(a, b) { return h('tr', {}, h('th', {}, a), h('td', {}, b)); }
}

function openWater() {
  const st = S.model?.water;
  const pan = panel('Proper water in ' + stadNaam(), 'water');
  if (!st) { add(pan.body, h('p', {}, 'Nog geen gegevens.')); return; }
  add(pan.body, h('p', {}, waterTekst(st)),
    h('div', { class: 'balk klas groot' }, h('span', { style: { width: Math.round(st.helder * 100) + '%' } })),
    h('p', {}, `Elke zone wordt helder als ${st.drempel} reizigers de check van het bijhorende labo halen. Versla je samen de eindbaas, dan is heel ${stadNaam()} blauw.`),
    h('ul', { class: 'zone-lijst' }, ...Object.values(st.zones).map(z => h('li', { class: z.helder >= 1 ? 'ok' : '' },
      h('div', {}, h('b', {}, z.naam), h('small', {}, z.helder >= 1 ? z.tekst : `${z.aantal} van de ${z.drempel} reizigers geslaagd`)),
      h('div', { class: 'balkje' }, h('span', { style: { width: Math.round(z.helder * 100) + '%' } }))))));
  add(pan.foot, h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openLaboLijst(); } }, 'Naar de labo\'s'));
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
      if (!CODES[code]) { res.textContent = 'Die code ken ik niet. Kijk nog eens goed in je Expeditieboek.'; res.className = 'code-res mis'; blip('nee'); return; }
      if ((p.codes || []).includes(code)) { res.textContent = 'Die code had je al gevonden.'; res.className = 'code-res'; return; }
      const bel = beloningVoor(code, THEMA);
      if (!p.leerkracht) {
        const fresh = (await store.getPupil(p.id)) || p;
        fresh.codes = [...(fresh.codes || []), code];
        if (!(fresh.kosmetiek || []).includes(bel.id)) fresh.kosmetiek = [...(fresh.kosmetiek || []), bel.id];
        fresh.xp = (fresh.xp || 0) + XP.code;
        await store.savePupil(fresh); S.pupil = fresh;
        sync.publish('klas:update', {});
      } else { p.codes = [...(p.codes || []), code]; }
      blip('code');
      await refresh();
      draw(`De kluis klikt open! Je krijgt: ${bel.naam} (+${XP.code} XP).`);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') probeer(); });
    add(pan.body, h('p', {}, 'In je Expeditieboek staat elke week een geheime code. Codes geven extra uitrusting voor je reiziger en versiering voor je huis. Missies zijn altijd open, ook zonder code.'),
      h('div', { class: 'code-rij' }, inp, h('button', { class: 'btn primair', type: 'button', id: 'code-knop', onclick: probeer }, 'Open')), res);
    // overzicht per week
    const weekCodes = Object.values(CODES).sort((a, b) => a.week - b.week);
    const gevonden = weekCodes.filter(c => (p.codes || []).includes(c.code));
    add(pan.body, h('h3', {}, `${gevonden.length} van de ${weekCodes.length} codes gevonden`),
      h('ul', { class: 'code-lijst' }, ...weekCodes.map(c => {
        const ok = (p.codes || []).includes(c.code);
        return h('li', { class: ok ? 'ok' : '' }, h('span', { class: 'slotje' + (ok ? ' open' : ''), 'aria-hidden': 'true' }),
          ok ? h('b', {}, c.code) : h('span', {}, 'Nog te vinden'), h('small', {}, ` Week ${c.week}: ${c.geeft || c.waar || ''}`));
      })));
    // garderobe: kosmetiek en themakledij, per plek op het lichaam
    const mine = p.leerkracht ? Object.keys(UITRUSTING) : (p.kosmetiek || []).filter(id => UITRUSTING[id]);
    const prevBox = h('div', { class: 'garderobe-prev' });
    maakVoorbeeld(prevBox, p.look, { px: 150 });
    const slots = {};
    for (const id of mine) { const k = UITRUSTING[id]; if (k) (slots[k.slot] = slots[k.slot] || []).push(id); }
    const SLOTNAMEN = { hoofd: 'Hoofd', nek: 'Nek', gezicht: 'Gezicht', rug: 'Rug', hand: 'Hand', jas: 'Jas', voeten: 'Voeten', spoor: 'Spoor', kleur: 'Kleur van je jas' };
    const gar = h('div', { class: 'garderobe' }, prevBox, h('div', { class: 'gar-slots' }, ...Object.entries(slots).map(([slot, ids]) => h('div', { class: 'keuze-rij' }, h('span', { class: 'rij-lbl' }, SLOTNAMEN[slot] || slot),
      h('div', { class: 'stalen' }, h('button', { type: 'button', class: 'staal tekst' + (!p.look.uitrusting?.[slot] ? ' sel' : ''), onclick: () => equip(slot, null) }, 'Geen'),
        ...ids.map(id => h('button', { type: 'button', class: 'staal tekst' + (p.look.uitrusting?.[slot] === id ? ' sel' : ''), title: UITRUSTING[id].uitleg || '', onclick: () => equip(slot, id) }, UITRUSTING[id].naam)))))));
    add(pan.body, h('h3', {}, 'Garderobe'), mine.length ? gar : h('p', { class: 'tip' }, 'Nog leeg. Haal een labo of vind een geheime code: dan krijg je uitrusting.'));
    if (mine.length && !p.leerkracht) add(pan.body, h('p', { class: 'tip' }, 'Je kan je huis ook versieren. ', h('button', { type: 'button', class: 'btn klein', onclick: () => { pan.close(); openHuis(); } }, 'Versier je huis')));
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
  const pan = panel('De Klasstad ' + stadNaam(), 'klasstad', { breed: true });
  const m = S.model;
  add(pan.body,
    h('div', { class: 'klasmeter-groot' }, h('b', {}, `Klasmeter: ${fmtGetal(m.xp)} XP`), h('div', { class: 'balk klas groot' }, h('span', { style: { width: Math.round(clamp(m.xp / Math.max(1, m.doelXp), 0, 1) * 100) + '%' } })),
      h('small', {}, `Doel: ${fmtGetal(m.doelXp)} XP. ${waterTekst(m.water)}.`)),
    h('p', {}, 'Elk doel dat iemand in de klas behaalt, wordt een gebouw in de wijk van dat domein. Hoe meer reizigers het doel halen, hoe groter het gebouw. Een bouwplaats betekent: er wordt geoefend, het gebouw komt eraan.'),
    h('div', { class: 'wijk-tegels' }, ...m.wijken.map(w => h('button', { type: 'button', class: 'wijk-tegel', style: { '--k': MACHT[w.macht]?.kleur }, onclick: () => { pan.close(); S.stad.focus('gids:' + w.gids, 40); } },
      h('b', {}, w.naam), h('span', {}, `${w.gebouwd} gebouw${w.gebouwd === 1 ? '' : 'en'}`), h('small', {}, `${w.bouwplaatsen} bouwplaats${w.bouwplaatsen === 1 ? '' : 'en'} - ${MACHT[w.macht]?.naam || w.macht}`)))));
  const gebouwd = m.gebouwen.filter(g => g.gebouwd);
  const lijst = h('ul', { class: 'gebouwen-lijst' }, ...gebouwd.map(g => h('li', {}, h('span', { class: 'macht-chip', style: { '--k': MACHT[g.macht]?.kleur } }, g.type), h('b', {}, g.code),
    h('small', {}, ` ${g.aantal} reiziger${g.aantal > 1 ? 's' : ''} - ${g.doel}`), h('button', { type: 'button', class: 'btn klein', onclick: () => { pan.close(); S.stad.focus(g.id, 22); kiesInStad(g.id); } }, 'Toon'))));
  add(pan.body, h('h3', {}, `Gebouwen (${gebouwd.length})`), gebouwd.length ? lijst : h('p', { class: 'tip' }, 'Nog geen gebouwen. Doe een missie: elk behaald doel bouwt mee.'));
  const gal = await store.listGallery();
  if (gal.length) add(pan.body, h('h3', {}, 'Galerij'), h('div', { class: 'galerij' }, ...gal.slice(-24).reverse().map(g => h('figure', {}, h('img', { src: g.data, alt: g.titel }), h('figcaption', {}, `${g.titel} - ${g.naam}`)))));
}

async function openHuis() {
  const p = S.pupil;
  if (p.leerkracht) { toast('De leerkracht heeft geen huis in de stad. Reizigers versieren hier hun eigen huis.'); return; }
  const pan = panel('Mijn huis', 'kluis');
  async function draw() {
    pan.body.innerHTML = '';
    const mine = (S.pupil.kosmetiek || []).filter(id => HUISDECOR[id]);
    const deco = { ...(S.pupil.huis?.deco || {}) };
    add(pan.body, h('div', { class: 'gids-zegt' }, gidsPortret('bram', 3), h('p', {}, 'Dit is jouw plek in de Reizigerswijk. Het dak heeft de kleur van je jas. Met extraatjes uit de Codekluis versier je je huis.')),
      h('div', { class: 'knoppen' }, h('button', { type: 'button', class: 'btn primair', onclick: () => showCreator({ pupil: S.pupil }) }, 'Pas je reiziger aan')));
    if (!mine.length) { add(pan.body, h('p', { class: 'tip' }, 'Nog geen versiering. Vind geheime codes in je Expeditieboek en typ ze in de Codekluis.')); return; }
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

// ---------- de poort en het weekverhaal ----------
function openPoort() {
  const pan = panel('De Poort', 'poort');
  const p = S.pupil, rang = rangVoor(p.xp || 0);
  add(pan.body,
    h('p', {}, `Achter De Poort ligt de middelbare school. ${METHODE} brengt je in zeven thema's een stuk dichter. Dit is jouw reis.`),
    h('ol', { class: 'reis' }, ...THEMAS.map(t => h('li', { class: t.id === THEMA.id ? 'nu' : '' }, h('b', {}, `Thema ${t.nr}: ${t.naam}`), h('small', {}, t.id === THEMA.id ? `${t.stad} - nu bezig` : t.data ? `${t.stad} - klaar om te spelen` : `${t.stad} - binnenkort`)))),
    h('h3', {}, 'Rangen'),
    h('ol', { class: 'rangen' }, ...RANGEN.map((r, i) => h('li', { class: i === rang.index ? 'nu' : i < rang.index ? 'gehaald' : '' }, h('b', {}, r.naam), h('small', {}, `${r.xp} XP`)))),
    h('p', { class: 'tip' }, 'Vaganten waren middeleeuwse rondtrekkende studenten: ze trokken van stad naar stad om te leren.'));
  void THEMA_LIJST;
}
function openVerhaal() {
  const w = weekVan(S.settings.huidigeWeek);
  const pan = panel('Het verhaal van de week', 'trein');
  add(pan.body, h('p', { class: 'week-titel' }, `Week ${w.week}: ${w.titel}`), h('div', { class: 'verhaal' }, h('p', {}, w.verhaal || THEMA.verhaal?.intro || '')),
    w.stad ? h('p', { class: 'tip' }, 'In de stad zie je dit: ' + w.stad) : null);
  add(pan.foot, h('button', { class: 'btn', type: 'button', onclick: () => speak(w.verhaal || '') }, 'Lees voor'),
    h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openWeekoverzicht(S.settings.huidigeWeek); } }, 'Mijn week'));
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
      h('div', { class: 'tegel-stat' }, h('b', {}, String(Object.values(stats).filter(s => doelStatus(s) === 'behaald').length)), h('small', {}, 'doelen behaald')),
      h('div', { class: 'tegel-stat' }, h('b', {}, `${weekCodes.filter(c => (p.codes || []).includes(c.code)).length}/${weekCodes.length}`), h('small', {}, 'codes gevonden'))),
    h('h3', {}, 'Mijn doelen'),
    Object.keys(stats).length ? h('div', { class: 'schilden' }, ...Object.entries(stats).map(([code, st]) => {
      const s = doelStatus(st);
      return h('div', { class: 'schild ' + s, title: THEMA.doelen[code]?.doel || '' }, h('span', { class: 'schild-ico', 'aria-hidden': 'true' }), h('b', {}, code), h('small', {}, s === 'behaald' ? 'Behaald' : 'Revanche: nog oefenen'));
    })) : h('p', { class: 'tip' }, 'Nog geen resultaten deze week.'),
    h('h3', {}, 'Nog te doen'),
    h('ul', { class: 'missie-lijst' }, ...await Promise.all(missies.filter(m => !gedaan.has(m.id)).map(m => missieRij(m, { metGids: true })))));
  add(pan.foot, h('button', { class: 'btn primair', type: 'button', onclick: () => { pan.close(); openKluis(); } }, 'Code van de week invullen'));
}

// ---------- de raid op de eindbaas (reizigerskant) ----------
function onRaidState(st) {
  S.raid = st;
  const ban = $('#raid-banner'); if (!ban) return;
  const vorigeHp = S.raidHp; S.raidHp = st.hp;
  if (S.stad) S.stad.setStorm(st.status === 'actief' || st.status === 'lobby' ? 0.35 + 0.65 * (st.hp / Math.max(1, st.maxHp)) : 0, { flits: vorigeHp != null && st.hp < vorigeHp });
  if (st.status === 'actief' || st.status === 'lobby') {
    ban.hidden = false; ban.innerHTML = '';
    ban.append(h('b', {}, st.status === 'lobby' ? 'De eindbaas komt: ' : 'EINDBAAS! '), `${st.naam}. `, h('button', { class: 'btn primair', type: 'button', id: 'raid-mee', onclick: openRaid }, 'Doe mee'));
  } else ban.hidden = true;
  if (S.raidPanel) S.raidPanel.update(st);
}

async function openRaid() {
  if (S.raidPanel) return;
  const st = S.raid; if (!st) return;
  const eb = THEMA.eindbaas || { naam: st.naam };
  const pan = panel(st.naam || eb.naam, 'raid', { breed: true });
  const route = routeVoor(S.pupil, 'Wetenschap') === 'telescoop' ? 'telescoop' : 'kompas';
  const r = rng(S.pupil.id + st.raidId);
  const results = []; let n = 0, current = null, checked = false, saved = false;
  const hp = h('div', { class: 'balk hp' }, h('span', {}));
  const status = h('p', { class: 'raid-status' });
  const zone = h('div', { class: 'raid-zone' });
  const fb = h('div', { class: 'm-feedback', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn groot primair', type: 'button' }, 'Controleer');
  sync.publish('raid:join', { raidId: st.raidId, pid: S.pupil.id });
  add(pan.body, h('div', { class: 'raid-kop' }, h('b', {}, eb.naam), hp), status, zone, fb);
  add(pan.foot, btn);
  const update = (s) => {
    hp.firstChild.style.width = Math.round((s.hp / Math.max(1, s.maxHp)) * 100) + '%';
    status.textContent = s.status === 'gewonnen' ? (eb.eind || 'De klas heeft gewonnen!')
      : s.status === 'gestopt' ? 'De eindbaas is gestopt.'
        : s.status === 'lobby' ? 'Wacht tot de leerkracht start ... je mag al oefenen.'
          : 'Elk juist antwoord spuit proper water op het monster. Samen staan we sterk.';
    if (s.status === 'gewonnen' || s.status === 'gestopt') { btn.textContent = 'Terug naar de stad'; btn.onclick = () => pan.close(); zone.innerHTML = ''; save(s.status === 'gewonnen'); }
  };
  S.raidPanel = { update };
  update(st);
  const origClose = pan.close;
  pan.close = () => { save(false); S.raidPanel = null; origClose(); };
  pan.el.querySelector('.sluit').onclick = pan.close;
  function next() {
    checked = false; fb.textContent = ''; fb.className = 'm-feedback';
    const item = raidItem(route, r, n++, THEMA);
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
    if (res.goed) { sync.publish('raid:hit', { raidId: st.raidId, hid: uid('h'), pid: S.pupil.id }); fb.className = 'm-feedback goed'; fb.textContent = 'Raak! Een straal proper water treft het monster.'; blip('hit'); }
    else { fb.className = 'm-feedback mis'; fb.textContent = `Nog niet. Juist was: ${res.juist}. Probeer de volgende!`; }
    btn.textContent = 'Volgende vraag';
  }
  async function save(won) {
    if (saved || S.pupil.leerkracht || !results.length) return; saved = true;
    const goed = results.reduce((s, x) => s + x.goed, 0), totaal = results.reduce((s, x) => s + x.totaal, 0);
    const xp = goed * XP.raidJuist + (won ? XP.raidOverwinning : 0);
    await store.addAttempt({ id: uid('p'), pid: S.pupil.id, missie: 'raid:' + st.raidId, week: S.settings.huidigeWeek, route, items: results, goed, totaal, xp, ts: Date.now(), bron: 'raid' });
    const fresh = (await store.getPupil(S.pupil.id)) || S.pupil; fresh.xp = (fresh.xp || 0) + xp; await store.savePupil(fresh); S.pupil = fresh;
    toast(`Eindbaas: +${xp} XP`);
    sync.publish('klas:update', {});
    refresh();
  }
  next();
}

init().catch(err => { console.error(err); $('#app').append(h('p', { class: 'fout' }, 'Er ging iets mis bij het starten: ' + err.message)); });
