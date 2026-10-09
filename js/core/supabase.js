// De verbinding met de klasdatabank (Supabase): de client, de aanmelding van leerkracht en reizigers,
// het privékanaal van de klas en een duidelijke melding als er geen verbinding is.
// Wordt enkel gebruikt als de klas online staat (zie js/core/backend.js); de Supabase-bibliotheek
// (vendor/, geen CDN) wordt pas dan geladen.

import { backendKeuze, bewaarKlascode } from './backend.js';

const VENDOR = '../../vendor/supabase-js-2.117.2.esm.js';
const KLAS = 'vagant:sb:klas';   // { id, code, naam, rol: 'leerkracht'|'reiziger', pid?, bijnaam? }

function lees(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }
function schrijf(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* geen opslag */ } }

// ---------- fouten in begrijpelijk Nederlands ----------
export const BERICHT = {
  netwerk: 'Geen verbinding met de klasdatabank. Controleer de wifi en probeer opnieuw.',
  niet_ingesteld: 'De klasdatabank is nog niet ingesteld. Vraag het aan je juf of meester.',
  sql_ontbreekt: 'De klasdatabank is nog niet klaar: het SQL-script (sql/vagant-supabase.sql) is nog niet uitgevoerd in Supabase.',
  onbekend: 'Die klascode bestaat niet. Kijk ze na of vraag ze aan je juf of meester.',
  geen_lid: 'Dit toestel hoort nog niet bij deze klas.',
  bijnaam: 'Gebruik een voornaam of bijnaam van 2 tot 16 letters. Geen achternaam, geen e-mail, geen lange cijferreeks.',
  bijnaam_bestaat: 'Die naam bestaat al in deze klas. Ben jij dat? Kies dan "Ik speelde al op een ander toestel" en typ je pincode.',
  klas_vol: 'De klas is vol. Vraag het aan je juf of meester.',
  pin: 'Die naam en pincode horen niet bij elkaar. Probeer opnieuw.',
  geblokkeerd: 'Te veel foute pogingen. Wacht een kwartier of vraag een nieuwe pincode aan je juf of meester.',
  niet_aangemeld: 'Je bent niet aangemeld.',
  enkel_leerkracht: 'Enkel een leerkracht (aangemeld met e-mail) kan een klas maken.',
  enkel_reiziger: 'Dit toestel is aangemeld als leerkracht. Meld je eerst af in het leerkrachtendashboard.',
  te_veel_klassen: 'Je hebt al 5 klassen. Verwijder eerst een oude klas.',
  geen_leerkracht: 'Dat mag enkel de leerkracht van deze klas.',
  anoniem_uit: 'Anonieme aanmeldingen staan uit in Supabase (Authentication > Sign In / Providers > Allow anonymous sign-ins).',
  te_veel: 'Er staat al te veel in de klasdatabank (te veel foto\'s of resultaten).',
  geweigerd: 'De klasdatabank weigert dit (geen toestemming).',
};

export class VagantFout extends Error {
  constructor(code, bericht, extra = {}) { super(bericht || BERICHT[code] || code); this.code = code; Object.assign(this, extra); }
  get netwerk() { return this.code === 'netwerk'; }
}

/** Is dit een fout van het netwerk (geen wifi, server even weg) en niet van de gegevens? */
export function isNetwerkfout(e) {
  if (!e) return false;
  if (e instanceof VagantFout) return e.code === 'netwerk';
  if (e.name === 'TypeError' || e.name === 'AbortError') return true;
  const st = Number(e.status ?? -1);
  if (st === 0 || st === 408 || st === 429 || st >= 500) return true;
  if (st === 401 && /jwt|token/i.test(e.message || '')) return true;   // token verlopen: later opnieuw
  const m = String(e.message || '') + ' ' + String(e.details || '');
  return !e.code && /fetch|network|netwerk|load failed|timeout|offline|ECONN|ENOTFOUND/i.test(m);
}
/** Postgres-/PostgREST-fout -> VagantFout. */
export function vertaalFout(error) {
  if (!error) return null;
  if (error instanceof VagantFout) return error;
  if (isNetwerkfout(error)) return new VagantFout('netwerk', undefined, { oorzaak: error });
  if (error.code === 'PGRST202' || error.code === '42P01' || error.code === 'PGRST205' || /could not find the (function|table)/i.test(error.message || '')) return new VagantFout('sql_ontbreekt', undefined, { oorzaak: error });
  if (error.hint && BERICHT[error.hint]) return new VagantFout(error.hint, undefined, { oorzaak: error });
  if (error.code === '42501') return new VagantFout('geweigerd', undefined, { oorzaak: error });
  return new VagantFout('server', 'De klasdatabank gaf een fout: ' + (error.message || error.code || 'onbekend'), { oorzaak: error });
}

