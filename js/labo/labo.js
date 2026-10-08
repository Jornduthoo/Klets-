// Een labo openen: je gaat een themagebouw binnen, ziet de werkbanken en kiest er een.
//   filmpje    = een korte animatie uit de themagegevens, met voorleesknop
//   weerdata   = het echte weer van Brugge aflezen en invullen
//   simulatie  = een proefopstelling met opdrachten per route
//   test       = de automatisch verbeterde check (de gewone missie-engine)
// Alles wat je doet, wordt bewaard als poging (attempt), zodat de doelen in het dashboard komen en het
// water van de stad helderder wordt. Het labo zelf is data: zie data/thema-waterwereld.js.
import { h, uid, toast } from '../core/util.js';
import { leesKnop, spreek, stopSpreken, tekstVan } from '../core/stem.js';

/** Zoals append, maar lege stukken (null) worden overgeslagen. */
function toon(el, ...kids) { for (const k of kids) if (k != null && k !== false) el.append(k); }
import { GIDSEN } from '../config.js';
import { gidsBeeld } from '../figuren/portret.js';
import { maakInterieur } from './interieur.js';
import { maakFilmpje } from './filmpje.js';
import { maakWeerdata } from './weerdata.js';
import { runMission } from '../missions/engine.js';
import { kiesSet, routeVoor, xpVoorPoging } from '../core/model.js';

const SIMS = {
  waterkringloop: () => import('./sims/waterkringloop.js'),
  drijven: () => import('./sims/drijven.js'),
  sluis: () => import('./sims/sluis.js'),
  getij: () => import('./sims/getij.js'),
  voedselweb: () => import('./sims/voedselweb.js'),
  waterfilter: () => import('./sims/waterfilter.js'),
};

/**
 * Open een gebouw met zijn labo's.
 * opts: { gebouw (uit thema.gebouwen), laboId (welk labo open staat), thema, pupil, store, routeWens, onKlaar(), onVoortgang() }
 */
