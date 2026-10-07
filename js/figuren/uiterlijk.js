// Het uiterlijk van een reiziger: keuzes bij het aanmelden en de kleuren die de 3D-figuur, het portret
// en het huis in de stad gebruiken. Geen three.js nodig.

export const AVATAR_OPTIES = {
  huid: ['#f6d3b3', '#e8b48c', '#c98d5e', '#a86b42', '#7d4a2b', '#5a341f'],
  haar: ['kort', 'krul', 'lang', 'staart', 'hoofddoek', 'pet', 'kaal'],
  haarKleur: ['#1d1514', '#4a2e1c', '#8a5a2b', '#d2a24c', '#a33b2a', '#6d6d78'],
  kleren: ['#e2643e', '#e9a23b', '#3fa37a', '#4c8fd6', '#9a6ad6', '#d9577b', '#2f3e5a', '#e8e2d0'],
  broek: ['#2f3e5a', '#4a3a2e', '#3d5a3d', '#5b5b66'],
};
export const HAAR_NAAM = { kort: 'Kort', krul: 'Krullen', lang: 'Lang', staart: 'Staart', hoofddoek: 'Hoofddoek', pet: 'Pet', kaal: 'Kaal' };
export const DEFAULT_LOOK = { huid: 2, haar: 'kort', haarKleur: 0, kleren: 3, broek: 0, uitrusting: {} };

/** Kleuren van een figuur, met de jaskleur uit de codekluis als die gekozen is. */
export function kleurenVan(look = DEFAULT_LOOK) {
  const O = AVATAR_OPTIES, uit = look.uitrusting || {};
  let jas = O.kleren[look.kleren] ?? O.kleren[3];
  if (uit.kleur === 'kleur-goud') jas = '#e8c040';
  if (uit.kleur === 'kleur-nacht') jas = '#2b3a78';
  return {
    huid: O.huid[look.huid] ?? O.huid[2],
    haar: O.haarKleur[look.haarKleur] ?? O.haarKleur[0],
    jas, broek: O.broek[look.broek] ?? O.broek[0],
    stijl: look.haar || 'kort', uit,
  };
}

function hexNaarHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslNaarHex(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return '#' + [f(0), f(8), f(4)].map(v => v.toString(16).padStart(2, '0')).join('');
}
/**
 * Dakkleur van het huis: de kleur van de jas, maar altijd licht en vrolijk genoeg om in de stad op te vallen
 * (een donkerblauwe jas geeft een middenblauw dak, nooit een zwart dak).
 */
export function dakKleur(jas) {
  const [h, s, l] = hexNaarHsl(jas);
  return hslNaarHex(h, s < 0.08 ? s : Math.max(0.42, Math.min(0.8, s)), Math.max(0.58, Math.min(0.7, l)));
}