// ---------- de client ----------
let klantBelofte = null, vasteKlant = null;
/** Voor tests: een nagemaakte client gebruiken. */
export function zetKlant(k) { vasteKlant = k; klantBelofte = null; }
export async function klant() {
  if (vasteKlant) return vasteKlant;
  if (globalThis.__vagantTestKlant) return globalThis.__vagantTestKlant;   // enkel voor de browsertests (tests/e2e-online.mjs)
  if (!klantBelofte) {
    klantBelofte = (async () => {
      const { url, anonKey } = backendKeuze();
      if (!url || !anonKey) throw new VagantFout('niet_ingesteld');
      const { createClient } = await import(VENDOR);
      // na 15 s zonder antwoord geven we op (trage wifi): de wachtrij probeert het later opnieuw
      const fetchMetLimiet = (input, init = {}) => {
        if (init.signal || typeof AbortController === 'undefined') return fetch(input, init);
        const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 15000);
        return fetch(input, { ...init, signal: ac.signal }).finally(() => clearTimeout(t));
      };
      return createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'vagant-auth' },
        global: { fetch: fetchMetLimiet },
      });
    })();
    klantBelofte.catch(() => { klantBelofte = null; });
  }
  return klantBelofte;
}

export async function rpc(naam, args = {}) {
  const k = await klant();
  let res;
  try { res = await k.rpc(naam, args); } catch (e) { throw vertaalFout(e); }
  if (res.error) throw vertaalFout(res.error);
  const d = res.data;
  if (d && d.ok === false) throw new VagantFout(d.reden);
  return d;
}

// ---------- de klas op dit toestel ----------
export function huidigeKlas() { return lees(KLAS); }
export function zetKlas(k) {
  schrijf(KLAS, k);
  if (k?.code) bewaarKlascode(k.code);
  try { window.dispatchEvent(new CustomEvent('vagant-klas', { detail: k })); } catch { /* geen window */ }
}
export function vergeetKlas() { zetKlas(null); }

