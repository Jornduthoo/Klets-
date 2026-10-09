// Welke opslag gebruikt dit toestel? Standaard wat in js/config.js staat (BACKEND), maar de leerkracht kan
// "Klas online (Supabase)" aanzetten in het dashboard (Instellingen), en een leerling krijgt het via de klaslink:
//   index.html?k=KLASCODE&s=<project-ref of url>&a=<publishable key>
// De publishable (anon) key is publiek bedoeld: hij geeft enkel toegang tot wat de RLS-regels toelaten.
// NOOIT de secret/service_role key in de app of in een link zetten.

import { BACKEND } from '../config.js';

const SLEUTEL = 'vagant:backend';      // { aan: true|false, url, anonKey }
const KLASCODE = 'vagant:klascode';    // laatst gebruikte klascode op dit toestel

function lees(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } }
function schrijf(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* geen opslag */ } }

/** 'kkqzstqsczcooutdjypt' of 'https://kkqzstqsczcooutdjypt.supabase.co' -> volledige url. */
export function projectUrl(s) {
  s = String(s || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  if (/^[a-z0-9]{10,40}$/.test(s)) return `https://${s}.supabase.co`;
  if (/^https:\/\/[^\s/]+$/.test(s)) return s;
  return '';
}
/** De korte projectnaam (ref) uit een url, voor in de klaslink. */
export function projectRef(url) {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(String(url || ''));
  return m ? m[1] : String(url || '');
}

let linkGelezen = false;
/** Leest ?k= / ?s= / ?a= eenmaal uit de adresbalk, bewaart ze op dit toestel en haalt ze uit de adresbalk. */
function leesKlaslink() {
  if (linkGelezen || typeof location === 'undefined') return;
  linkGelezen = true;
  let qs; try { qs = new URLSearchParams(location.search); } catch { return; }
  const k = qs.get('k'), s = qs.get('s'), a = qs.get('a');
  if (!k && !s) return;
  if (s) {
    const url = projectUrl(s);
    if (url) schrijf(SLEUTEL, { aan: true, url, anonKey: a || (url === BACKEND.supabase.url ? BACKEND.supabase.anonKey : '') });
  }
  if (k && /^[A-Za-z2-9]{6}$/.test(k)) schrijf(KLASCODE, k.toUpperCase());
  try {
    for (const p of ['k', 's', 'a']) qs.delete(p);
    const rest = qs.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  } catch { /* geen history */ }
}

/** De keuze voor dit toestel: { store, sync, url, anonKey, online } */
export function backendKeuze() {
  leesKlaslink();
  const o = lees(SLEUTEL);
  const url = projectUrl(o?.url) || BACKEND.supabase.url;
  const anonKey = o?.anonKey || BACKEND.supabase.anonKey;
  if (o && typeof o.aan === 'boolean') {
    const m = o.aan && url && anonKey ? 'supabase' : 'local';
    return { store: m, sync: m, url, anonKey, online: m === 'supabase' };
  }
  const ok = url && anonKey;
  const store = BACKEND.store === 'supabase' && ok ? 'supabase' : 'local';
  const sync = BACKEND.sync === 'supabase' && ok ? 'supabase' : 'local';
  return { store, sync, url, anonKey, online: store === 'supabase' };
}

/** Klas online aan- of uitzetten op dit toestel (dashboard > Instellingen). */
export function zetBackend({ aan, url, anonKey }) {
  const huidig = lees(SLEUTEL) || {};
  schrijf(SLEUTEL, { aan: !!aan, url: projectUrl(url ?? huidig.url) || BACKEND.supabase.url, anonKey: (anonKey ?? huidig.anonKey) || BACKEND.supabase.anonKey });
}

export function bewaardeKlascode() { return lees(KLASCODE) || ''; }
export function bewaarKlascode(code) { schrijf(KLASCODE, code ? String(code).toUpperCase() : null); }

/** De klaslink voor leerlingen (met klascode, project en publishable key). */
export function klaslink(code, { url, anonKey } = backendKeuze()) {
  const basis = typeof location !== 'undefined' ? location.origin + location.pathname.replace(/[^/]*$/, '') : '';
  const qs = new URLSearchParams({ k: code, s: projectRef(url), a: anonKey || '' });
  return basis + 'index.html?' + qs.toString();
}
