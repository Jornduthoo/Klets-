// Live-verbinding tussen schermen (digibord <-> laptops), bv. voor de raid.
//
// Interface:
//   await sync.connect()
//   sync.publish(type, payload)          -> stuurt naar alle andere deelnemers in dezelfde 'kamer'
//   sync.subscribe(type, handler)        -> handler(payload, meta); geeft een afmeldfunctie terug
//   sync.close()
// Berichten bevatten nooit meer dan een bijnaam-id; de raid stuurt zelfs geen foute antwoorden door.

import { BACKEND } from '../config.js';

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
 * Stub voor live-verbinding over het netwerk via Supabase Realtime (Broadcast-kanalen).
 * Zelfde interface als LocalSync.
 *
 * TODO (volgende versie):
 *  - Supabase-project in de EU-regio (zelfde project als SupabaseStore).
 *  - connect(): this.client = createClient(url, anonKey); this.channel = this.client.channel('klets-' + room, { config: { broadcast: { self: false } } });
 *               this.channel.on('broadcast', { event: '*' }, ({ event, payload }) => this._deliver(event, payload)); await this.channel.subscribe();
 *  - publish(type, payload): this.channel.send({ type: 'broadcast', event: type, payload });
 *  - Kamer = klascode (geen schoolnaam, geen leerlingnamen in de kamernaam).
 *  - Payloads: enkel bijnaam-id's; raid-'hit' bevat alleen dat er een juist antwoord was.
 */
export class SupabaseSync {
  constructor(room = 'klas', { url, anonKey } = {}) { this.room = room; this.url = url; this.anonKey = anonKey; this.handlers = new Map(); }
  async connect() { throw new Error('SupabaseSync is nog niet gebouwd. Gebruik BACKEND.sync = \'local\'.'); }
  publish() { /* TODO: channel.send(...) */ }
  subscribe(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }
  close() { this.handlers.clear(); }
}

export function createSync(room = 'klas') {
  return BACKEND.sync === 'supabase' ? new SupabaseSync(room, BACKEND.supabase) : new LocalSync(room);
}
