// Proefopstelling eb en vloed: laat de maan rond de aarde draaien en de aarde om haar as. Je ziet twee
// bulten water (aan de kant van de maan en aan de overkant). Zeebrugge draait door die bulten: twee keer
// hoogwater en twee keer laagwater per dag. Zet zon en maan op een lijn en je krijgt springtij.
import { h } from '../../core/util.js';
import { maakCanvas, Tekenaar, lucht, aarde, getij as tekenGetij, maan as tekenMaan, zon as tekenZon, label, water } from '../tekenen.js';
import { simKader, schuif, knop, lus } from './basis.js';

export function maakSim(ctx) {
  return simKader({
    naam: 'Eb en vloed', opdrachten: ctx.opdrachten, onKlaar: ctx.onKlaar,
    maker: (host, { opdracht, gelukt, mislukt, zeg }) => {
      const canvas = maakCanvas(680);
      const tk = new Tekenaar(canvas);
      const st = { draai: 0, maan: 0, loopt: true, uren: 0, hoogwaters: 0, vorigeHoog: false, snelheid: 1 };
      const maanS = schuif({ label: 'De maan rond de aarde (graden)', min: 0, max: 360, waarde: 0, eenheid: ' graden', onInput: v => { st.maan = v * Math.PI / 180; } });
      const draaiS = schuif({ label: 'Snelheid van de aarde', min: 0, max: 3, stap: 0.1, waarde: 1, onInput: v => { st.snelheid = v; } });
      const meter = h('p', { class: 'sim-meter' });
      const telKnop = knop('Tel een hele dag (24 uur)', () => { st.uren = 0; st.hoogwaters = 0; st.tellen = true; zeg('De aarde draait een hele dag rond. Tel mee!'); }, 'btn klein');
      const antw = opdracht?.doelwit === 'tel' || opdracht?.doelwit === 'grafiek'
        ? h('div', { class: 'sim-regel' }, h('label', {}, 'Jouw antwoord: ', h('input', { type: 'text', class: 'invoer getal', size: 5, id: 'getij-in' })), knop('Controleer', controle, 'btn klein'))
        : null;
      host.append(canvas, maanS.el, draaiS.el, h('div', { class: 'sim-knoppen' }, telKnop), antw, meter);

      function hoek() { return st.draai; }
      /** Hoe hoog staat het water in Zeebrugge? (de stip op de aarde) */
      function stand() {
        const verschil = hoek() - st.maan;
        return Math.cos(verschil * 2) * 0.5 + 0.5;       // twee bulten per omwenteling
      }
      function springtij() {
        // de zon staat links (hoek PI): springtij als de maan op die lijn staat
        const a = ((st.maan % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const bijLijn = Math.min(Math.abs(a - 0), Math.abs(a - Math.PI), Math.abs(a - Math.PI * 2));
        return bijLijn < 0.25;
      }
      function doodtij() {
        const a = ((st.maan % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        return Math.min(Math.abs(a - Math.PI / 2), Math.abs(a - Math.PI * 1.5)) < 0.25;
      }
      function controle() {
        const inp = host.querySelector('#getij-in');
        const v = parseFloat(String(inp?.value || '').replace(',', '.'));
        const juist = opdracht?.antwoord ?? (opdracht?.doelwit === 'grafiek' ? 2 : 2);
        if (Math.abs(v - juist) < 0.6) gelukt(`Juist: ${juist} keer hoogwater per dag (ongeveer elke 12 uur en 25 minuten).`);
        else mislukt('Kijk nog eens naar de twee bulten water.');
      }

      const l = lus((dt, t) => {
        st.draai += dt * 0.6 * st.snelheid;
        if (st.tellen) {
          st.uren += dt * 0.6 * st.snelheid / (Math.PI * 2) * 24;
          const hoog = stand() > 0.92;
          if (hoog && !st.vorigeHoog) st.hoogwaters++;
          st.vorigeHoog = hoog;
          if (st.uren >= 24) { st.tellen = false; zeg(`Een dag voorbij: ${st.hoogwaters} keer hoogwater geteld.`); }
        }
        const g = tk.begin();
        lucht(g, { nacht: 1 });
        tekenZon(g, { x: 12, y: 45, r: 7 });
        aarde(g, { x: 74, y: 45, r: 17, stip: true, draai: st.draai });
        tekenGetij(g, { x: 74, y: 45, r: 17, hoek: st.maan, sterk: springtij() ? 2.0 : doodtij() ? 0.6 : 1.2 });
        tekenMaan(g, { x: 74 + Math.cos(st.maan) * 42, y: 45 + Math.sin(st.maan) * 28, r: 5, fase: 1 });
        // het strand van Zeebrugge rechts onderaan
        const h2 = stand();
        water(g, { x: 108, y: 74 - h2 * 8, b: 52, h: 24, vuil: 0 });
        g.fillStyle = '#e8d5a3'; g.beginPath(); g.moveTo(108, 90); g.lineTo(108, 78); g.lineTo(160, 70); g.lineTo(160, 90); g.closePath(); g.fill();
        label(g, { x: 134, y: 86, tekst: h2 > 0.66 ? 'vloed: hoogwater' : h2 < 0.33 ? 'eb: laagwater' : 'het water beweegt' });
        if (springtij()) label(g, { x: 74, y: 78, tekst: 'springtij' });
        if (doodtij()) label(g, { x: 74, y: 78, tekst: 'doodtij' });
        void t;
        meter.textContent = `Waterstand in Zeebrugge: ${Math.round(h2 * 100)} %`
          + (st.tellen ? ` - ${Math.floor(st.uren)} uur voorbij, ${st.hoogwaters} keer hoogwater` : '');

        const d = opdracht?.doelwit;
        if (d === 'hoog' && h2 > 0.95) gelukt('Hoogwater in Zeebrugge: de zee staat tot aan de dijk.');
        if (d === 'laag' && h2 < 0.05) gelukt('Laagwater: het strand is breed.');
        if (d === 'springtij' && springtij()) gelukt('Zon, aarde en maan op een lijn: springtij!');
        if (d === 'doodtij' && doodtij()) gelukt('Zon en maan haaks op elkaar: doodtij.');
      });
      return { stop: () => l.stop() };
    },
  });
}