export async function openLabo(opts) {
  const { gebouw, thema, pupil, store } = opts;
  const labos = (gebouw.labos || []).map(id => ({ id, ...thema.labos[id] })).filter(l => l.naam);
  let labo = labos.find(l => l.id === opts.laboId) || labos[0];
  if (!labo) { toast('Dit gebouw heeft nog geen labo.'); return; }

  const gedaan = await gedaanStations(store, pupil, labos);
  const body = h('div', { class: 'labo-body' });
  const kop = h('header', { class: 'labo-kop' });
  const sluit = h('button', { class: 'btn sluit', type: 'button', 'aria-label': 'Sluiten' }, 'Terug naar de stad');
  const paneel = h('div', { class: 'paneel labo', role: 'dialog', 'aria-modal': 'true', 'aria-label': gebouw.naam }, kop, body);
  const overlay = h('div', { class: 'overlay labo-overlay' }, paneel);
  document.body.append(overlay);
  let actief = null, gezegd = null;
  let resolve; const done = new Promise(r => resolve = r);
  const close = () => { stopSpreken(); actief?.stop?.(); overlay.remove(); document.removeEventListener('keydown', onKey); opts.onKlaar?.(); resolve(); };
  sluit.onclick = close;
  const onKey = (e) => { if (e.key === 'Escape') { if (actief) toonKamer(); else close(); } };
  document.addEventListener('keydown', onKey);

  function zetKop(onderTitel, terug) {
    kop.innerHTML = '';
    toon(kop,
      gidsBeeld(labo.gids || gebouw.gids, { px: 56 }),
      h('div', { class: 'labo-titel' },
        h('small', {}, `${gebouw.naam} - week ${labo.week}`),
        h('h2', {}, onderTitel || labo.naam)),
      terug ? h('button', { class: 'btn klein', type: 'button', onclick: toonKamer }, 'Terug naar de werkbanken') : null,
      leesKnop(() => [onderTitel || labo.naam, ...tekstVan(body)], { titel: 'Lees dit scherm voor' }),
      sluit);
  }

  function stations(l = labo) {
    return (l.stations || ['filmpje', 'simulatie', 'test']).map(id => ({ id, klaar: !!gedaan[l.id + ':' + id] }));
  }

  function toonKamer() {
    stopSpreken();
    actief?.stop?.();
    zetKop(null, false);
    body.innerHTML = '';
    const gids = GIDSEN[labo.gids] || {};
    const keuze = labos.length > 1
      ? h('div', { class: 'sim-knoppen' }, ...labos.map(l => h('button', {
        type: 'button', class: 'btn klein' + (l.id === labo.id ? ' sel' : ''), onclick: () => { labo = l; toonKamer(); },
      }, l.naam)))
      : null;
    const kamer = maakInterieur({
      interieur: gebouw.interieur, stations: stations(),
      onKies: (id) => opener(id),
    });
    actief = kamer;
    toon(body,
      h('div', { class: 'gids-zegt' }, h('p', {}, `${gids.naam || 'De gids'}: "${labo.uitleg || gebouw.uitleg}"`)),
      keuze, kamer.el,
      h('p', { class: 'tip' }, labo.herstel?.tekst ? `Als de klas dit labo haalt: ${labo.herstel.tekst}` : ''));
    if (gezegd !== labo.id) { gezegd = labo.id; spreek(labo.uitleg || gebouw.uitleg || '', { vanzelf: true }); }
  }

  function opener(id) {
    if (id === 'filmpje') return toonFilmpje();
    if (id === 'weerdata') return toonWeerdata();
    if (id === 'simulatie') return toonSimulatie();
    if (id === 'test') return toonTest();
  }

  async function bewaar(station, resultaten, { naam } = {}) {
    gedaan[labo.id + ':' + station] = true;
    if (!store || !pupil || pupil.leerkracht) return;
    const goed = resultaten.reduce((s, r) => s + (r.goed || 0), 0);
    const totaal = resultaten.reduce((s, r) => s + (r.totaal || 0), 0);
    const missieId = `labo:${labo.id}:${station}`;
    const vorige = (await store.listAttempts({ pid: pupil.id })).filter(a => a.missie === missieId && a.bron === 'labo');
    const xp = xpVoorPoging(vorige, goed);
    await store.addAttempt({
      id: uid('p'), pid: pupil.id, missie: missieId, labo: labo.id, station, week: labo.week,
      route: routeVoor(pupil, labo.domein), items: resultaten, goed, totaal, xp, ts: Date.now(), bron: 'labo',
    });
    if (xp) { const fresh = (await store.getPupil(pupil.id)) || pupil; fresh.xp = (fresh.xp || 0) + xp; pupil.xp = fresh.xp; await store.savePupil(fresh); }
    if (xp) toast(`+${xp} XP: ${naam || station}`);
    opts.onVoortgang?.();
  }

  function toonFilmpje() {
    actief?.stop?.();
    zetKop(labo.filmpje?.titel || 'Filmpje', true);
    body.innerHTML = '';
    if (!labo.filmpje) { body.append(h('p', {}, 'Voor dit labo is er nog geen filmpje.')); return; }
    const f = maakFilmpje(labo.filmpje, { onKlaar: () => bewaar('filmpje', [{ id: 'film:' + labo.id, goals: [], goed: 0, totaal: 0, type: 'filmpje', antwoord: 'bekeken' }], { naam: 'filmpje bekeken' }) });
    actief = f;
    body.append(f.el, h('button', { type: 'button', class: 'btn primair', onclick: toonKamer }, 'Naar de werkbanken'));
  }

  function toonWeerdata() {
    actief?.stop?.();
    zetKop('Echte weerdata van Brugge', true);
    body.innerHTML = '';
    const w = maakWeerdata({ onKlaar: (res) => bewaar('weerdata', res, { naam: 'weerdata afgelezen' }) });
    actief = w;
    body.append(w.el);
  }

  async function toonSimulatie() {
    actief?.stop?.();
    zetKop('Proefopstelling', true);
    body.innerHTML = '';
    const sim = labo.simulatie;
    const laad = SIMS[sim?.type];
    if (!laad) { body.append(h('p', {}, 'Voor dit labo is er nog geen proefopstelling.')); return; }
    body.append(h('p', { class: 'tip' }, 'De proefopstelling wordt klaargezet ...'));
    const mod = await laad();
    const route = kiesRoute(sim.opdrachten);
    const opdrachten = sim.opdrachten?.[route] || [];
    body.innerHTML = '';
    const s = mod.maakSim({
      opdrachten, route,
      onKlaar: (res) => { bewaar('simulatie', res, { naam: 'proefopstelling' }); },
    });
    actief = s;
    body.append(h('p', { class: 'route-badge r-' + route }, route === 'telescoop' ? 'Telescoop' : 'Kompas'), s.el,
      h('button', { type: 'button', class: 'btn', onclick: toonKamer }, 'Naar de werkbanken'));
  }

  function kiesRoute(sets) {
    const wens = opts.routeWens || routeVoor(pupil, labo.domein) || 'kompas';
    if (sets?.[wens]?.length) return wens;
    return sets?.telescoop?.length && wens === 'telescoop' ? 'telescoop' : 'kompas';
  }

  async function toonTest() {
    actief?.stop?.();
    const missie = {
      id: 'labo:' + labo.id, naam: 'Check: ' + labo.naam, intro: `${GIDSEN[labo.gids]?.naam || 'De gids'} kijkt mee. Toon wat je in het labo leerde.`,
      gids: labo.gids, macht: labo.domein, week: labo.week, dag: labo.dag, sets: labo.test, kind: 'labo',
    };
    const wens = opts.routeWens || routeVoor(pupil, labo.domein);
    const res = await runMission({
      missie, pupil, store, routeWens: wens, mode: pupil?.leerkracht ? 'voorbeeld' : 'missie', doelen: thema.doelen,
    });
    if (res) { gedaan[labo.id + ':test'] = true; opts.onVoortgang?.(); }
    toonKamer();
    void kiesSet;
  }

  toonKamer();
  return done;
}

/** Welke werkbanken deed deze reiziger al? */
async function gedaanStations(store, pupil, labos) {
  const uit = {};
  if (!store || !pupil || pupil.leerkracht) return uit;
  const alle = await store.listAttempts({ pid: pupil.id });
  for (const a of alle) {
    const m = /^labo:([a-z0-9-]+)(?::([a-z]+))?$/.exec(a.missie || '');
    if (!m) continue;
    uit[`${m[1]}:${m[2] || 'test'}`] = true;
  }
  void labos;
  return uit;
}
