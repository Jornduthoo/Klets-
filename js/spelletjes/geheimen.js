// De drie geheimen van Zwinvliet: kleine, verstopte figuurtjes in de 3D-stad (js/city/geheimen3d.js).
// Wie er een vindt en aanklikt, mag een kort spelletje spelen in de stijl van de stad. Per reiziger bewaren we
// welke geheimen gevonden zijn en de beste score per spel (in het reizigersobject, via de store):
//   pupil.geheimen = { gevonden: ['kat', ...], best: { klokken: 7, ... } }
// Beloning: geen XP. Wie alle drie vindt, krijgt een jaskleur voor de reiziger (uitrusting 'kleur-speurneus').
import { REIENRACE } from './reienrace.js';
import { KLOKKENSPEL } from './klokken.js';
import { VISSPEL } from './visser.js';

export const SPELLEN = { reienrace: REIENRACE, klokken: KLOKKENSPEL, visser: VISSPEL };
export const GEHEIMEN = [
  { id: 'kat', naam: 'De zwarte kat van het Belfort', spel: 'klokken', hint: 'Iemand zit graag hoog op een dak bij de Markt.' },
  { id: 'kikker', naam: 'De gouden kikker onder de brug', spel: 'reienrace', hint: 'Bij een brug over een rei glinstert iets.' },
  { id: 'rat', naam: 'Rat Remi aan de stadsmuur', spel: 'visser', hint: 'Iemand zit te vissen aan de stadsmuur, vlak bij een poort.' },
];
export const BELONING = 'kleur-speurneus';

/** De geheimen van een reiziger (altijd een geldig object). */
export function geheimenVan(p) {
  const g = p?.geheimen || {};
  return { gevonden: Array.isArray(g.gevonden) ? g.gevonden.filter(id => GEHEIMEN.some(x => x.id === id)) : [], best: { ...(g.best || {}) } };
}
/** Twee versies samenvoegen (bv. bij het importeren van een ander toestel). */
export function voegGeheimenSamen(a, b) {
  const x = geheimenVan({ geheimen: a }), y = geheimenVan({ geheimen: b });
  const best = { ...x.best };
  for (const [k, v] of Object.entries(y.best)) best[k] = Math.max(best[k] || 0, v || 0);
  return { gevonden: [...new Set([...x.gevonden, ...y.gevonden])], best };
}
