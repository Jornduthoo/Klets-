// Controleer de plattegrond van Zwinvliet zonder browser: node tools/valideer-stad.mjs
// Faalt (exitcode 1) als een weg, kavel, gebouw of het spoor fout ligt: kavels op asfalt of in het water,
// wegen door het water zonder brug, het spoor over de Markt, het Minnewater of een rei, ... (zie js/city/wegen.js: valideerStad).
import { valideerStad, bruggen } from '../js/city/wegen.js';
import { waterhuizen } from '../js/city/layout.js';

const v = valideerStad({ maat: { doel: [2.5, 2.5] } });
console.log(`kavels: ${JSON.stringify(v.aantal)}`);
console.log(`bruggen: ${bruggen().length}, huizen aan het water: ${waterhuizen().length}`);
if (v.ok) { console.log('De stad is in orde.'); process.exit(0); }
console.log(`${v.fouten.length} fouten:`);
for (const f of v.fouten.slice(0, 50)) console.log(' - ' + f);
process.exit(1);
