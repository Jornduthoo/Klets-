// Werkbank "echt weer": het weerstation op het Belfort leest het echte weer van Brugge af (Open-Meteo).
// De reiziger leest de waarden af en vult ze in; de app controleert automatisch. Lukt de verbinding niet,
// dan werkt de werkbank met rustig seizoensweer: de vragen blijven dezelfde.
import { h } from '../core/util.js';
import { huidigWeer, weerTekst, windstreek } from '../city/weer.js';

const VRAGEN = [
  { id: 'wd-temp', vraag: 'Hoeveel graden is het nu in Brugge? (rond af op een heel getal)', eenheid: 'graden', waarde: w => Math.round(w.temp), marge: 1, doelen: ['4.3.GL4.12'] },
  { id: 'wd-wind', vraag: 'Hoe hard waait het? (km per uur, rond af)', eenheid: 'km/u', waarde: w => Math.round(w.wind), marge: 2, doelen: ['4.2.GL4.14'] },
  { id: 'wd-neerslag', vraag: 'Hoeveel neerslag valt er nu? (mm, 0 als het droog is)', eenheid: 'mm', waarde: w => Math.round((w.neerslag || 0) * 10) / 10, marge: 0.3, doelen: ['4.3.GL4.11'] },
  { id: 'wd-wolken', vraag: 'Hoeveel procent van de lucht is bewolkt?', eenheid: '%', waarde: w => Math.round(w.wolken), marge: 6, doelen: ['4.2.GL4.14'] },
];

/** Werkbank met het echte weer. onKlaar(resultaten) krijgt resultaten zoals een oefening. */
export function maakWeerdata({ onKlaar } = {}) {
  const uit = h('div', { class: 'weerdata' }, h('p', { class: 'tip' }, 'De instrumenten worden uitgelezen ...'));
  const el = h('div', { class: 'werkbank weerstation' }, h('h3', {}, 'Het echte weer van Brugge'), uit);
  const resultaten = [];

  (async () => {
    const w = await huidigWeer();
    uit.innerHTML = '';
    const tabel = h('table', { class: 'weertabel' },
      h('tbody', {},
        rij('Temperatuur', `${Math.round(w.temp * 10) / 10} graden`),
        rij('Wind', `${Math.round(w.wind)} km/u uit ${windstreek(w.richting)}`),
        rij('Neerslag', `${w.neerslag ?? 0} mm`),
        rij('Bewolking', `${Math.round(w.wolken)} %`),
        rij('Weer', w.tekst || ''),
        rij('Seizoen', w.seizoen),
        rij('Bron', w.bron === 'open-meteo' || w.bron === 'cache' ? 'echte meting (Open-Meteo, Brugge)' : w.bron === 'test' ? 'testweer' : 'rustig seizoensweer (geen verbinding)')));
    const velden = VRAGEN.map(v => {
      const inp = h('input', { type: 'text', class: 'invoer getal', size: 6, 'aria-label': v.vraag });
      return { v, inp, regel: h('label', { class: 'sim-regel' }, h('span', {}, v.vraag), inp, h('span', { class: 'na' }, v.eenheid)) };
    });
    const fb = h('p', { class: 'sim-melding', 'aria-live': 'polite' });
    const knop = h('button', {
      type: 'button', class: 'btn primair', onclick: () => {
        resultaten.length = 0;
        let goed = 0;
        for (const { v, inp } of velden) {
          const x = parseFloat(String(inp.value || '').replace(',', '.'));
          const juist = v.waarde(w);
          const ok = isFinite(x) && Math.abs(x - juist) <= v.marge;
          if (ok) goed++;
          inp.classList.toggle('goed', ok); inp.classList.toggle('mis', !ok);
          if (!ok) inp.title = 'Juist: ' + juist;
          resultaten.push({ id: v.id, goals: v.doelen, goed: ok ? 1 : 0, totaal: 1, type: 'weerdata', antwoord: inp.value });
        }
        fb.className = 'sim-melding ' + (goed === velden.length ? 'goed' : 'mis');
        fb.textContent = `${goed} van de ${velden.length} juist afgelezen.` + (goed < velden.length ? ' Kijk nog eens naar de tabel.' : '');
        onKlaar?.(resultaten);
      },
    }, 'Controleer mijn metingen');
    uit.append(h('p', {}, weerTekst(w)), tabel, h('p', { class: 'tip' }, 'Lees de instrumenten af en vul in.'), ...velden.map(f => f.regel), knop, fb);
  })();

  function rij(a, b) { return h('tr', {}, h('th', {}, a), h('td', {}, b)); }
  return { el, stop() {}, resultaten };
}
