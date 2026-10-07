// Proefopstelling waterkringloop: jij bent de baas over de zon en de wind. Warm de zee op, laat het water
// verdampen, maak een wolk, duw ze naar het land of naar de koude berg en kijk wat er valt. Het water
// stroomt via de rivier terug naar de zee: de kringloop is rond.
import { h } from '../../core/util.js';
import { maakCanvas, Tekenaar, lucht, zee, land, zon as tekenZon, wolk, regen, damp, rivier, thermometer, label, pijl } from '../tekenen.js';
import { simKader, schuif, lus } from './basis.js';

const LAND = [[96, 90], [96, 64], [118, 60], [138, 44], [152, 30], [160, 28], [160, 90]];

export function maakSim(ctx) {
  return simKader({
    naam: 'De waterkringloop', opdrachten: ctx.opdrachten, onKlaar: ctx.onKlaar,
    maker: (host, { opdracht, gelukt, zeg }) => {
      const canvas = maakCanvas(680);
      const tk = new Tekenaar(canvas);
      const st = { temp: 8, wind: 10, damp: 0, wolk: 0, wolkX: 50, neerslag: 0, terug: 0, druppels: 0, sneeuw: 0 };
      const tempS = schuif({ label: 'Temperatuur van de zee', min: -2, max: 32, waarde: 8, eenheid: ' graden', onInput: v => { st.temp = v; } });
      const windS = schuif({ label: 'Wind naar het land', min: 0, max: 40, waarde: 10, eenheid: ' km/u', onInput: v => { st.wind = v; } });
      const meter = h('p', { class: 'sim-meter' });
      host.append(canvas, tempS.el, windS.el, meter);

      const l = lus((dt, t) => {
        // verdampen hangt af van de temperatuur
        const verdamp = Math.max(0, (st.temp - 10) / 22);
        st.damp = Math.min(1, st.damp + (verdamp - 0.12) * dt * 0.5);
        st.damp = Math.max(0, st.damp);
        // de damp wordt een wolk
        if (st.damp > 0.45) st.wolk = Math.min(1, st.wolk + dt * 0.35);
        else st.wolk = Math.max(0, st.wolk - dt * 0.2);
        // de wind duwt de wolk landinwaarts
        st.wolkX = Math.min(150, Math.max(40, st.wolkX + (st.wind / 40) * dt * 9 - dt * 0.8));
        const kouMaat = st.wolkX > 120 ? 1 : 0;      // boven de berg is het koud
        // neerslag: boven het land en als de wolk vol is
        const kanRegenen = st.wolk > 0.6 && st.wolkX > 92;
        st.neerslag = Math.max(0, Math.min(1, st.neerslag + (kanRegenen ? dt * 0.8 : -dt * 0.9)));
        st.sneeuw = kanRegenen && (kouMaat && st.temp < 6) ? Math.min(1, st.sneeuw + dt) : Math.max(0, st.sneeuw - dt);
        if (st.neerslag > 0.5) { st.wolk = Math.max(0, st.wolk - dt * 0.18); st.terug = Math.min(1, st.terug + dt * 0.5); st.druppels += dt * 12; }
        else st.terug = Math.max(0, st.terug - dt * 0.2);

        const g = tk.begin();
        lucht(g, { donker: st.neerslag * 0.6 });
        zee(g, { y: 62 });
        land(g, { punten: LAND, kleur: '#86c95a' });
        land(g, { punten: [[138, 44], [152, 30], [160, 28], [160, 46]], kleur: st.temp < 6 ? '#eef3f8' : '#9a9183' });
        tekenZon(g, { x: 24, y: 18, r: 7 + Math.max(0, st.temp) * 0.22 });
        thermometer(g, { x: 150, y: 56, waarde: (st.temp + 2) / 34, hoogte: 24 });
        if (st.damp > 0.05) damp(g, { x: 44, y: 60, h: 10 + st.damp * 26, n: 3 + Math.round(st.damp * 4) });
        if (st.wolk > 0.08) wolk(g, { x: st.wolkX, y: 20, s: 0.5 + st.wolk, kleur: st.neerslag > 0.3 ? '#8e97a8' : '#ffffff' });
        if (st.neerslag > 0.1) regen(g, { x: st.wolkX - 12, y: 28, b: 24, h: st.wolkX > 120 ? 20 : 32, n: Math.round(10 + st.neerslag * 30), sneeuw: st.sneeuw > 0.4 });
        if (st.wind > 2) pijl(g, { van: [66, 10], naar: [66 + st.wind * 0.8, 10], tekst: 'wind' });
        if (st.terug > 0.1) rivier(g, { punten: [[140, 48], [126, 58], [112, 64], [96, 68]], b: 1 + st.terug * 3 });
        label(g, { x: 30, y: 84, tekst: 'Noordzee' });
        label(g, { x: 128, y: 86, tekst: 'het land' });
        void t;
        meter.textContent = `Verdamping: ${Math.round(st.damp * 100)} %  -  wolk: ${Math.round(st.wolk * 100)} %  -  neerslag: ${Math.round(st.neerslag * 100)} %  -  druppels terug in de zee: ${Math.floor(st.druppels)}`;

        // nakijken
        const d = opdracht?.doelwit;
        if (d === 'damp' && st.damp > 0.5) gelukt('Het water verdampt. Kijk hoe de damp opstijgt!');
        if (d === 'wolk' && st.wolk > 0.7) gelukt('Er hangt een wolk boven de zee: de damp is gecondenseerd.');
        if (d === 'regen' && st.neerslag > 0.6 && st.wolkX > 96) gelukt('Het regent op het land!');
        if (d === 'sneeuw' && st.sneeuw > 0.6) gelukt('Op de koude bergtop valt sneeuw.');
        if (d === 'rivier' && st.terug > 0.6) gelukt('De rivier brengt het water terug naar de zee.');
        if (d === 'rond' && st.druppels >= (opdracht.aantal || 30)) gelukt('De kringloop is rond: het water is weer in de zee.');
        if (opdracht?.minTemp && st.temp >= opdracht.minTemp && st.damp > 0.5 && d === 'damp') gelukt('Warm genoeg: het water verdampt snel.');
        if (d === 'damp' && st.temp < 12 && st.damp < 0.1) zeg('Zet de zon warmer: onder 10 graden verdampt er bijna niets.');
      });
      return { stop: () => l.stop() };
    },
  });
}
