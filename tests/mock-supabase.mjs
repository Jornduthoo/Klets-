// Een kleine nagemaakte Supabase-client (enkel wat SupabaseStore gebruikt), met een schakelaar 'offline'
// en de mogelijkheid om een schrijfactie te laten weigeren (zoals RLS dat zou doen).

export class MockSupabase {
  constructor() {
    this.tabellen = { klasdata: [] };
    this.offline = false;
    this.weiger = null;        // (rij) => true om een upsert te weigeren
    this.rpcs = {};            // naam -> (args) => data
    this.verzoeken = 0;
    this.klok = Date.parse('2026-10-09T08:00:00Z');
  }
  tijd() { this.klok += 1000; return new Date(this.klok).toISOString(); }
  netFout() { return { data: null, error: { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' }, status: 0 }; }
  from(tabel) { return new Query(this, tabel); }
  async rpc(naam, args) {
    this.verzoeken++;
    if (this.offline) return this.netFout();
    const fn = this.rpcs[naam];
    if (!fn) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    return { data: fn(args), error: null };
  }
  /** Een 'andere gebruiker' schrijft rechtstreeks op de server. */
  zetRij(r) {
    const t = this.tabellen.klasdata;
    const i = t.findIndex(x => x.klas_id === r.klas_id && x.soort === r.soort && x.id === r.id);
    const rij = { pid: null, ...r, updated_at: this.tijd() };
    if (i >= 0) t[i] = rij; else t.push(rij);
    return rij;
  }
}

class Query {
  constructor(db, tabel) { this.db = db; this.tabel = tabel; this.filters = []; this.orders = []; this.rangeV = null; this.op = 'select'; this.single = false; }
  select() { return this; }
  eq(k, v) { this.filters.push(r => r[k] === v); return this; }
  gte(k, v) { this.filters.push(r => r[k] >= v); return this; }
  neq(k, v) { this.filters.push(r => r[k] !== v); return this; }
  order(k, { ascending = true } = {}) { this.orders.push([k, ascending]); return this; }
  range(a, b) { this.rangeV = [a, b]; return this; }
  maybeSingle() { this.single = true; return this; }
  upsert(rijen, opts = {}) { this.op = 'upsert'; this.rijen = rijen; this.opts = opts; return this; }
  delete() { this.op = 'delete'; return this; }
  then(ok, nok) { return Promise.resolve().then(() => this._voer()).then(ok, nok); }
  _voer() {
    const db = this.db; db.verzoeken++;
    if (db.offline) return db.netFout();
    const t = db.tabellen[this.tabel] || (db.tabellen[this.tabel] = []);
    if (this.op === 'upsert') {
      for (const r of this.rijen) if (db.weiger?.(r)) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy', hint: null }, status: 403 };
      for (const r of this.rijen) {
        const i = t.findIndex(x => x.klas_id === r.klas_id && x.soort === r.soort && x.id === r.id);
        if (i >= 0 && this.opts.ignoreDuplicates) continue;
        const rij = { ...JSON.parse(JSON.stringify(r)), updated_at: db.tijd() };
        if (i >= 0) t[i] = rij; else t.push(rij);
      }
      return { data: null, error: null, status: 201 };
    }
    let rijen = t.filter(r => this.filters.every(f => f(r)));
    if (this.op === 'delete') { db.tabellen[this.tabel] = t.filter(r => !rijen.includes(r)); return { data: null, error: null }; }
    for (const [k, asc] of [...this.orders].reverse()) rijen = [...rijen].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (asc ? 1 : -1));
    if (this.rangeV) rijen = rijen.slice(this.rangeV[0], this.rangeV[1] + 1);
    rijen = JSON.parse(JSON.stringify(rijen));
    if (this.single) return { data: rijen[0] || null, error: null };
    return { data: rijen, error: null };
  }
}

/** Een nagemaakt klaskanaal: alle deelnemers met hetzelfde topic horen elkaar (niet zichzelf). */
export function maakKanalen() {
  const topics = new Map();
  return function kanaal(klasId, kamer = 'klas') {
    const topic = 'klas:' + klasId + (kamer && kamer !== 'klas' ? ':' + kamer : '');
    if (!topics.has(topic)) topics.set(topic, new Set());
    const leden = topics.get(topic);
    const luisteraars = new Map();
    const ent = {
      topic, status: 'SUBSCRIBED',
      on(ev, fn) { if (!luisteraars.has(ev)) luisteraars.set(ev, new Set()); luisteraars.get(ev).add(fn); return () => luisteraars.get(ev)?.delete(fn); },
      opStatus() { return () => {}; },
      ontvang(event, payload) { for (const e of [event, '*']) for (const fn of luisteraars.get(e) || []) fn(payload, event); },
      send(event, payload) { for (const ander of leden) if (ander !== ent) ander.ontvang(event, JSON.parse(JSON.stringify(payload))); return true; },
    };
    leden.add(ent);
    return Promise.resolve(ent);
  };
}

export class GeheugenOpslag {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
  key(i) { return [...this.m.keys()][i] ?? null; }
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
}
