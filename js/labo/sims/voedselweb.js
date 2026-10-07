// Proefopstelling voedselweb van het Minnewater: trek pijlen van wie gegeten wordt naar wie eet.
// Bouw een hele keten (alg, watervlo, stekelbaars, reiger) of een web met meerdere ketens, en haal
// daarna een schakel weg om te zien wat er met de rest gebeurt.
import { h } from '../../core/util.js';
import { maakCanvas, Tekenaar, water, dier, plant, pijl, label, zon as tekenZon } from '../tekenen.js';
import { simKader, knop, lus } from './basis.js';

// wie eet wie: van (gegeten) -> naar (eter)
const WEZENS = [
  { id: 'zon', naam: 'de zon', x: 18, y: 14, soort: null, rol: 'licht' },
  { id: 'alg', naam: 'algen', x: 22, y: 60, soort: 'alg', rol: 'producent' },
  { id: 'plant', naam: 'waterplant', x: 30, y: 82, soort: null, rol: 'producent' },
  { id: 'watervlo', naam: 'watervlo', x: 58, y: 52, soort: 'watervlo', rol: 'consument' },
  { id: 'slak', naam: 'poelslak', x: 60, y: 80, soort: 'slak', rol: 'consument' },
  { id: 'vis', naam: 'stekelbaars', x: 96, y: 60, soort: 'vis', rol: 'consument' },
  { id: 'kikker', naam: 'kikker', x: 98, y: 82, soort: 'kikker', rol: 'consument' },
  { id: 'reiger', naam: 'reiger', x: 136, y: 54, soort: 'reiger', rol: 'toproofdier' },
  { id: 'eend', naam: 'eend', x: 134, y: 82, soort: 'eend', rol: 'consument' },
];
const JUIST = [
  ['zon', 'alg'], ['zon', 'plant'], ['alg', 'watervlo'], ['plant', 'slak'], ['alg', 'slak'],
  ['watervlo', 'vis'], ['slak', 'kikker'], ['vis', 'reiger'], ['kikker', 'reiger'], ['plant', 'eend'], ['watervlo', 'eend'],
];
const KETEN = ['alg', 'watervlo', 'vis', 'reiger'];

export function maakSim(ctx) {
  return simKader({
    naam: 'Wie eet wie in het Minnewater', opdrachten: ctx.opdrachten, onKlaar: ctx.onKlaar,
    maker: (host, { opdracht, gelukt, mislukt, zeg }) => {
      const canvas = maakCanvas(680);
      const tk = new Tekenaar(canvas);
      const pijlen = [];
      let gekozen = null, weg = null;
      const info = h('p', { class: 'sim-meter' });
      const wisKnop = knop('Wis de pijlen', () => { pijlen.length = 0; weg = null; na(); }, 'btn klein zacht');
      const wegRij = opdracht?.weg ? h('div', { class: 'sim-knoppen' }, ...['alg', 'watervlo', 'vis'].map(id =>
        knop('Haal ' + (WEZENS.find(w => w.id === id)?.naam) + ' weg', () => { weg = id; na(); }, 'btn klein'))) : null;
      host.append(canvas, h('p', { class: 'tip' }, 'Klik eerst wie gegeten wordt, dan wie eet. De pijl wijst naar de eter.'), h('div', { class: 'sim-knoppen' }, wisKnop));
      if (wegRij) host.append(wegRij);
      host.append(info);

      canvas.addEventListener('pointerdown', (e) => {
        const p = tk.punt(e);
        const w = WEZENS.find(w => Math.hypot(w.x - p.x, w.y - p.y) < 9);
        if (!w) { gekozen = null; return; }
        if (!gekozen) { gekozen = w.id; zeg(`${w.naam} gekozen. Klik nu wie dat eet.`); return; }
        if (gekozen === w.id) { gekozen = null; return; }
        const ok = JUIST.some(([a, b]) => a === gekozen && b === w.id);
        if (!ok) { mislukt(`${WEZENS.find(x => x.id === w.id).naam} eet dat niet. Probeer een andere pijl.`); gekozen = null; return; }
        if (!pijlen.some(([a, b]) => a === gekozen && b === w.id)) pijlen.push([gekozen, w.id]);
        gekozen = null;
        na();
      });

      function na() {
        const o = opdracht || {};
        info.textContent = `${pijlen.length} pijlen gelegd` + (weg ? ` - ${WEZENS.find(w => w.id === weg)?.naam} is weg` : '');
        if (o.keten) {
          const heeft = KETEN.slice(0, -1).every((a, i) => pijlen.some(([x, y]) => x === a && y === KETEN[i + 1]));
          if (heeft) return gelukt('De voedselketen is rond: alg, watervlo, stekelbaars, reiger.');
        }
        if (o.pijlen && pijlen.length >= o.pijlen) return gelukt(`Een echt voedselweb met ${pijlen.length} pijlen!`);
        if (o.producenten) {
          const n = pijlen.filter(([a]) => a === 'zon').length;
          if (n >= o.producenten) return gelukt('De producenten maken voedsel met zonlicht.');
        }
        if (o.weg && weg) {
          const getroffen = JUIST.filter(([a]) => a === weg).map(([, b]) => WEZENS.find(w => w.id === b)?.naam);
          return gelukt(`Zonder ${WEZENS.find(w => w.id === weg)?.naam} krijgen ${getroffen.join(' en ')} het moeilijk: alles hangt samen.`);
        }
        if (o.top) { if (pijlen.some(([, b]) => b === 'reiger')) return gelukt('De reiger staat bovenaan: een toproofdier.'); }
      }

      const l = lus((dt, t) => {
        const g = tk.begin();
        water(g, { x: 0, y: 24, b: 160, h: 66, vuil: 0 });
        g.fillStyle = '#bfe4f7'; g.fillRect(0, 0, 160, 24);
        tekenZon(g, { x: 18, y: 14, r: 7 });
        plant(g, { x: 30, y: 88, s: 1.1 });
        for (const w of WEZENS) {
          if (w.id === weg) continue;
          if (w.soort) dier(g, { soort: w.soort, x: w.x, y: w.y + Math.sin(t * 1.2 + w.x) * 0.5, s: 1.2 });
          label(g, { x: w.x, y: w.y + 9, tekst: w.naam });
          if (gekozen === w.id) { g.strokeStyle = '#ffd166'; g.lineWidth = 1.2; g.beginPath(); g.arc(w.x, w.y, 8, 0, Math.PI * 2); g.stroke(); }
        }
        for (const [a, b] of pijlen) {
          if (a === weg || b === weg) continue;
          const A = WEZENS.find(w => w.id === a), B = WEZENS.find(w => w.id === b);
          const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
          pijl(g, { van: [A.x + dx / len * 7, A.y + dy / len * 7], naar: [B.x - dx / len * 8, B.y - dy / len * 8], kleur: '#2f6f4a' });
        }
        void dt;
      });
      na();
      return { stop: () => l.stop() };
    },
  });
}
