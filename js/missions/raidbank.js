// Vragenbank voor een raid (de eindbaas van een thema, bv. de Slijkkraak in Waterwereld). De vragen komen
// uit het thema zelf: thema.eindbaas.raid.vragen.kompas / .telescoop. Een raid mag nooit zonder vragen
// vallen, dus de bank blijft doorschuiven: na de laatste vraag begint ze opnieuw, met een andere volgorde.
import { rng } from '../core/util.js';
import { themaVoor } from '../../data/themas.js';

/** Alle raidvragen van een thema voor een route. */
export function raidVragen(route = 'kompas', thema = themaVoor()) {
  const v = thema?.eindbaas?.raid?.vragen || {};
  return v[route]?.length ? v[route] : (v.kompas || []);
}

/**
 * Maak een raidvraag. De n-de vraag van deze reiziger, met een eigen volgorde per reiziger
 * (zo zegt niemand luidop het antwoord van de vraag van zijn buur).
 */
export function raidItem(route, rand, n = 0, thema = themaVoor()) {
  const lijst = raidVragen(route, thema);
  if (!lijst.length) return { id: 'raid-leeg-' + n, type: 'keuze', vraag: 'Deze eindbaas heeft nog geen vragen.', opties: ['ok'], juist: 0, goals: [] };
  const ronde = Math.floor(n / lijst.length);
  const orde = ordeVoor(lijst.length, rand, ronde);
  const item = lijst[orde[n % lijst.length]];
  return { ...item, id: `${item.id}-r${n}` };
}

const ORDES = new Map();
function ordeVoor(len, rand, ronde) {
  const key = len + ':' + ronde;
  if (ORDES.has(key)) return ORDES.get(key);
  const idx = Array.from({ length: len }, (_, i) => i);
  for (let i = len - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  ORDES.set(key, idx);
  return idx;
}

/** Een vaste reeks raidvragen (voor het digibord of een voorbeeld). */
export function raidSet(route, seed, n, thema = themaVoor()) {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => raidItem(route, r, i, thema));
}
