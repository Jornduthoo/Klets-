// Proefopstelling sluis: programmeer de sluis met blokken (een lineair algoritme). Zet de stappen in de
// juiste volgorde en laat het programma lopen. Loopt het mis, dan zegt de sluis waar het fout gaat:
// debuggen. In de debug-opdrachten start je met een programma waar fouten in zitten.
import { h } from '../../core/util.js';
import { maakCanvas, Tekenaar, sluis as tekenSluis, label } from '../tekenen.js';
import { simKader, knop, lus } from './basis.js';

const BLOKKEN = [
  { id: 'open-zee', tekst: 'open de zeedeur' },
  { id: 'sluit-zee', tekst: 'sluit de zeedeur' },
  { id: 'open-kanaal', tekst: 'open de kanaaldeur' },
  { id: 'sluit-kanaal', tekst: 'sluit de kanaaldeur' },
  { id: 'vul', tekst: 'vul de kolk' },
  { id: 'leeg', tekst: 'laat de kolk leeglopen' },
  { id: 'vaar-in', tekst: 'laat de boot binnenvaren' },
  { id: 'vaar-uit', tekst: 'laat de boot uitvaren' },
];
const JUIST = {
  // van de zee (laag) naar het kanaal (hoog)
  'zee>kanaal': ['open-zee', 'vaar-in', 'sluit-zee', 'vul', 'open-kanaal', 'vaar-uit'],
  'kanaal>zee': ['open-kanaal', 'vaar-in', 'sluit-kanaal', 'leeg', 'open-zee', 'vaar-uit'],
};
const FOUT = {
  1: ['open-zee', 'vaar-in', 'vul', 'sluit-zee', 'open-kanaal', 'vaar-uit'],
  2: ['open-zee', 'vul', 'vaar-in', 'open-kanaal', 'sluit-zee', 'vaar-uit'],
};

