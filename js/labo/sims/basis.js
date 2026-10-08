// Gemeenschappelijke basis voor de proefopstellingen (simulaties) van de labo's.
// Een simulatie krijgt een lijst opdrachten (per route) uit het themabestand. Per opdracht tekent ze haar
// eigen beeld en kijkt ze zelf na of de opdracht gelukt is. Elke gelukte opdracht levert een resultaat
// {id, goals, goed, totaal} op, net als een gewone oefening, zodat de doelen in het dashboard komen.
import { h } from '../../core/util.js';
import { leesKnop } from '../../core/stem.js';

/**
 * Bouw een simulatie met een opdrachtenlijst.
 * maker(host, { opdracht, gelukt(), mislukt(tekst), zeg(tekst) }) geeft { stop() } terug.
 */
export function simKader({ naam, opdrachten = [], maker, onKlaar }) {
  const resultaten = [];
  let idx = 0, actief = null;
  const kop = h('p', { class: 'sim-opdracht', 'aria-live': 'polite' });
  const melding = h('p', { class: 'sim-melding' });
  const host = h('div', { class: 'sim-host' });
  const balk = h('div', { class: 'film-balk' }, ...opdrachten.map(() => h('span', { class: 'stip' })));
  const lees = leesKnop(() => kop.textContent);
  const over = h('button', { type: 'button', class: 'btn klein zacht', onclick: () => volgende(0) }, 'Sla over');
  const el = h('div', { class: 'sim' }, h('h3', {}, naam || 'Proefopstelling'),
    h('div', { class: 'sim-rij' }, kop, lees, over), host, melding, balk);

  function volgende(goed) {
    const o = opdrachten[idx];
    if (o) resultaten.push({ id: o.id, goals: o.doelen || o.goals || [], goed, totaal: 1, type: 'simulatie', antwoord: goed ? 'gelukt' : 'overgeslagen' });
    idx++;
    if (idx >= opdrachten.length) { stopActief(); kop.textContent = 'Alle opdrachten gedaan.'; balk.querySelectorAll('.stip').forEach(s => s.classList.add('goed')); onKlaar?.(resultaten); return; }
    start();
  }
  function stopActief() { actief?.stop?.(); actief = null; host.innerHTML = ''; }
  function start() {
    stopActief();
    const o = opdrachten[idx];
    kop.textContent = o ? o.tekst : '';
    melding.textContent = '';
    [...balk.children].forEach((c, k) => { c.classList.toggle('nu', k === idx); if (k < idx) c.classList.add('goed'); });
    actief = maker(host, {
      opdracht: o,
      gelukt: (tekst) => { melding.className = 'sim-melding goed'; melding.textContent = tekst || 'Gelukt!'; setTimeout(() => volgende(1), 1100); },
      mislukt: (tekst) => { melding.className = 'sim-melding mis'; melding.textContent = tekst || 'Nog niet. Probeer opnieuw.'; },
      zeg: (tekst) => { melding.className = 'sim-melding'; melding.textContent = tekst || ''; },
    });
  }
  if (opdrachten.length) start(); else { kop.textContent = 'Voor deze route zijn er nog geen proefopdrachten.'; onKlaar?.(resultaten); }
  return { el, stop: stopActief, resultaten };
}

/** Kleine knoppen- en schuifhulpjes voor de simulaties. */
export function knop(tekst, fn, klasse = 'btn klein') { return h('button', { type: 'button', class: klasse, onclick: fn }, tekst); }
export function schuif({ label, min = 0, max = 100, stap = 1, waarde = 50, eenheid = '', onInput }) {
  const uit = h('output', {}, `${waarde}${eenheid}`);
  const inp = h('input', {
    type: 'range', min, max, step: stap, value: waarde, class: 'sim-schuif', 'aria-label': label,
    oninput: (e) => { uit.textContent = `${e.target.value}${eenheid}`; onInput?.(+e.target.value); },
  });
  return { el: h('label', { class: 'sim-regel' }, h('span', {}, label), inp, uit), inp, zet: (v) => { inp.value = v; uit.textContent = `${v}${eenheid}`; } };
}
export function lus(fn) {
  let raf = 0, laatst = performance.now(), t = 0;
  const stap = (nu) => { raf = requestAnimationFrame(stap); const dt = Math.min(0.1, (nu - laatst) / 1000); laatst = nu; t += dt; fn(dt, t); };
  raf = requestAnimationFrame(stap);
  return { stop: () => cancelAnimationFrame(raf) };
}
