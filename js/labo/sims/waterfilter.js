// Proefopstelling waterfilter: bouw een filter met lagen van grof naar fijn en giet er modderwater uit de
// rei door. De filter meet hoe helder het water wordt. Je kan ook twee filters vergelijken: verander dan
// telkens maar één laag, anders weet je niet wat het verschil maakte (eerlijk onderzoeken).
import { h } from '../../core/util.js';
import { maakCanvas, Tekenaar, filter as tekenFilter, glas, label, pijl } from '../tekenen.js';
import { simKader, knop, lus } from './basis.js';

// per laag: hoeveel vuil ze tegenhoudt, en hoe grof ze is (grof hoort bovenaan)
const LAGEN = {
  grind: { grof: 4, houdt: 0.25 },
  zand: { grof: 3, houdt: 0.35 },
  houtskool: { grof: 2, houdt: 0.3 },
  watten: { grof: 1, houdt: 0.2 },
  doek: { grof: 1, houdt: 0.15 },
};

export function maakSim(ctx) {
  return simKader({
    naam: 'Bouw een waterfilter', opdrachten: ctx.opdrachten, onKlaar: ctx.onKlaar,
    maker: (host, { opdracht, gelukt, mislukt, zeg }) => {
      const canvas = maakCanvas(680);
      const tk = new Tekenaar(canvas);
      let lagen = [], gegoten = false, helderheid = 0, vorige = null, vergeleken = 0;
      const info = h('p', { class: 'sim-meter' });
      const bank = h('div', { class: 'sim-knoppen' }, ...Object.keys(LAGEN).map(l => knop('+ ' + l, () => { if (lagen.length < 5) { lagen.push(l); gegoten = false; na(); } }, 'btn klein')));
      const giet = knop('Giet het modderwater erdoor', () => { if (!lagen.length) { mislukt('Bouw eerst een filter.'); return; } gegoten = true; meet(); }, 'btn primair');
      const wis = knop('Begin opnieuw', () => { lagen = []; gegoten = false; helderheid = 0; na(); }, 'btn klein zacht');
      host.append(canvas, h('p', { class: 'tip' }, 'Leg de lagen van boven (grof) naar onder (fijn).'), bank, h('div', { class: 'sim-knoppen' }, giet, wis), info);

      function meet() {
        let houdt = 0, vorigeGrof = 9, straf = 0;
        for (const l of lagen) {
          const L = LAGEN[l];
          if (L.grof > vorigeGrof) straf += 0.12;       // een grove laag onder een fijne: de fijne slibt dicht
          vorigeGrof = L.grof;
          houdt += L.houdt;
        }
        const soorten = new Set(lagen).size;
        helderheid = Math.max(0, Math.min(1, houdt * (0.75 + soorten * 0.08) - straf));
        na();
      }
      function na() {
        const o = opdracht || {};
        const pct = Math.round(helderheid * 100);
        info.textContent = lagen.length ? `Filter: ${lagen.join(' - ')}${gegoten ? ` - helderheid: ${pct} %` : ''}` : 'Nog geen lagen.';
        if (!gegoten) return;
        if (o.lagen && lagen.length >= o.lagen && pct > 40) return gelukt(`Een filter met ${lagen.length} lagen: het water is ${pct} % helder.`);
        if (o.helder && pct >= o.helder) return gelukt(`${pct} % helder! Let op: helder is nog niet drinkbaar.`);
        if (o.vergelijk) {
          if (vorige) {
            const verschil = lagen.filter((l, i) => vorige.lagen[i] !== l).length + Math.abs(lagen.length - vorige.lagen.length);
            if (verschil === 1) { vergeleken++; zeg(`Eerlijk vergeleken: je veranderde maar één laag (${vorige.pct} % tegenover ${pct} %).`); if (vergeleken >= 1) return gelukt('Zo weet je zeker welke laag het verschil maakte.'); }
            else mislukt(`Je veranderde ${verschil} dingen tegelijk. Verander er maar één.`);
          } else zeg('Goed. Verander nu één laag en giet opnieuw.');
          vorige = { lagen: [...lagen], pct };
        }
        if (pct < 30) zeg('Nog te vuil. Voeg een fijnere laag toe of leg ze in een betere volgorde.');
      }

      const l = lus((dt, t) => {
        const g = tk.begin();
        g.fillStyle = '#eef3f8'; g.fillRect(0, 0, 160, 90);
        g.fillStyle = '#d7dee8'; g.fillRect(0, 76, 160, 14);
        glas(g, { x: 24, y: 40, b: 18, h: 26, vloeistof: 'modder' });
        label(g, { x: 24, y: 58, tekst: 'modderwater' });
        pijl(g, { van: [36, 34], naar: [56, 30] });
        tekenFilter(g, { x: 74, y: 44, lagen, b: 22, h: 40 });
        glas(g, { x: 128, y: 62, b: 18, h: 22, vloeistof: gegoten && helderheid > 0.55 ? 'water' : gegoten ? 'modder' : 'water', vulling: gegoten ? 0.6 : 0.05 });
        label(g, { x: 128, y: 80, tekst: gegoten ? `${Math.round(helderheid * 100)} % helder` : 'leeg glas' });
        if (gegoten) { g.fillStyle = helderheid > 0.55 ? '#7cc7ea' : '#8a7b4e'; for (let i = 0; i < 4; i++) { const y = 66 + ((t * 20 + i * 5) % 14); g.beginPath(); g.arc(74, y, 0.8, 0, Math.PI * 2); g.fill(); } }
        void dt;
      });
      na();
      return { stop: () => l.stop() };
    },
  });
}
