// De zeven thema's van Vagant (wereldoriëntatie: techniek, geschiedenis, aardrijkskunde, wetenschap en
// socio-emotioneel). Elk thema duurt vijf weken en heeft een eigen stad. De inhoud van een thema staat in
// een eigen bestand (data/thema-<id>.js); hier enkel de lijst. Thema's zonder inhoud tonen "binnenkort".
import { WATERWERELD } from './thema-waterwereld.js';

export const THEMAS = [
  { id: 'waterwereld', nr: 1, naam: 'Waterwereld', stad: 'Zwinvliet', kleur: '#2f8fd6', data: WATERWERELD },
  { id: 'energie', nr: 2, naam: 'Energie en Machines', stad: 'Raderburg', kleur: '#e9a23b', data: null },
  { id: 'reizen', nr: 3, naam: 'Reizen en Grenzen', stad: 'Windroos', kleur: '#38b37a', data: null },
  { id: 'brein', nr: 4, naam: 'Het Brein en het Beest', stad: 'Hartwoud', kleur: '#9a68e0', data: null },
  { id: 'bouwplaats', nr: 5, naam: 'De Bouwplaats', stad: 'Torenwerf', kleur: '#d9784a', data: null },
  { id: 'signalen', nr: 6, naam: 'Signalen en Schermen', stad: 'Echostad', kleur: '#3d8fe0', data: null },
  { id: 'stemmen', nr: 7, naam: 'De Stemmenparade', stad: 'Vrijmarkt', kleur: '#e9578a', data: null },
];
export const THEMA = Object.fromEntries(THEMAS.map(t => [t.id, t]));

/** Het thema met inhoud dat hoort bij deze instellingen (valt terug op Waterwereld). */
export function themaVoor(settings) {
  const t = THEMA[settings?.huidigThema];
  return (t && t.data) ? t.data : WATERWERELD;
}
/** Alle doelen van alle thema's met inhoud (gebouwen van vroegere thema's blijven staan). */
export function alleDoelen() {
  const d = {};
  for (const t of THEMAS) if (t.data) Object.assign(d, t.data.doelen);
  return d;
}