export function maakSim(ctx) {
  return simKader({
    naam: 'Programmeer de sluis', opdrachten: ctx.opdrachten, onKlaar: ctx.onKlaar,
    maker: (host, { opdracht, gelukt, mislukt, zeg }) => {
      const canvas = maakCanvas(680);
      const tk = new Tekenaar(canvas);
      const van = opdracht?.van || 'zee', naar = opdracht?.naar || 'kanaal';
      const heen = opdracht?.heenEnTerug;
      const sleutel = `${van}>${naar}`;
      const juist = heen ? [...JUIST['zee>kanaal'], ...JUIST['kanaal>zee']] : (JUIST[sleutel] || JUIST['zee>kanaal']);
      let programma = opdracht?.debug ? [...(FOUT[opdracht.fouten || 1] || FOUT[1])] : [];
      const st = { zee: 0.22, kanaal: 0.82, binnen: 0.22, deurZee: 0, deurKanaal: 0, boot: 0, loopt: false, stap: 0, wacht: 0, fase: 0 };

      const lijst = h('ol', { class: 'blok-lijst' });
      const bank = h('div', { class: 'sim-knoppen' }, ...BLOKKEN.map(b => knop(b.tekst, () => { if (programma.length < 12) { programma.push(b.id); toon(); } }, 'btn klein blokje')));
      const start = knop('Start het programma', () => loop(), 'btn primair');
      const wis = knop('Wis', () => { programma = []; reset(); toon(); }, 'btn klein zacht');
      const uitleg = h('p', { class: 'tip' }, opdracht?.debug
        ? 'In dit programma zitten fouten. Sleep de stappen met de pijltjes of wis en bouw het opnieuw.'
        : 'Klik de blokken in de juiste volgorde en start het programma.');
      host.append(canvas, uitleg, lijst, bank, h('div', { class: 'sim-knoppen' }, start, wis));

      function toon() {
        lijst.innerHTML = '';
        programma.forEach((id, i) => {
          const b = BLOKKEN.find(x => x.id === id);
          lijst.append(h('li', { class: 'blok' + (st.loopt && i === st.stap ? ' nu' : '') }, h('span', {}, b?.tekst || id),
            knop('^', () => { if (i > 0) { [programma[i - 1], programma[i]] = [programma[i], programma[i - 1]]; toon(); } }, 'mini'),
            knop('v', () => { if (i < programma.length - 1) { [programma[i + 1], programma[i]] = [programma[i], programma[i + 1]]; toon(); } }, 'mini'),
            knop('x', () => { programma.splice(i, 1); toon(); }, 'mini')));
        });
        if (!programma.length) lijst.append(h('li', { class: 'leeg' }, 'Nog geen stappen.'));
      }
      function reset() {
        st.binnen = van === 'zee' ? st.zee : st.kanaal;
        st.deurZee = 0; st.deurKanaal = 0; st.boot = van === 'zee' ? 0 : 1; st.loopt = false; st.stap = 0; st.fase = 0;
      }
      function loop() {
        if (!programma.length) { mislukt('Zet eerst stappen in je programma.'); return; }
        if (opdracht?.max && programma.length > opdracht.max) { mislukt(`Het mag met ${opdracht.max} blokken. Nu gebruik je er ${programma.length}.`); return; }
        reset(); st.loopt = true; st.wacht = 0; toon();
      }
      function fout(i, tekst) { st.loopt = false; mislukt(`Stap ${i + 1} (${BLOKKEN.find(b => b.id === programma[i])?.tekst}): ${tekst}`); toon(); }

      function doeStap() {
        const id = programma[st.stap];
        const gelijkZee = Math.abs(st.binnen - st.zee) < 0.02, gelijkKanaal = Math.abs(st.binnen - st.kanaal) < 0.02;
        if (id === 'open-zee') { if (!gelijkZee) return fout(st.stap, 'het water in de kolk staat niet gelijk met de zee, de deur kan niet open.'); st.deurZee = 1; }
        else if (id === 'sluit-zee') st.deurZee = 0;
        else if (id === 'open-kanaal') { if (!gelijkKanaal) return fout(st.stap, 'het water in de kolk staat niet gelijk met het kanaal.'); st.deurKanaal = 1; }
        else if (id === 'sluit-kanaal') st.deurKanaal = 0;
        else if (id === 'vul') { if (st.deurZee || st.deurKanaal) return fout(st.stap, 'eerst de deuren sluiten, anders loopt de zee mee leeg.'); st.binnen = st.kanaal; }
        else if (id === 'leeg') { if (st.deurZee || st.deurKanaal) return fout(st.stap, 'eerst de deuren sluiten.'); st.binnen = st.zee; }
        else if (id === 'vaar-in') { const kant = st.boot < 0.5 ? 'zee' : 'kanaal'; if ((kant === 'zee' && !st.deurZee) || (kant === 'kanaal' && !st.deurKanaal)) return fout(st.stap, 'de deur aan die kant staat dicht.'); st.boot = 0.5; }
        else if (id === 'vaar-uit') { if (!st.deurZee && !st.deurKanaal) return fout(st.stap, 'er staat geen deur open.'); st.boot = st.deurKanaal ? 1 : 0; }
        st.stap++;
        toon();
        if (st.stap >= programma.length) {
          st.loopt = false;
          const klaarOp = heen ? (st.boot === 0) : (naar === 'kanaal' ? st.boot === 1 : st.boot === 0);
          const zelfdeAlsJuist = programma.length === juist.length && programma.every((x, i) => x === juist[i]);
          if (klaarOp || zelfdeAlsJuist) gelukt('De boot is door de sluis. Dat is een algoritme!');
          else mislukt('Het programma liep af, maar de boot staat niet aan de andere kant.');
        }
      }

      const l = lus((dt, t) => {
        if (st.loopt) { st.wacht -= dt; if (st.wacht <= 0) { st.wacht = 1.0; doeStap(); } }
        const g = tk.begin();
        g.fillStyle = '#dfeaf4'; g.fillRect(0, 0, 160, 90);
        tekenSluis(g, { x: 80, y: 66, s: 1.5, binnen: st.binnen, deurL: st.deurZee, deurR: st.deurKanaal, zee: st.zee, kanaal: st.kanaal, boot: st.boot });
        label(g, { x: 18, y: 20, tekst: 'zee' });
        label(g, { x: 142, y: 20, tekst: 'kanaal' });
        label(g, { x: 80, y: 12, tekst: st.loopt ? `stap ${st.stap + 1} van ${programma.length}` : 'de sluis wacht' });
        void t;
      });
      reset(); toon();
      zeg(opdracht?.debug ? 'Zoek de fout en zet de stappen juist.' : '');
      return { stop: () => l.stop() };
    },
  });
}
