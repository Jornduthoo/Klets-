// Missie-engine: toont items na elkaar, verbetert automatisch en bewaart het resultaat per doelcode.
import { h, add, uid, rng, blip, toast } from '../core/util.js';
import { leesKnop, spreek, stopSpreken, tekstVan } from '../core/stem.js';
import { renderItem } from './types.js';
import { kiesSet, xpVoorPoging, doelStatus } from '../core/model.js';
import { ROUTE, GIDSEN, BEHAALD_GRENS } from '../config.js';
import { gidsBeeld } from '../figuren/portret.js';

/** Portret van een gids: zijn 3D-figuur, één keer getekend en daarna als beeld hergebruikt. */
export function gidsPortret(id, scale = 4) { return gidsBeeld(id, { px: 16 * scale }); }

const LOF = ['Juist!', 'Knap gedaan.', 'Helemaal goed.', 'Sterk!', 'Dat klopt.', 'Goed gezien.'];
const NOG = ['Nog niet.', 'Bijna, kijk nog eens.', 'Nog niet helemaal.'];

/**
 * Open een missie in een venster.
 * opts: { missie, pupil, routeWens, mode: 'missie'|'voorbeeld', store, onClose(result) , doelen }
 */
export function runMission(opts) {
  const { missie, pupil, store, mode = 'missie', doelen = {} } = opts;
  const routeWens = opts.routeWens || 'kompas';
  const { route, items } = kiesSet(missie, routeWens);
  const r = rng(uid('r'));
  const gids = GIDSEN[missie.gids] || GIDSEN.kroniek;
  const results = [];
  let idx = -1, current = null, checked = false;

  const body = h('div', { class: 'm-body' });
  const prog = h('div', { class: 'm-prog', 'aria-hidden': 'true' });
  const btn = h('button', { class: 'btn groot primair', type: 'button' }, 'Start');
  const fb = h('div', { class: 'm-feedback', 'aria-live': 'polite' });
  const sluit = h('button', { class: 'btn sluit', type: 'button', 'aria-label': 'Sluiten' }, 'Sluiten');
  const routeBadge = h('span', { class: 'route-badge r-' + route }, ROUTE[route]?.naam || route);
  const paneel = h('div', { class: 'paneel missie', role: 'dialog', 'aria-modal': 'true', 'aria-label': missie.naam },
    h('header', { class: 'm-head' }, gidsPortret(missie.gids, 3),
      h('div', { class: 'm-titel' }, h('small', {}, `${gids.naam} - week ${missie.week}, ${missie.dag}`), h('h2', {}, missie.naam)),
      routeBadge, mode === 'voorbeeld' ? h('span', { class: 'route-badge voorbeeld' }, 'Voorbeeld') : null,
      leesKnop(() => [...tekstVan(body), ...tekstVan(fb)], { titel: 'Lees dit scherm voor' }), sluit),
    prog, body, fb, h('footer', { class: 'm-foot' }, btn));
  const overlay = h('div', { class: 'overlay' }, paneel);
  document.body.append(overlay);

  let resolveDone; const done = new Promise(res => resolveDone = res);
  const close = (result = null) => { stopSpreken(); overlay.remove(); document.removeEventListener('keydown', onKey); opts.onClose?.(result); resolveDone(result); };
  sluit.onclick = () => close(null);
  const onKey = (e) => {
    if (e.key === 'Escape') close(null);
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') { e.preventDefault(); btn.click(); }
  };
  document.addEventListener('keydown', onKey);

  // ---- intro ----
  if (!items.length) {
    add(body, h('div', { class: 'gids-zegt' }, h('p', {}, missie.kind === 'klas'
      ? `Deze opdracht doe je in de klas of in je Logboek. ${missie.les.titel}.`
      : 'Voor deze missie zijn nog geen digitale oefeningen.')),
    h('p', { class: 'tip' }, 'In een volgende versie van Vagant komt deze missie ook digitaal. Je mist niets: je leerkracht weet het.'));
    btn.textContent = 'Terug naar de stad'; btn.onclick = () => close(null);
    return done;
  }
  add(body, h('div', { class: 'gids-zegt' }, h('p', {}, missie.intro || `Welkom, reiziger. Klaar voor '${missie.naam}'?`)),
    h('p', { class: 'tip' }, `${items.length} opdrachten. Je kan altijd 'Lees voor' gebruiken.`),
    route !== routeWens ? h('p', { class: 'tip' }, `Deze missie volgt voor jou de route ${ROUTE[route].naam}.`) : null);
  prog.append(...items.map(() => h('span', { class: 'stip' })));
  spreek(missie.intro || `Welkom, reiziger. Klaar voor '${missie.naam}'?`, { vanzelf: true });
  btn.onclick = next;

  function next() {
    stopSpreken();
    idx++; checked = false; fb.textContent = ''; fb.className = 'm-feedback';
    [...prog.children].forEach((s, i) => s.classList.toggle('nu', i === idx));
    if (idx >= items.length) return finish();
    const item = items[idx];
    body.innerHTML = '';
    current = renderItem(item, { rand: r, saveGallery: (g) => saveGallery(g) });
    const vraag = h('h3', { class: 'vraag' }, item.vraag);
    add(body, h('div', { class: 'vraag-rij' }, vraag, leesKnop(() => [item.vraag, ...[].concat(item.context || []), ...(item.opties || []).map(String)], { klasse: 'lees' })),
      item.context ? h('div', { class: 'context' }, ...[].concat(item.context).map(t => h('p', {}, t))) : null,
      current.el);
    btn.textContent = current.knop || 'Controleer'; btn.onclick = check;
    setTimeout(() => current.focus?.(), 30);
  }

  async function check() {
    if (checked) return next();
    if (current.ready && !current.ready()) { fb.textContent = 'Maak eerst je keuze.'; fb.className = 'm-feedback info'; return; }
    const item = items[idx];
    const res = await current.check();
    checked = true;
    current.reveal(res);
    results.push({ id: item.id, goals: item.goals || [], goed: res.goed, totaal: res.totaal, antwoord: String(res.antwoord ?? '').slice(0, 200), type: item.type });
    const dot = prog.children[idx];
    if (res.totaal) {
      const ok = res.goed === res.totaal;
      dot.classList.add(ok ? 'goed' : res.goed > 0 ? 'half' : 'mis');
      fb.className = 'm-feedback ' + (ok ? 'goed' : 'mis');
      const extra = res.bijna ? ' Je zat er heel dicht bij: let op de spelling.' : res.nietKleinst ? ' Die breuk is gelijk, maar kan nog kleiner.' : '';
      fb.innerHTML = '';
      fb.append(h('strong', {}, ok ? LOF[Math.floor(r() * LOF.length)] : (res.totaal > 1 && res.goed > 0 ? `${res.goed} van de ${res.totaal} juist.` : NOG[Math.floor(r() * NOG.length)])));
      if (!ok && res.juist && res.totaal === 1) fb.append(' Het juiste antwoord: ', h('span', { class: 'juist' }, res.juist), '.');
      if (extra) fb.append(extra);
      if (item.uitleg) fb.append(h('div', { class: 'uitleg' }, item.uitleg));
      blip(ok ? 'ok' : 'nee');
    } else { dot.classList.add('goed'); }
    btn.textContent = idx === items.length - 1 ? 'Naar het resultaat' : 'Volgende';
    if (!res.totaal) next();
  }

  async function saveGallery(g) {
    if (mode === 'voorbeeld' || !store) return;
    try { await store.addGallery({ id: uid('g'), pid: pupil.id, naam: pupil.naam, missie: missie.id, ts: Date.now(), ...g }); toast('Je foto staat in de klasgalerij.'); }
    catch (e) { toast(e.message); }
  }

  async function finish() {
    const goed = results.reduce((s, x) => s + x.goed, 0), totaal = results.reduce((s, x) => s + x.totaal, 0);
    let xp = 0, attempt = null;
    if (mode !== 'voorbeeld' && store && pupil) {
      const vorige = (await store.listAttempts({ pid: pupil.id })).filter(a => a.missie === missie.id && a.bron === 'missie');
      xp = xpVoorPoging(vorige, goed);
      attempt = { id: uid('p'), pid: pupil.id, missie: missie.id, week: missie.week, route, items: results, goed, totaal, xp, ts: Date.now(), bron: 'missie' };
      await store.addAttempt(attempt);
      const fresh = (await store.getPupil(pupil.id)) || pupil;
      fresh.xp = (fresh.xp || 0) + xp; pupil.xp = fresh.xp;
      await store.savePupil(fresh);
    }
    // doelen in deze poging
    const perDoel = {};
    for (const it of results) for (const g of it.goals) { perDoel[g] = perDoel[g] || { goed: 0, totaal: 0 }; perDoel[g].goed += it.goed; perDoel[g].totaal += it.totaal; }
    body.innerHTML = ''; fb.textContent = ''; fb.className = 'm-feedback';
    const pct = totaal ? Math.round((goed / totaal) * 100) : 100;
    const schilden = h('div', { class: 'schilden' }, ...Object.entries(perDoel).filter(([, v]) => v.totaal).map(([code, v]) => {
      const st = doelStatus({ goed: v.goed, totaal: v.totaal, best: v.goed / v.totaal });
      return h('div', { class: 'schild ' + st, title: doelen[code]?.doel || code }, h('span', { class: 'schild-ico', 'aria-hidden': 'true' }), h('b', {}, code), h('small', {}, st === 'behaald' ? 'Schild gekleurd' : 'Nog oefenen: Revanche'));
    }));
    add(body, 
      h('div', { class: 'gids-zegt' }, h('p', {}, pct >= BEHAALD_GRENS * 100 ? `Prachtig, ${pupil?.naam || 'reiziger'}! De mist trekt een beetje verder op.` : `Goed dat je het probeerde, ${pupil?.naam || 'reiziger'}. Wat nog niet lukt, oefen je later in de Revanche.`)),
      h('div', { class: 'score-groot' }, h('span', {}, `${goed} / ${totaal}`), h('small', {}, 'juist')),
      mode === 'voorbeeld' ? h('p', { class: 'tip' }, 'Voorbeeldmodus: er wordt niets bewaard.') : h('p', { class: 'xp-win' }, xp ? `+${xp} XP` : 'Geen extra XP: je had deze missie al even goed of beter.'),
      schilden);
    if (xp) blip('xp');
    btn.textContent = 'Terug naar de stad';
    btn.onclick = () => close({ attempt, xp, goed, totaal });
  }
  return done;
}
