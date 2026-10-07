// Centrale instellingen en vaste gegevens van Vagant (methode wereldoriëntatie).
// Vaganten waren middeleeuwse rondtrekkende studenten die van stad naar stad trokken om te leren.

export const METHODE = 'Vagant';

/** Welke opslag en welke live-verbinding gebruikt de app?
 *  'local'    = localStorage + BroadcastChannel (werkt meteen, per toestel)
 *  'supabase' = gedeelde database + realtime (nog een stub, zie js/core/*.js) */
export const BACKEND = {
  store: 'local',
  sync: 'local',
  supabase: {
    // TODO: vul in na het aanmaken van een Supabase-project in de EU-regio (bv. eu-central-1, Frankfurt).
    url: '',
    anonKey: '',
  },
};

export const DEFAULT_PIN = '1234';

/** De zes domeinen van WERO. Elk domein heeft een wijk in de stad en een gids. (Intern heet een domein nog 'macht'.) */
export const DOMEINEN = [
  { id: 'Aardrijkskunde', naam: 'Aardrijkskunde', kort: 'AK', kleur: '#3fa37a', gids: 'atlas', uitleg: 'Kaarten, weer, water en landschappen' },
  { id: 'Geschiedenis', naam: 'Geschiedenis', kort: 'GE', kleur: '#c4873a', gids: 'kroniek', uitleg: 'Tijd, bronnen en verhalen van vroeger' },
  { id: 'Wetenschap', naam: 'Wetenschap', kort: 'WE', kleur: '#e2643e', gids: 'tella', uitleg: 'Onderzoeken: natuur, stoffen en krachten' },
  { id: 'Techniek', naam: 'Techniek en ICT', kort: 'TE', kleur: '#4c8fd6', gids: 'byte', uitleg: 'Ontwerpen, bouwen en programmeren' },
  { id: 'Hart', naam: 'Hart', kort: 'SE', kleur: '#d9577b', gids: 'bram', uitleg: 'Gevoelens, samenwerken en samenleven' },
  { id: 'Onderzoek', naam: 'Onderzoek', kort: 'OZ', kleur: '#9a6ad6', gids: 'woordje', uitleg: 'Vragen stellen, voorspellen en eerlijk testen' },
];
export const MACHTEN = DOMEINEN;
export const MACHT = Object.fromEntries(MACHTEN.map(m => [m.id, m]));

export const ROUTES = [
  { id: 'kompas', naam: 'Kompas', kort: 'K', uitleg: 'Doelen van het 4de leerjaar, met voorleesknop en stap voor stap' },
  { id: 'telescoop', naam: 'Telescoop', kort: 'T', uitleg: 'Doelen van het 6de leerjaar, met eigen onderzoek en rekenwerk' },
];
export const ROUTE = Object.fromEntries(ROUTES.map(r => [r.id, r]));

export const GIDSEN = {
  atlas: { naam: 'Atlas', dier: 'schildpad', rol: 'ontdekkingsreiziger en duiker', macht: 'Aardrijkskunde', plek: 'Kaartenkamer', uitrusting: 'duikbril en kaartkoker' },
  kroniek: { naam: 'Kroniek', dier: 'uil', rol: 'nachtelijke tijdreiziger', macht: 'Geschiedenis', plek: 'Archief', uitrusting: 'lantaarn en reismantel' },
  tella: { naam: 'Tella', dier: 'vos', rol: 'labo-onderzoeker', macht: 'Wetenschap', plek: 'Proefkeuken', uitrusting: 'labojas en veiligheidsbril' },
  byte: { naam: 'Byte', dier: 'robot', rol: 'uitvinder', macht: 'Techniek', plek: 'Werkplaats', uitrusting: 'gereedschapsriem en jetpack' },
  bram: { naam: 'Bram', dier: 'beer', rol: 'kampleider', macht: 'Hart', plek: 'Kampvuur', uitrusting: 'rugzak en kampeerpot' },
  woordje: { naam: 'Woordje', dier: 'papegaai', rol: 'verkenner en verteller', macht: 'Onderzoek', plek: 'Uitkijkpost', uitrusting: 'touw en klimgerei' },
};

export const RANGEN = [
  { naam: 'Reiziger', xp: 0 },
  { naam: 'Verkenner', xp: 500 },
  { naam: 'Spoorzoeker', xp: 1500 },
  { naam: 'Kaartmaker', xp: 3000 },
  { naam: 'Gids', xp: 5000 },
  { naam: 'Vagant', xp: 8000 },
];

export const XP = { perJuist: 10, eersteKeerBonus: 20, code: 25, raidJuist: 10, raidOverwinning: 50 };

/** Vanaf welk aandeel juiste antwoorden is een doel behaald? */
export const BEHAALD_GRENS = 0.7;

export const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
