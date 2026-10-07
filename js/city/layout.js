// De plattegrond van de stad Klets: vaste, deterministische posities.
// Wereldeenheden: 1 eenheid ~ 1 tegel. x = oost, z = zuid, y = omhoog. Middelpunt = Station Klets.
// Gebruikt door de 3D-stad en door de 2D-terugvalkaart, zodat beide precies hetzelfde tonen.

/** Ringwegen. De eerste ring omsluit het stationsplein, de tweede de Reizigerswijk (huizen van de leerlingen). */
export const RINGEN = [8, 14, 20, 26, 32, 38, 44];
export const PLEIN_R = 7.2;
export const DAL_R = 54;          // rand van de vlakke vallei
export const BERG_R = 56;         // daar beginnen de bergen
export const SPOOR_Z = 0;         // het spoor loopt oost-west door het station
export const SPOOR_HALF = 1.9;    // halve breedte van de spoorstrook (sporen + perrons)
export const LAAN_HOEKEN = [60, 120, 240, 300].map(d => d * Math.PI / 180); // radiale lanen
export const WEG_BREED = 1.5;
export const MIST_MIN = 23;       // straal die altijd vrij is (gidsen, huizen, eerste wijk)
export const MIST_MAX = 54;
export const POORT = { x: 57.5, z: 0 };     // De Poort: de oostelijke tunnel naar de middelbare school
export const TUNNEL_WEST = { x: -57.5, z: 0 };

/** Wijken: elke macht krijgt een taartpunt van 60 graden. Hoek in graden (0 = oost, 90 = zuid). */
export const WIJKEN = [
  { macht: 'Wereld', hoek: 30, naam: 'Kaartenwijk', gebouw: 'Kaartenhuis', gids: 'atlas', hq: 'Kaartenkamer' },
  { macht: 'Taal', hoek: 90, naam: 'Woordenwijk', gebouw: 'Bibliotheek', gids: 'woordje', hq: 'Wachtzaal' },
  { macht: 'Getal', hoek: 150, naam: 'Getallenwijk', gebouw: 'Rekentoren', gids: 'tella', hq: 'Rekenkiosk' },
  { macht: 'Maker', hoek: 210, naam: 'Makerswijk', gebouw: 'Werkhuis', gids: 'byte', hq: 'Werkplaats' },
  { macht: 'Hart', hoek: 270, naam: 'Hartenwijk', gebouw: 'Vredestuin', gids: 'bram', hq: 'Kampvuur' },
  { macht: 'Brein', hoek: 330, naam: 'Breinwijk', gebouw: 'Uitkijktoren', gids: 'kroniek', hq: 'Seinhuis' },
];
export const WIJK = Object.fromEntries(WIJKEN.map(w => [w.macht, w]));

/** Kleuren in de stijl van een heldere bouwsimulatie. */
export const KLEUR = {
  Taal: '#f0a531', Getal: '#ec5f3b', Wereld: '#38b37a', Hart: '#e9578a', Maker: '#3d8fe0', Brein: '#9a68e0',
};

const rad = d => d * Math.PI / 180;
export const polar = (r, a) => ({ x: Math.cos(a) * r, z: Math.sin(a) * r });

/** Draaiing (rond y) zodat de voorkant (+z lokaal) naar het midden of naar buiten kijkt. */
export const naarBinnen = (a) => Math.atan2(-Math.cos(a), -Math.sin(a));
export const naarBuiten = (a) => Math.atan2(Math.cos(a), Math.sin(a));

/** Hoekafstand (radialen, -PI..PI). */
export function hoekVerschil(a, b) { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

// ---------- kavels per wijk ----------
const KAVEL_PITCH = 2.5;
function bandRijen(van, tot) { return [van + 1.65, tot - 1.65]; }

/** Het hoofdkwartier van een gids staat midden in de eerste band van zijn wijk. */
export function hqPositie(w) {
  const a = rad(w.hoek), r = (RINGEN[1] + RINGEN[2]) / 2;
  return { ...polar(r, a), rot: naarBinnen(a), r, a };
}

let _kavels = null;
/** Alle kavels per macht, gesorteerd van binnen naar buiten en vanuit het midden van de wijk. */
export function kavels() {
  if (_kavels) return _kavels;
  _kavels = {};
  for (const w of WIJKEN) {
    const mid = rad(w.hoek), lijst = [];
    for (let b = 1; b < RINGEN.length - 1; b++) {
      for (const rho of bandRijen(RINGEN[b], RINGEN[b + 1])) {
        const bruikbaar = rho * (Math.PI / 3) - 2.8;
        const n = Math.floor(bruikbaar / KAVEL_PITCH);
        for (let i = 0; i < n; i++) {
          const boog = (i - (n - 1) / 2) * KAVEL_PITCH;
          const a = mid + boog / rho;
          if (b === 1 && Math.abs(boog) < 2.3) continue; // plaats voor het hoofdkwartier
          const p = polar(rho, a);
          if (Math.abs(p.z - SPOOR_Z) < SPOOR_HALF + 1.4) continue;
          const binnen = rho < (RINGEN[b] + RINGEN[b + 1]) / 2;
          lijst.push({ ...p, r: rho, a, rot: binnen ? naarBinnen(a) : naarBuiten(a), binnen, boog: Math.abs(boog) });
        }
      }
    }
    lijst.sort((p, q) => p.r - q.r || p.boog - q.boog || p.a - q.a);
    _kavels[w.macht] = lijst;
  }
  return _kavels;
}

let _huizen = null;
/** Kavels voor de huizen van de leerlingen: de Reizigerswijk tussen ring 1 en ring 2. */
export function huisKavels() {
  if (_huizen) return _huizen;
  const lijst = [];
  for (const [rho, binnen] of [[RINGEN[0] + 1.6, true], [RINGEN[1] - 1.6, false]]) {
    const n = Math.floor((2 * Math.PI * rho) / 2.25);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / 2; // begin vooraan (zuid)
      const p = polar(rho, a);
      if (Math.abs(p.z - SPOOR_Z) < SPOOR_HALF + 1.3) continue;
      if (LAAN_HOEKEN.some(l => Math.abs(hoekVerschil(a, l)) * rho < 1.9)) continue;
      lijst.push({ ...p, r: rho, a, rot: binnen ? naarBinnen(a) : naarBuiten(a), voorkant: Math.abs(hoekVerschil(a, Math.PI / 2)) });
    }
  }
  lijst.sort((p, q) => p.voorkant - q.voorkant || p.r - q.r || p.a - q.a);
  _huizen = lijst;
  return lijst;
}

/** Vaste gebouwen op en rond het stationsplein. */
export const PLEIN = {
  station: { x: 0, z: -4.2, rot: 0 },
  klasmeter: { x: 0, z: 4.3 },
  kluis: { x: -4.1, z: 3.9, rot: Math.PI * 0.18 },
  missiebord: { x: 4.1, z: 3.9, rot: -Math.PI * 0.18 },
};

/** Ruimte voor bomen: niet op wegen, kavels, plein of spoor. */
export function isVrijVoorBoom(x, z) {
  const r = Math.hypot(x, z);
  if (r < PLEIN_R + 0.6) return false;
  if (Math.abs(z - SPOOR_Z) < SPOOR_HALF + 0.7 && r < BERG_R + 4) return false;
  for (const R of RINGEN) if (Math.abs(r - R) < WEG_BREED) return false;
  const a = Math.atan2(z, x);
  if (r < RINGEN[RINGEN.length - 1] + 1) for (const l of LAAN_HOEKEN) if (Math.abs(hoekVerschil(a, l)) * r < WEG_BREED) return false;
  return true;
}
