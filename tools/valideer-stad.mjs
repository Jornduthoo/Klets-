// Controleer de plattegrond van Zwinvliet zonder browser: node tools/valideer-stad.mjs
// Faalt (exitcode 1) als een weg, kavel, gebouw of het spoor fout ligt: kavels op asfalt of in het water,
// wegen door het water zonder brug, het spoor over de Markt, het Minnewater of een rei, ... (zie js/city/wegen.js: valideerStad),
// of een boot die door een brug of een kaaimuur steekt (zie js/city/vaart.js: controleerVaart).
import { valideerStad, bruggen } from '../js/city/wegen.js';
import { waterhuizen } from '../js/city/layout.js';

import { controleerVaart, BOOT_MATEN, BYTE_ROUTE } from '../js/city/vaart.js';

const v = valideerStad({ maat: { doel: [2.5, 2.5] } });
console.log(`kavels: ${JSON.stringify(v.aantal)}`);
console.log(`bruggen: ${bruggen().length}, huizen aan het water: ${waterhuizen().length}`);

// de boten: elke vaarroute bemonsterd (elke 10 cm, de romp als raster): nooit door een brug, nooit in een kaaimuur
const vaart = controleerVaart();
console.log(`vaarroutes: ${vaart.monsters} posities, ${vaart.onder} keer onder een brug, kleinste vrije hoogte ${(vaart.minVrij * 100).toFixed(1)} cm`);
for (const f of vaart.fouten) v.fouten.push('vaart: ' + f);
// en de boten zelf zijn niet groter dan hun maten (three.js werkt ook in node: enkel geometrie)
try {
  const { bootGeo } = await import('../js/city/brugge.js');
  for (const [soort, m] of Object.entries(BOOT_MATEN)) {
    const geo = bootGeo(soort === 'byte-zeil' ? 'zeil' : soort).body; geo.computeBoundingBox();
    const b = geo.boundingBox, k = soort === 'byte-zeil' ? 0.7 : 1;
    const hoog = b.max.y * k, breed = 2 * Math.max(-b.min.x, b.max.x) * k, lang = 2 * Math.max(-b.min.z, b.max.z) * k;
    if (hoog > m.hoog + 1e-3 || breed > m.breed + 1e-3 || lang > m.lang + 1e-3) v.fouten.push(`boot ${soort} is groter dan zijn maten: ${breed.toFixed(2)} x ${lang.toFixed(2)} x ${hoog.toFixed(2)} (mag ${m.breed} x ${m.lang} x ${m.hoog})`);
  }
} catch (e) { v.fouten.push('bootmaten niet te controleren: ' + e.message); }
void BYTE_ROUTE;
if (!v.fouten.length) { console.log('De stad is in orde.'); process.exit(0); }
console.log(`${v.fouten.length} fouten:`);
for (const f of v.fouten.slice(0, 50)) console.log(' - ' + f);
process.exit(1);