// ---------- aanmelden: reizigers (anoniem per toestel) ----------
export async function sessie() {
  const k = await klant();
  try { const { data } = await k.auth.getSession(); return data?.session || null; } catch { return null; }
}
export async function zorgVoorAnoniemeSessie() {
  const k = await klant();
  const s = await sessie();
  if (s) return s;
  let res;
  try { res = await k.auth.signInAnonymously(); } catch (e) { throw vertaalFout(e); }
  if (res.error) {
    if (isNetwerkfout(res.error)) throw new VagantFout('netwerk');
    if (/anonymous/i.test(res.error.message || '')) throw new VagantFout('anoniem_uit');
    throw new VagantFout('auth', 'Aanmelden lukt niet: ' + res.error.message);
  }
  return res.data.session;
}
/** Bestaat de klascode? Geeft { id, code, naam }. */
export async function zoekKlas(code) {
  await zorgVoorAnoniemeSessie();
  const r = await rpc('vagant_klas_info', { p_code: code });
  bewaarKlascode(r.klas.code);
  return r.klas;
}
/** Hoort dit toestel al bij de klas? Geeft { klas, rol, pid, bijnaam } of null. */
export async function mijnPlaats(code) {
  try { return await rpc('vagant_mijn_klas', { p_code: code }); }
  catch (e) { if (e.code === 'geen_lid') return null; throw e; }
}
export async function nieuweReiziger(code, bijnaam) {
  await zorgVoorAnoniemeSessie();
  const r = await rpc('vagant_nieuwe_reiziger', { p_code: code, p_bijnaam: bijnaam });
  zetKlas({ ...r.klas, rol: 'reiziger', pid: r.pid, bijnaam: r.bijnaam });
  return r;
}
export async function reizigerAanmelden(code, bijnaam, pin) {
  await zorgVoorAnoniemeSessie();
  const r = await rpc('vagant_aanmelden', { p_code: code, p_bijnaam: bijnaam, p_pin: pin });
  zetKlas({ ...r.klas, rol: 'reiziger', pid: r.pid, bijnaam: r.bijnaam });
  return r;
}
/** De eigen pincode (een reiziger ziet enkel de zijne). */
export async function mijnPin() {
  const kl = huidigeKlas(); if (!kl?.pid) return null;
  const { data, error } = await (await klant()).from('reizigers').select('pin').eq('klas_id', kl.id).eq('pid', kl.pid).maybeSingle();
  if (error) throw vertaalFout(error);
  return data?.pin || null;
}

// ---------- aanmelden: leerkracht (e-mail + wachtwoord) ----------
export async function leerkrachtSessie() {
  const s = await sessie();
  return s && !s.user?.is_anonymous ? s : null;
}
function authFout(error) {
  if (isNetwerkfout(error)) return new VagantFout('netwerk');
  const m = error.message || '';
  if (/invalid login credentials/i.test(m)) return new VagantFout('auth', 'Dat e-mailadres en wachtwoord kloppen niet.');
  if (/email not confirmed/i.test(m)) return new VagantFout('auth', 'Bevestig eerst je e-mailadres via de mail van Supabase en meld je dan aan.');
  if (/already registered|already exists/i.test(m)) return new VagantFout('auth', 'Er bestaat al een account met dat e-mailadres. Meld je aan.');
  if (/password/i.test(m)) return new VagantFout('auth', 'Kies een sterker wachtwoord (minstens 8 tekens).');
  if (/signups not allowed|signup.*disabled/i.test(m)) return new VagantFout('auth', 'Nieuwe accounts staan uit in Supabase (Authentication > Sign In / Providers).');
  return new VagantFout('auth', 'Aanmelden lukt niet: ' + m);
}
export async function leerkrachtAanmelden(email, wachtwoord) {
  const k = await klant();
  const s = await sessie();
  if (s?.user?.is_anonymous) { try { await k.auth.signOut(); } catch { /* */ } }
  let res; try { res = await k.auth.signInWithPassword({ email, password: wachtwoord }); } catch (e) { throw vertaalFout(e); }
  if (res.error) throw authFout(res.error);
  return res.data.session;
}
/** Nieuw leerkrachtaccount. { sessie } of { bevestigen: true } als Supabase eerst een bevestigingsmail stuurt. */
export async function leerkrachtRegistreren(email, wachtwoord) {
  const k = await klant();
  const s = await sessie();
  if (s?.user?.is_anonymous) { try { await k.auth.signOut(); } catch { /* */ } }
  let res;
  try { res = await k.auth.signUp({ email, password: wachtwoord, options: { emailRedirectTo: location.origin + location.pathname } }); } catch (e) { throw vertaalFout(e); }
  if (res.error) throw authFout(res.error);
  return res.data.session ? { sessie: res.data.session } : { bevestigen: true };
}
export async function afmelden() {
  try { await (await klant()).auth.signOut(); } catch { /* offline: de sessie blijft lokaal weg */ }
  vergeetKlas();
}
export async function mijnKlassen() {
  const s = await leerkrachtSessie(); if (!s) return [];
  const { data, error } = await (await klant()).from('klassen').select('id,code,naam,created_at').eq('eigenaar', s.user.id).order('created_at');
  if (error) throw vertaalFout(error);
  return data || [];
}
export async function maakKlas(naam) {
  const r = await rpc('vagant_maak_klas', { p_naam: naam || '' });
  zetKlas({ ...r.klas, rol: 'leerkracht' });
  return r.klas;
}
export function kiesKlas(k) { zetKlas({ id: k.id, code: k.code, naam: k.naam, rol: 'leerkracht' }); }
export async function reizigersMetPin() {
  const kl = huidigeKlas(); if (!kl) return [];
  const { data, error } = await (await klant()).from('reizigers').select('pid,bijnaam,pin').eq('klas_id', kl.id);
  if (error) throw vertaalFout(error);
  return data || [];
}
export async function nieuwePin(pid) {
  const kl = huidigeKlas();
  return (await rpc('vagant_nieuwe_pin', { p_klas: kl.id, p_pid: pid })).pin;
}

