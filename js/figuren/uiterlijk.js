// Het uiterlijk van een reiziger: alle keuzes van de avatarmaker en de kleuren die de 3D-figuur, het
// portret en het huis in de stad gebruiken. Geen three.js nodig.
//
// Een 'look' ziet er zo uit (alles optioneel; oude looks blijven werken):
//   { huid, gezicht, ogen, wenkbrauwen, mond, haar, haarKleur, boven, kleren, onder, broek,
//     schoenen, schoenKleur, bril, oorbellen, hoed, tas, uitrusting: { hoofd, gezicht, nek, jas, voeten, hand, rug, spoor, kleur } }
// De getallen zijn indexen in de lijsten hieronder; haar, boven, onder ... zijn namen.

export const AVATAR_OPTIES = {
  huid: ['#fbe0c4', '#f6d3b3', '#e8b48c', '#d79a6a', '#c98d5e', '#a86b42', '#7d4a2b', '#5a341f'],
  gezicht: ['rond', 'ovaal', 'hart', 'hoekig'],
  ogen: ['rond', 'amandel', 'lach', 'groot', 'wimpers'],
  wenkbrauwen: ['zacht', 'recht', 'boog', 'dik'],
  mond: ['glimlach', 'brede lach', 'rustig', 'tanden'],
  haar: ['kort', 'krul', 'afro', 'lang', 'staart', 'staartjes', 'knot', 'vlechten', 'stekels', 'zijscheiding', 'bob', 'kaal', 'hoofddoek', 'hoofddoek-sport', 'tulband', 'kufi', 'pet'],
  haarKleur: ['#1d1514', '#2f2320', '#4a2e1c', '#8a5a2b', '#c98a3e', '#d2a24c', '#a33b2a', '#6d6d78', '#e8e4da', '#5a3fa8'],
  boven: ['jas', 'trui', 'hoodie', 'tshirt', 'jurk'],
  kleren: ['#e2643e', '#e9a23b', '#3fa37a', '#4c8fd6', '#9a6ad6', '#d9577b', '#2f3e5a', '#e8e2d0', '#f2c94c', '#2f6f4a', '#7a4a34', '#38b3b3'],
  onder: ['broek', 'korte broek', 'rok', 'legging'],
  broek: ['#2f3e5a', '#4a3a2e', '#3d5a3d', '#5b5b66', '#8a5a2b', '#6b3f6b', '#2b2b33', '#c9b89a'],
  schoenen: ['sneakers', 'laarzen', 'sandalen'],
  schoenKleur: ['#3a3446', '#e8e4da', '#a33b2a', '#2f6f9f', '#8a5a2b'],
  bril: ['geen', 'rond', 'vierkant', 'zonnebril'],
  oorbellen: ['geen', 'knopjes', 'ringetjes'],
  hoed: ['geen', 'pet', 'muts', 'zonnehoed', 'bandana'],
  tas: ['geen', 'rugzak', 'schoudertas'],
};
export const HAAR_NAAM = {
  kort: 'Kort', krul: 'Krullen', afro: 'Afro', lang: 'Lang', staart: 'Staart', staartjes: 'Staartjes',
  knot: 'Knot', vlechten: 'Vlechten', stekels: 'Stekels', zijscheiding: 'Zijscheiding', bob: 'Bob',
  kaal: 'Kaal', hoofddoek: 'Hoofddoek', 'hoofddoek-sport': 'Sporthoofddoek', tulband: 'Tulband', kufi: 'Kufi', pet: 'Pet',
};
/** Welke haarstijlen zijn stof? Dan is haarKleur de kleur van de stof. */
export const STOFHAAR = new Set(['hoofddoek', 'hoofddoek-sport', 'tulband', 'kufi', 'pet']);
export const STOF_KLEUREN = ['#7a5bb5', '#2f6f9f', '#3fa37a', '#d9577b', '#e9a23b', '#2f3e5a', '#f4f1ea', '#a33b2a'];

export const DEFAULT_LOOK = {
  huid: 2, gezicht: 'rond', ogen: 'rond', wenkbrauwen: 'zacht', mond: 'glimlach',
  haar: 'kort', haarKleur: 0, boven: 'jas', kleren: 3, onder: 'broek', broek: 0,
  schoenen: 'sneakers', schoenKleur: 0, bril: 'geen', oorbellen: 'geen', hoed: 'geen', tas: 'geen',
  uitrusting: {},
};

