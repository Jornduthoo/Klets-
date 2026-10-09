// Live-verbinding tussen schermen (digibord <-> laptops), bv. voor de raid.
//
// Interface:
//   await sync.connect()
//   sync.publish(type, payload)          -> stuurt naar alle andere deelnemers in dezelfde 'kamer'
//   sync.subscribe(type, handler)        -> handler(payload, meta); geeft een afmeldfunctie terug
//   sync.close()
// Berichten bevatten nooit meer dan een bijnaam-id; de raid stuurt zelfs geen foute antwoorden door.

import { backendKeuze } from './backend.js';

/** Werkt tussen tabbladen/vensters op hetzelfde toestel (demo, of digibord + leerling op één pc). */
export class LocalSync {
  constructor(room = 'klas') { this.room = room; this.handlers = new Map(); this.ch = null; this.id = Math.random().toString(36).slice(2); }
  async connect() {
    if (this.ch) return this;
    if (!('BroadcastChannel' in window)) { console.warn('BroadcastChannel niet beschikbaar.'); return this; }
    this.ch = new BroadcastChannel('klets-' + this.room);
    this.ch.onmessage = (e) => this._deliver(e.data);
    return this;
  }
  _deliver(msg) {
    if (!msg || msg.from === this.id) return;
    for (const fn of this.handlers.get(msg.type) || []) { try { fn(msg.payload, { from: msg.from, ts: msg.ts }); } catch (err) { console.error(err); } }
    for (const fn of this.handlers.get('*') || []) { try { fn(msg, {}); } catch (err) { console.error(err); } }
  }
  publish(type, payload = {}) { this.ch?.postMessage({ type, payload, from: this.id, ts: Date.now() }); }
  subscribe(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  close() { this.ch?.close(); this.ch = null; this.handlers.clear(); }
}

/**
 * Live-verbinding over het netwerk via Supabase Realtime Broadcast. Zelfde interface als LocalSync.
 *  - Kamer = het privékanaal van de klas: topic 'klas:<klas_id>' (geen schoolnaam, geen leerlingnamen).
 *    Enkel leden van de klas mogen er luisteren en zenden (RLS op realtime.messages, zie sql/vagant-supabase.sql).
 *  - Is er nog geen klas op dit toestel (leerling nog niet aangemeld), dan verbindt het vanzelf zodra er een klas is.
 *  - Payloads: enkel bijnaam-id's; een raid-'hit' zegt alleen dat er een juist antwoord was.
 */
export class SupabaseSync {
  constructor(room = 'klas', { url, anonKey, klas, kanaal } = {}) {
    this.room = room; this.url = url; this.anonKey = anonKey;
    this.handlers = new Map(); this.id = Math.random().toString(36).slice(2);
    this._klas = klas || null; this._kanaalFn = kanaal || null;
    this.ent = null; this._af = [];
    this._opKlas = () => { this._los(); this.connect(); };
  }
  async _sb() { return import('./supabase.js'); }
  async connect() {
    if (typeof window !== 'undefined' && !this._luistert) { window.addEventListener('vagant-klas', this._opKlas); this._luistert = true; }
    if (this.ent) return this;
    const sb = this._klas && this._kanaalFn ? null : await this._sb();
    const klas = (this._klas || sb.huidigeKlas)();
    if (!klas?.id) return this;
    try {
      const ent = await (this._kanaalFn || sb.klasKanaal)(klas.id, this.room);
      this.ent = ent;
      this._af.push(ent.on('*', (wrapped, event) => {
        if (event === 'db' || !wrapped || wrapped.from === this.id) return;
        this._deliver({ type: event, payload: wrapped.payload, from: wrapped.from, ts: wrapped.ts });
      }));
    } catch (e) { console.warn('Vagant: live-verbinding niet beschikbaar', e); }
    return this;
  }
  _los() { for (const f of this._af) f(); this._af = []; this.ent = null; }
  _deliver(msg) {
    for (const fn of this.handlers.get(msg.type) || []) { try { fn(msg.payload, { from: msg.from, ts: msg.ts }); } catch (err) { console.error(err); } }
    for (const fn of this.handlers.get('*') || []) { try { fn(msg, {}); } catch (err) { console.error(err); } }
  }
  publish(type, payload = {}) { this.ent?.send(type, { payload, from: this.id, ts: Date.now() }); }
  subscribe(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  close() {
    this._los(); this.handlers.clear();
    if (this._luistert) { window.removeEventListener('vagant-klas', this._opKlas); this._luistert = false; }
  }
}

export function createSync(room = 'klas') {
  const b = backendKeuze();
  return b.sync === 'supabase' ? new SupabaseSync(room, { url: b.url, anonKey: b.anonKey }) : new LocalSync(room);
}