// ---------- 'Test verbinding' (dashboard) ----------
/** Geeft een lijst { ok, tekst } die zegt wat in orde is en wat nog ontbreekt. */
export async function testVerbinding() {
  const uit = [];
  const { url, anonKey } = backendKeuze();
  if (!url || !anonKey) { uit.push({ ok: false, tekst: 'De Project URL of de publishable key ontbreekt.' }); return uit; }
  if (/^sb_secret_|service_role/.test(anonKey)) { uit.push({ ok: false, tekst: 'Dit is een GEHEIME sleutel! Gebruik de publishable key en maak in Supabase meteen een nieuwe secret key.' }); return uit; }
  uit.push({ ok: true, tekst: `Project: ${url}` });
  try {
    const r = await fetch(url + '/auth/v1/settings', { headers: { apikey: anonKey } });
    if (!r.ok) uit.push({ ok: false, tekst: `Supabase antwoordt met fout ${r.status}. Klopt de publishable key?` });
    else {
      const a = await r.json();
      uit.push({ ok: !!a.external?.anonymous_users, tekst: a.external?.anonymous_users ? 'Anonieme aanmeldingen (voor reizigers) staan aan.' : 'Anonieme aanmeldingen staan UIT: zet ze aan bij Authentication > Sign In / Providers.' });
      uit.push({ ok: !!a.external?.email, tekst: a.external?.email ? 'Aanmelden met e-mail (voor de leerkracht) staat aan.' : 'Aanmelden met e-mail staat uit: zet de e-mailprovider aan.' });
    }
  } catch { uit.push({ ok: false, tekst: BERICHT.netwerk }); return uit; }
  try {
    const st = await rpc('vagant_status');
    uit.push({ ok: !st.ontbrekend.length, tekst: st.ontbrekend.length ? 'Ontbrekende tabellen: ' + st.ontbrekend.join(', ') + '. Voer sql/vagant-supabase.sql opnieuw uit.' : 'Alle tabellen bestaan.' });
    uit.push({ ok: !st.zonder_rls.length, tekst: st.zonder_rls.length ? 'GEVAAR: Row Level Security staat uit op ' + st.zonder_rls.join(', ') + '. Voer het SQL-script opnieuw uit.' : 'Row Level Security staat aan op alle tabellen.' });
    uit.push({ ok: st.realtime, tekst: st.realtime ? 'Realtime is beschikbaar (eindbaas en live bijwerken).' : 'Realtime ontbreekt: de eindbaas werkt dan niet tussen toestellen.' });
  } catch (e) { uit.push({ ok: false, tekst: e.code === 'sql_ontbreekt' ? BERICHT.sql_ontbreekt : e.message }); return uit; }
  const kl = huidigeKlas();
  if (kl && (await leerkrachtSessie())) {
    try {
      const ent = await klasKanaal(kl.id);
      const status = await ent.wachtOpVerbinding(6000);
      uit.push({ ok: status === 'SUBSCRIBED', tekst: status === 'SUBSCRIBED' ? `Het live-kanaal van klas ${kl.code} werkt.` : `Het live-kanaal van klas ${kl.code} werkt niet (${status}).` });
    } catch (e) { uit.push({ ok: false, tekst: 'Live-kanaal: ' + e.message }); }
  }
  return uit;
}

