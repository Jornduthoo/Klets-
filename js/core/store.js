// Opslaglaag. Alle schermen praten enkel met deze interface, zodat de opslag
// kan wisselen (localStorage of de klasdatabank in Supabase) zonder de rest te veranderen.
//
// Interface (alles async):
//   getSettings() / saveSettings(patch)
//   listPupils() / getPupil(id) / savePupil(pupil) / deletePupil(id)
//   addAttempt(attempt) / listAttempts({pid}?)
//   addGallery(item) / listGallery() / deleteGallery(id)
//   addEvent(event) / listEvents()
//   exportAll() / importAll(data, {merge}) / reset()
//   onChange(callback)  -> functie om af te melden

import { DEFAULT_PIN } from '../config.js';
import { backendKeuze } from './backend.js';

export const DEFAULT_SETTINGS = {
  pin: DEFAULT_PIN,
  huidigThema: 'waterwereld',   // welk thema de klas nu speelt (zie data/themas.js)
  huidigeWeek: 1,
  allesOpen: false,
  mistDoel: 1200,        // XP per leerling waarbij de mist helemaal weg is
  klasNaam: '',          // leeg = de naam van de themastad (bv. Zwinvliet)
  dagNacht: 'auto',      // 'auto' (volgt de klasmeter) | 'dag' | 'nacht'
};

/** De gevonden geheimen en de beste scores van twee toestellen samenvoegen. */
function voegGeheimen(a, b) {
  if (!a && !b) return undefined;
  const best = { ...(a?.best || {}) };
  for (const [k, v] of Object.entries(b?.best || {})) best[k] = Math.max(best[k] || 0, v || 0);
  return { gevonden: [...new Set([...(a?.gevonden || []), ...(b?.gevonden || [])])], best };
}

export class LocalStore {
  constructor(ns = 'klets:v1') { this.ns = ns; }
  _key(c) { return `${this.ns}:${c}`; }
  _read(c, fallback) {
    try { const raw = localStorage.getItem(this._key(c)); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  }
  _write(c, v) {
    try { localStorage.setItem(this._key(c), JSON.stringify(v)); }
    catch (e) { console.warn('Opslaan mislukt (opslag vol?)', e); throw new Error('De opslag van deze browser is vol. Exporteer en wis oude galerijfoto\'s.'); }
  }

  async getSettings() { return { ...DEFAULT_SETTINGS, ...this._read('settings', {}) }; }
  async saveSettings(patch) { const s = { ...(await this.getSettings()), ...patch }; this._write('settings', s); return s; }

  async listPupils() { return Object.values(this._read('pupils', {})).sort((a, b) => a.naam.localeCompare(b.naam, 'nl')); }
  async getPupil(id) { return this._read('pupils', {})[id] || null; }
  async savePupil(p) { const all = this._read('pupils', {}); all[p.id] = p; this._write('pupils', all); return p; }
  async deletePupil(id) {
    const all = this._read('pupils', {}); delete all[id]; this._write('pupils', all);
    this._write('attempts', this._read('attempts', []).filter(a => a.pid !== id));
  }

  async addAttempt(a) { const all = this._read('attempts', []); all.push(a); this._write('attempts', all); return a; }
  async listAttempts(filter = {}) {
    const all = this._read('attempts', []);
    return filter.pid ? all.filter(a => a.pid === filter.pid) : all;
  }

  async addGallery(item) { const all = this._read('gallery', []); all.push(item); this._write('gallery', all); return item; }
  async listGallery() { return this._read('gallery', []); }
  async deleteGallery(id) { this._write('gallery', this._read('gallery', []).filter(g => g.id !== id)); }

  async addEvent(e) { const all = this._read('events', []); all.push(e); this._write('events', all); return e; }
  async listEvents() { return this._read('events', []); }

  async exportAll() {
    return {
      formaat: 'klets-export', versie: 1, datum: new Date().toISOString(),
      settings: await this.getSettings(), pupils: this._read('pupils', {}), attempts: this._read('attempts', []),
      gallery: this._read('gallery', []), events: this._read('events', []),
    };
  }
  /** merge=true voegt samen (bv. resultaten van een ander toestel), merge=false vervangt alles. */
  async importAll(data, { merge = true } = {}) {
    if (!data || data.formaat !== 'klets-export') throw new Error('Dit is geen Vagant-exportbestand.');
    if (!merge) {
      this._write('settings', data.settings || {}); this._write('pupils', data.pupils || {});
      this._write('attempts', data.attempts || []); this._write('gallery', data.gallery || []); this._write('events', data.events || []);
      return;
    }
    const pupils = this._read('pupils', {});
    for (const [id, p] of Object.entries(data.pupils || {})) {
      const cur = pupils[id];
      if (!cur) pupils[id] = p;
      else pupils[id] = { ...cur, xp: Math.max(cur.xp || 0, p.xp || 0), codes: [...new Set([...(cur.codes || []), ...(p.codes || [])])], kosmetiek: [...new Set([...(cur.kosmetiek || []), ...(p.kosmetiek || [])])], geheimen: voegGeheimen(cur.geheimen, p.geheimen) };
    }
    this._write('pupils', pupils);
    const mergeList = (c, list) => {
      const cur = this._read(c, []); const ids = new Set(cur.map(x => x.id));
      for (const x of list || []) if (!ids.has(x.id)) cur.push(x);
      this._write(c, cur);
    };
    mergeList('attempts', data.attempts); mergeList('gallery', data.gallery); mergeList('events', data.events);
  }
  async reset() { for (const c of ['settings', 'pupils', 'attempts', 'gallery', 'events']) localStorage.removeItem(this._key(c)); }

  onChange(cb) {
    const fn = e => { if (e.key && e.key.startsWith(this.ns)) cb(e.key.slice(this.ns.length + 1)); };
    window.addEventListener('storage', fn);
    return () => window.removeEventListener('storage', fn);
  }
}

// SupabaseStore (gedeelde klasdatabank, zelfde interface): zie supabase-store.js.
export { SupabaseStore } from './supabase-store.js';
import { SupabaseStore } from './supabase-store.js';

export function createStore() {
  const b = backendKeuze();
  return b.store === 'supabase' ? new SupabaseStore({ url: b.url, anonKey: b.anonKey }) : new LocalStore();
}
