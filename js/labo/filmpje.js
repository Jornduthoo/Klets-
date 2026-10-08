// De filmpjes van de labo's: korte animaties die uit de themagegevens worden gespeeld (geen video's van
// internet). Elke scene heeft een duur, een beeld (lijst elementen, zie tekenen.js), een onderschrift en
// wat de gids zegt. Met spelen/pauzeren, vorige en volgende scene en een voorleesknop (Nederlandse stem).
import { h } from '../core/util.js';
import { leesKnop, spreek, stopSpreken, leestVanzelf } from '../core/stem.js';
import { maakCanvas, Tekenaar, tekenBeeld, label } from './tekenen.js';
import { gidsBeeld } from '../figuren/portret.js';
import { GIDSEN } from '../config.js';

/**
 * Speler voor een filmpje.
 * film: { titel, scenes: [{ duur, beeld, tekst, zegt, gids }] }
 * opts: { onKlaar() }
 */
export function maakFilmpje(film, opts = {}) {
  const canvas = maakCanvas(720, 'labo-canvas film');
  const tk = new Tekenaar(canvas);
  const scenes = film?.scenes || [];
  let i = 0, t = 0, speelt = true, klaar = false, raf = null, laatst = 0;

  const onderschrift = h('p', { class: 'film-tekst', 'aria-live': 'polite' });
  const zegt = h('p', { class: 'film-zegt' });
  const gidsVak = h('div', { class: 'film-gids' });
  const balk = h('div', { class: 'film-balk' }, ...scenes.map(() => h('span', { class: 'stip' })));
  const spelen = h('button', { type: 'button', class: 'btn primair', onclick: () => zetSpelen(!speelt) }, 'Pauzeer');
  // wat er bij een scene voorgelezen wordt: wat de gids zegt en het onderschrift (twee stukken, elk met een eigen opname)
  const sceneTekst = (s) => [s?.zegt, s?.tekst].filter(Boolean);
  const lees = leesKnop(() => sceneTekst(scenes[i]), { klein: false });
  // vanzelf voorlezen (stand 'altijd'): de scene wacht tot de zin uit is
  let praat = false, praatScene = -1;
  function vertel() {
    if (!speelt || klaar || !leestVanzelf() || praatScene === i) return;
    praatScene = i; praat = true;
    const k = i;
    spreek(sceneTekst(scenes[k]), { vanzelf: true }).finally(() => { if (praatScene === k) praat = false; });
  }
  const vorige = h('button', { type: 'button', class: 'btn klein', onclick: () => naar(i - 1) }, 'Vorige');
  const volgende = h('button', { type: 'button', class: 'btn klein', onclick: () => naar(i + 1) }, 'Volgende');
  const el = h('div', { class: 'film' },
    h('h3', {}, film?.titel || 'Filmpje'),
    h('div', { class: 'film-beeld' }, canvas, gidsVak),
    onderschrift, zegt, balk,
    h('div', { class: 'film-knoppen' }, spelen, lees, vorige, volgende));

  function zetScene() {
    const s = scenes[i];
    if (!s) return;
    onderschrift.textContent = s.tekst || '';
    zegt.textContent = s.zegt ? `${GIDSEN[s.gids]?.naam || 'Gids'}: "${s.zegt}"` : '';
    gidsVak.innerHTML = '';
    if (s.gids) gidsVak.append(gidsBeeld(s.gids, { px: 96 }));
    [...balk.children].forEach((c, k) => { c.classList.toggle('nu', k === i); c.classList.toggle('gezien', k < i); });
  }
  function naar(k) {
    if (k < 0 || k >= scenes.length) return;
    stopSpreken(); praat = false; praatScene = -1;
    i = k; t = 0; zetScene(); teken(); vertel();
  }
  function zetSpelen(aan) {
    speelt = aan; spelen.textContent = aan ? 'Pauzeer' : 'Spelen';
    if (!aan) { stopSpreken(); praat = false; praatScene = -1; }
    if (aan && klaar) { klaar = false; i = 0; t = 0; zetScene(); }
    if (aan) vertel();
    laatst = performance.now();
  }
  function teken() {
    const s = scenes[i];
    const g = tk.begin();
    if (!s) return;
    const u = Math.min(1, t / Math.max(0.5, s.duur || 7));
    tekenBeeld(g, s.beeld, u);
    if (klaar) label(g, { x: 80, y: 45, tekst: 'Einde van het filmpje', groot: 1 });
  }
  function lus(nu) {
    raf = requestAnimationFrame(lus);
    const dt = Math.min(0.2, (nu - laatst) / 1000); laatst = nu;
    if (speelt && !klaar) {
      t += dt;
      const s = scenes[i];
      if (s && t > (s.duur || 7) && !praat) {
        if (i < scenes.length - 1) { i++; t = 0; zetScene(); vertel(); }
        else { klaar = true; speelt = false; spelen.textContent = 'Opnieuw'; opts.onKlaar?.(); }
      }
    }
    teken();
  }
  zetScene();
  laatst = performance.now();
  raf = requestAnimationFrame(lus);
  vertel();

  return {
    el,
    stop() { cancelAnimationFrame(raf); stopSpreken(); },
    get klaar() { return klaar; },
  };
}
