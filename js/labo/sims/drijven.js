// Proefopstelling drijven en zinken: kies een voorwerp, voorspel eerst (drijft of zinkt), laat het dan
// in water, olie of zout water vallen en kijk of je gelijk had. Op de route Telescoop reken je ook de
// massadichtheid uit (massa gedeeld door volume) en vergelijk je met de vloeistof.
import { h } from '../../core/util.js';
import { maakCanvas, Tekenaar, glas, voorwerp, label } from '../tekenen.js';
import { simKader, knop, lus } from './basis.js';

const VOORWERPEN = [
  { id: 'kurk', naam: 'kurk', massa: 3, volume: 12 },
  { id: 'hout', naam: 'blokje hout', massa: 30, volume: 50 },
  { id: 'ei', naam: 'ei', massa: 60, volume: 55 },
  { id: 'knikker', naam: 'knikker', massa: 12, volume: 5 },
  { id: 'spijker', naam: 'spijker', massa: 8, volume: 1 },
  { id: 'steen', naam: 'steen', massa: 75, volume: 30 },
  { id: 'plastic', naam: 'plastic flesje (leeg)', massa: 20, volume: 500 },
];
const VLOEISTOFFEN = { water: { naam: 'water', d: 1.0 }, olie: { naam: 'olie', d: 0.92 }, zout: { naam: 'zout water', d: 1.2 } };

export function maakSim(ctx) {
  const telescoop = ctx.route === 'telescoop';
  return simKader({
    naam: 'Drijven of zinken', opdrachten: ctx.opdrachten, onKlaar: ctx.onKlaar,
    maker: (host, { opdracht, gelukt, mislukt, zeg }) => {
      const canvas = maakCanvas(680);
      const tk = new Tekenaar(canvas);
      const st = { v: VOORWERPEN[0], vloeistof: opdracht?.vloeistof || 'water', y: 20, doel: 20, voorspeld: null, getest: 0, juist: 0, gerekend: 0, gebruikt: new Set(), vloeistoffen: new Set() };
      const info = h('p', { class: 'sim-meter' });
      const kiesRij = h('div', { class: 'sim-knoppen' }, ...VOORWERPEN.map(v => knop(v.naam, () => { st.v = v; st.voorspeld = null; st.doel = 20; zetInfo(); }, 'btn klein')));
      const vlRij = h('div', { class: 'sim-knoppen' }, ...Object.entries(VLOEISTOFFEN).map(([k, v]) => knop(v.naam, () => { st.vloeistof = k; st.doel = 20; zetInfo(); }, 'btn klein')));
      const voorspelRij = h('div', { class: 'sim-knoppen' },
        knop('Ik voorspel: het drijft', () => { st.voorspeld = 'drijft'; zetInfo(); }, 'btn klein'),
        knop('Ik voorspel: het zinkt', () => { st.voorspeld = 'zinkt'; zetInfo(); }, 'btn klein'),
        knop('Test het', test, 'btn primair klein'));
      const rekenRij = telescoop ? h('div', { class: 'sim-regel' },
        h('label', {}, 'Massadichtheid (g per cm3): ', h('input', { type: 'text', class: 'invoer getal', size: 5, id: 'md-in' })),
        knop('Controleer', rekenNa, 'btn klein')) : null;
      host.append(canvas, h('p', { class: 'tip' }, 'Kies een voorwerp en een vloeistof, voorspel en test.'), kiesRij, vlRij, voorspelRij, rekenRij, info);

      function dichtheid(v) { return v.massa / v.volume; }
      function drijft(v, vl) { return dichtheid(v) < VLOEISTOFFEN[vl].d; }
      function zetInfo() {
        const v = st.v;
        info.textContent = `${v.naam}: massa ${v.massa} g, volume ${v.volume} cm3`
          + (telescoop ? ` (massadichtheid ${Math.round(dichtheid(v) * 100) / 100} g per cm3)` : '')
          + ` - vloeistof: ${VLOEISTOFFEN[st.vloeistof].naam} (${VLOEISTOFFEN[st.vloeistof].d} g per cm3)`
          + (st.voorspeld ? ` - jouw voorspelling: het ${st.voorspeld}` : '');
      }
      function test() {
        if (!st.voorspeld) { mislukt('Voorspel eerst: drijft het of zinkt het?'); return; }
        const d = drijft(st.v, st.vloeistof);
        st.doel = d ? 44 : 70;
        st.getest++; st.gebruikt.add(st.v.id); st.vloeistoffen.add(st.vloeistof);
        const ok = (d && st.voorspeld === 'drijft') || (!d && st.voorspeld === 'zinkt');
        if (ok) st.juist++;
        zeg(ok ? `Juist: het ${d ? 'drijft' : 'zinkt'}.` : `Niet juist: het ${d ? 'drijft' : 'zinkt'}. Een onderzoeker past zijn idee aan.`);
        na();
      }
      function rekenNa() {
        const inp = host.querySelector('#md-in');
        const v = parseFloat(String(inp?.value || '').replace(',', '.'));
        if (!isFinite(v)) { mislukt('Vul een getal in.'); return; }
        if (Math.abs(v - dichtheid(st.v)) < 0.03) { st.gerekend++; zeg(`Juist gerekend: ${st.v.massa} : ${st.v.volume} = ${Math.round(dichtheid(st.v) * 100) / 100} g per cm3.`); if (inp) inp.value = ''; na(); }
        else mislukt('Nog niet. Deel de massa door het volume.');
      }
      function na() {
        const o = opdracht || {};
        if (o.aantal && st.gebruikt.size >= o.aantal) return gelukt(`Je voorspelde en testte ${st.gebruikt.size} voorwerpen.`);
        if (o.juist && st.juist >= o.juist) return gelukt(`${st.juist} voorspellingen juist!`);
        if (o.doelwit === 'ei' && st.v.id === 'ei' && st.vloeistof === 'zout' && st.doel === 44) return gelukt('Het ei drijft in zout water: zout water is zwaarder.');
        if (o.rekenen && st.gerekend >= o.rekenen) return gelukt(`Je rekende ${st.gerekend} keer de massadichtheid uit.`);
        if (o.drieVloeistoffen && st.vloeistoffen.size >= 3) return gelukt('Je testte in water, olie en zout water.');
      }
      zetInfo();

      const l = lus((dt) => {
        st.y += (st.doel - st.y) * Math.min(1, dt * 4);
        const g = tk.begin();
        g.fillStyle = '#eef3f8'; g.fillRect(0, 0, 160, 90);
        g.fillStyle = '#d7dee8'; g.fillRect(0, 72, 160, 18);
        glas(g, { x: 80, y: 48, b: 34, h: 52, vloeistof: st.vloeistof });
        label(g, { x: 80, y: 82, tekst: VLOEISTOFFEN[st.vloeistof].naam });
        voorwerp(g, { x: 80, y: st.y, soort: st.v.id, s: 1.6 });
        label(g, { x: 30, y: 12, tekst: st.v.naam });
        if (telescoop) label(g, { x: 128, y: 12, tekst: `${st.v.massa} g / ${st.v.volume} cm3` });
      });
      return { stop: () => l.stop() };
    },
  });
}
