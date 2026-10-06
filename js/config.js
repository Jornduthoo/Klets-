// Centrale instellingen en vaste gegevens van Klets!

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

export const MACHTEN = [
  { id: 'Taal', naam: 'Taal', kleur: '#e9a23b', gids: 'woordje', uitleg: 'Lezen, schrijven, spreken en luisteren' },
  { id: 'Getal', naam: 'Getal', kleur: '#e2643e', gids: 'tella', uitleg: 'Rekenen, meten en getallen' },
  { id: 'Wereld', naam: 'Wereld', kleur: '#3fa37a', gids: 'atlas', uitleg: 'Mens, maatschappij, natuur en kaart' },
  { id: 'Hart', naam: 'Hart', kleur: '#d9577b', gids: 'bram', uitleg: 'Gevoelens, samenleven en vrede' },
  { id: 'Maker', naam: 'Maker', kleur: '#4c8fd6', gids: 'byte', uitleg: 'ICT, muziek en beeld' },
  { id: 'Brein', naam: 'Brein', kleur: '#9a6ad6', gids: 'kroniek', uitleg: 'Leren leren en terugblikken' },
];
export const MACHT = Object.fromEntries(MACHTEN.map(m => [m.id, m]));

export const ROUTES = [
  { id: 'taalsleutels', naam: 'Taalsleutels', kort: 'TS', uitleg: 'Startspoor met veel beeld en voorlezen' },
  { id: 'kompas', naam: 'Kompas', kort: 'K', uitleg: 'Doelen van het 4de leerjaar' },
  { id: 'telescoop', naam: 'Telescoop', kort: 'T', uitleg: 'Doelen van het 6de leerjaar' },
];
export const ROUTE = Object.fromEntries(ROUTES.map(r => [r.id, r]));

export const GIDSEN = {
  atlas: { naam: 'Atlas', dier: 'schildpad', rol: 'kaartenmaker', macht: 'Wereld', plek: 'Kaartenkamer' },
  woordje: { naam: 'Woordje', dier: 'papegaai', rol: 'taal', macht: 'Taal', plek: 'Wachtzaal' },
  tella: { naam: 'Tella', dier: 'vos', rol: 'rekenen', macht: 'Getal', plek: 'Rekenkiosk' },
  kroniek: { naam: 'Kroniek', dier: 'uil', rol: 'verleden', macht: 'Brein', plek: 'Seinhuis' },
  bram: { naam: 'Bram', dier: 'beer', rol: 'gevoelens', macht: 'Hart', plek: 'Kampvuur' },
  byte: { naam: 'Byte', dier: 'robot', rol: 'ICT', macht: 'Maker', plek: 'Werkplaats' },
};

export const RANGEN = [
  { naam: 'Reiziger', xp: 0 },
  { naam: 'Verkenner', xp: 500 },
  { naam: 'Spoorzoeker', xp: 1500 },
  { naam: 'Kaartmaker', xp: 3000 },
  { naam: 'Gids', xp: 5000 },
  { naam: 'Wereldwijze', xp: 8000 },
];

export const XP = { perJuist: 10, eersteKeerBonus: 20, code: 25, raidJuist: 10, raidOverwinning: 50 };

/** Vanaf welk aandeel juiste antwoorden is een doel behaald? */
export const BEHAALD_GRENS = 0.7;

export const DAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