/** Welke tabbladen staat de avatarmaker, en welke keuzes horen erbij. */
export const CREATOR_TABS = [
  { id: 'gezicht', naam: 'Gezicht', keuzes: ['huid', 'gezicht', 'ogen', 'wenkbrauwen', 'mond'] },
  { id: 'haar', naam: 'Haar', keuzes: ['haar', 'haarKleur'] },
  { id: 'kleren', naam: 'Kleren', keuzes: ['boven', 'kleren', 'onder', 'broek', 'schoenen', 'schoenKleur'] },
  { id: 'extra', naam: 'Extra', keuzes: ['bril', 'oorbellen', 'hoed', 'tas'] },
];
export const KEUZE_NAAM = {
  huid: 'Huidkleur', gezicht: 'Vorm van je gezicht', ogen: 'Ogen', wenkbrauwen: 'Wenkbrauwen', mond: 'Mond',
  haar: 'Haar of hoofddoek', haarKleur: 'Kleur', boven: 'Bovenkleren', kleren: 'Kleur van je jas of trui',
  onder: 'Onderkleren', broek: 'Kleur van je broek of rok', schoenen: 'Schoenen', schoenKleur: 'Kleur van je schoenen',
  bril: 'Bril', oorbellen: 'Oorbellen', hoed: 'Hoed of pet', tas: 'Tas',
};

/** Een willekeurig uiterlijk (de knop "Verras me"). */
export function willekeurigeLook(rand = Math.random) {
  const kies = (lijst) => lijst[Math.floor(rand() * lijst.length)];
  const O = AVATAR_OPTIES;
  return {
    ...DEFAULT_LOOK,
    huid: Math.floor(rand() * O.huid.length),
    gezicht: kies(O.gezicht), ogen: kies(O.ogen), wenkbrauwen: kies(O.wenkbrauwen), mond: kies(O.mond),
    haar: kies(O.haar), haarKleur: Math.floor(rand() * O.haarKleur.length),
    boven: kies(O.boven), kleren: Math.floor(rand() * O.kleren.length),
    onder: kies(O.onder), broek: Math.floor(rand() * O.broek.length),
    schoenen: kies(O.schoenen), schoenKleur: Math.floor(rand() * O.schoenKleur.length),
    bril: rand() < 0.3 ? kies(O.bril.slice(1)) : 'geen',
    oorbellen: rand() < 0.3 ? kies(O.oorbellen.slice(1)) : 'geen',
    hoed: rand() < 0.2 ? kies(O.hoed.slice(1)) : 'geen',
    tas: rand() < 0.3 ? kies(O.tas.slice(1)) : 'geen',
    uitrusting: {},
  };
}

/** Kleuren en keuzes van een figuur, met de jaskleur uit de codekluis als die gekozen is. */
export function kleurenVan(look = DEFAULT_LOOK) {
  const O = AVATAR_OPTIES, uit = look.uitrusting || {};
  let jas = O.kleren[look.kleren] ?? O.kleren[3];
  if (uit.kleur === 'kleur-goud') jas = '#e8c040';
  if (uit.kleur === 'kleur-nacht') jas = '#2b3a78';
  if (uit.kleur === 'kleur-speurneus') jas = '#7a4bb0';
  if (uit.jas === 'regenjas') jas = '#f2c216';
  if (uit.jas === 'zwemvest') jas = '#f2762b';
  const stijl = look.haar || 'kort';
  const stofKleur = STOF_KLEUREN[(look.haarKleur ?? 0) % STOF_KLEUREN.length];
  return {
    huid: O.huid[look.huid] ?? O.huid[2],
    haar: STOFHAAR.has(stijl) ? stofKleur : (O.haarKleur[look.haarKleur] ?? O.haarKleur[0]),
    jas, broek: O.broek[look.broek] ?? O.broek[0],
    schoen: O.schoenKleur[look.schoenKleur] ?? O.schoenKleur[0],
    stijl,
    gezicht: look.gezicht || 'rond', ogen: look.ogen || 'rond', wenkbrauwen: look.wenkbrauwen || 'zacht', mond: look.mond || 'glimlach',
    boven: look.boven || 'jas', onder: look.onder || 'broek', schoenen: look.schoenen || 'sneakers',
    bril: look.bril || 'geen', oorbellen: look.oorbellen || 'geen', hoed: look.hoed || 'geen', tas: look.tas || 'geen',
    uit,
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