// ---------- het privékanaal van de klas (Realtime Broadcast) ----------
const kanalen = new Map();
/** Eén kanaal per klas (topic 'klas:<id>'), gedeeld door de opslag (berichten 'db') en de live-laag (eindbaas). */
export async function klasKanaal(klasId, kamer = 'klas') {
  const topic = 'klas:' + klasId + (kamer && kamer !== 'klas' ? ':' + kamer : '');
  if (kanalen.has(topic)) return kanalen.get(topic);
  const luisteraars = new Map(), statusLuisteraars = new Set();
  const ent = {
    topic, status: 'bezig', kanaal: null,
    on(ev, fn) { if (!luisteraars.has(ev)) luisteraars.set(ev, new Set()); luisteraars.get(ev).add(fn); return () => luisteraars.get(ev)?.delete(fn); },
    opStatus(fn) { statusLuisteraars.add(fn); return () => statusLuisteraars.delete(fn); },
    send(ev, payload) {
      if (ent.status !== 'SUBSCRIBED' || !ent.kanaal) return false;
      try { ent.kanaal.send({ type: 'broadcast', event: ev, payload }); return true; } catch { return false; }
    },
    wachtOpVerbinding(ms = 5000) {
      if (ent.status === 'SUBSCRIBED') return Promise.resolve(ent.status);
      return new Promise(res => { const t = setTimeout(() => { off(); res(ent.status); }, ms); const off = ent.opStatus(s => { if (s !== 'bezig') { clearTimeout(t); off(); res(s); } }); });
    },
  };
  kanalen.set(topic, ent);
  try {
    const k = await klant();
    try { await k.realtime?.setAuth?.(); } catch { /* geen sessie: het kanaal zal weigeren */ }
    const ch = k.channel(topic, { config: { private: true, broadcast: { self: false } } });
    ch.on('broadcast', { event: '*' }, (msg) => {
      for (const ev of [msg.event, '*']) for (const fn of luisteraars.get(ev) || []) { try { fn(msg.payload, msg.event); } catch (e) { console.error(e); } }
    });
    ent.kanaal = ch;
    ch.subscribe((status) => {
      ent.status = status;
      if (status === 'CHANNEL_ERROR') console.warn('Vagant: geen toegang tot het live-kanaal van de klas (' + topic + ').');
      for (const fn of statusLuisteraars) { try { fn(status); } catch { /* */ } }
    });
  } catch (e) { kanalen.delete(topic); throw e; }
  return ent;
}
export function sluitKanalen() {
  for (const ent of kanalen.values()) { try { ent.kanaal?.unsubscribe(); } catch { /* */ } }
  kanalen.clear();
}

// ---------- melding: geen verbinding ----------
let meldEl = null;
/** Toont of verbergt een duidelijke melding onderaan het scherm. wachtend = aantal bewaarde wijzigingen. */
export function toonNetStatus({ online, wachtend = 0 } = {}) {
  if (typeof document === 'undefined') return;
  if (online && !wachtend) { meldEl?.remove(); meldEl = null; return; }
  if (!meldEl) {
    meldEl = document.createElement('div');
    meldEl.className = 'net-status'; meldEl.setAttribute('role', 'status'); meldEl.setAttribute('aria-live', 'polite');
    meldEl.id = 'net-status';
    (document.body || document.documentElement).append(meldEl);
  }
  meldEl.classList.toggle('offline', !online);
  meldEl.textContent = !online
    ? `Geen verbinding met de klasdatabank. Je werk blijft op dit toestel bewaard${wachtend ? ` (${wachtend} wijziging${wachtend === 1 ? '' : 'en'})` : ''} en gaat vanzelf door zodra de wifi terug is.`
    : `Bezig met doorsturen naar de klasdatabank (${wachtend}) ...`;
}
