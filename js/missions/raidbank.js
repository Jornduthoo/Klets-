// Vragenbank voor de raid 'Mist-golem' (week 1, vrijdag). Vragen worden gegenereerd, dus nooit op.
import { rng, gcd, fmtNum } from '../core/util.js';

const GROOTTE = [
  ['Hoeveel leerlingen telt een grote basisschool?', ['40', '400', '4 000', '40 000'], 1],
  ['Hoeveel mensen passen in een groot voetbalstadion?', ['500', '5 000', '50 000', '5 000 000'], 2],
  ['Hoeveel mensen wonen er in Belgie?', ['ongeveer 1 miljoen', 'ongeveer 12 miljoen', 'ongeveer 120 miljoen', 'ongeveer 1 miljard'], 1],
  ['Hoeveel sterren zie je op een heldere nacht zonder lampen?', ['ongeveer 30', 'ongeveer 3 000', 'ongeveer 3 miljoen', 'ongeveer 3 miljard'], 1],
  ['Hoeveel woorden staan er in een dik woordenboek?', ['ongeveer 100', 'ongeveer 1 000', 'ongeveer 100 000', 'ongeveer 100 miljard'], 2],
  ['Hoeveel minuten zitten er in een jaar?', ['ongeveer 5 000', 'ongeveer 50 000', 'ongeveer 500 000', 'ongeveer 5 000 000'], 2],
  ['Hoeveel stappen zet je op een dag?', ['ongeveer 100', 'ongeveer 10 000', 'ongeveer 1 miljoen', 'ongeveer 1 miljard'], 1],
];

/** Maak een raidvraag voor een route. */
export function raidItem(route, rand, n = 0) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const id = `raid-${route}-${n}-${Math.floor(rand() * 1e6)}`;
  if (route === 'telescoop') {
    const kind = pick(['breuk', 'breuk', 'procent', 'grootte']);
    if (kind === 'breuk') {
      const t = 1 + Math.floor(rand() * 8), nn = t + 1 + Math.floor(rand() * 9), f = 2 + Math.floor(rand() * 6);
      const g = gcd(t, nn);
      return { id, type: 'getal', breuk: true, kleinsteVorm: true, vraag: `Maak de breuk zo klein mogelijk: ${t * f}/${nn * f}`, antwoord: `${t / g}/${nn / g}`, goals: ['2.1.GL6.46'] };
    }
    if (kind === 'procent') {
      const p = pick([10, 20, 25, 40, 50, 60, 75, 80]); const g = gcd(p, 100);
      return { id, type: 'getal', breuk: true, kleinsteVorm: true, vraag: `Schrijf ${p} % als breuk, zo klein mogelijk.`, antwoord: `${p / g}/${100 / g}`, goals: ['2.1.GL6.46'] };
    }
    const [vraag, opties, juist] = pick(GROOTTE);
    return { id, type: 'keuze', vraag, opties, juist, vast: true, goals: ['2.1.GL6.19'] };
  }
  // kompas (en taalsleutels)
  const kind = pick(['terug', 'thermo', 'groot', 'tussen']);
  if (kind === 'terug') {
    const stap = pick([1, 2]); const start = pick([4, 3, 2, 1, 0]);
    const rij = [start, start - stap, start - 2 * stap];
    return { id, type: 'getal', vraag: `Tel terug: ${rij.join(', ')}, ...`, antwoord: start - 3 * stap, goals: ['2.1.GL4.24'] };
  }
  if (kind === 'thermo') {
    const t = 1 + Math.floor(rand() * 5), d = t + 1 + Math.floor(rand() * 5);
    return { id, type: 'getal', vraag: `Het is ${t} graden. Het wordt ${d} graden kouder. Hoeveel graden is het nu?`, antwoord: t - d, eenheid: 'graden', goals: ['2.1.GL4.24'] };
  }
  if (kind === 'groot') {
    const base = 1000 + Math.floor(rand() * 8000);
    const opts = [base, base + 90, base + 900, base + 9].map(v => Math.min(9999, v));
    const max = Math.max(...opts);
    return { id, type: 'keuze', vraag: 'Welk getal is het grootst?', opties: opts.map(fmtNum), juist: opts.indexOf(max), goals: ['2.1.GL4.12'] };
  }
  const h = 1 + Math.floor(rand() * 8);
  const lo = h * 1000 + 500;
  const goed = lo + 10 + Math.floor(rand() * 80);
  return { id, type: 'keuze', vraag: `Welk getal ligt tussen ${fmtNum(lo)} en ${fmtNum(lo + 100)}?`, opties: [fmtNum(goed), fmtNum(lo - 50), fmtNum(lo + 150), fmtNum(lo + 1000)], juist: 0, goals: ['2.1.GL4.12'] };
}

export function raidSet(route, seed, n) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => raidItem(route, r, i));
}
