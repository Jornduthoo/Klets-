// In de pagina geladen door tests/e2e-online.mjs: een nagemaakte supabase-client die elke vraag doorgeeft
// aan de testserver in Node (window.__mockServer). Zo kan de test meerdere "toestellen" (browsercontexten)
// laten samenwerken met één nagemaakte klasdatabank, zonder netwerk.
(() => {
  const SLEUTEL = 'mock-sessie';
  const sessie = () => { try { return JSON.parse(localStorage.getItem(SLEUTEL) || 'null'); } catch { return null; } };
  const zetSessie = (s) => { if (s) localStorage.setItem(SLEUTEL, JSON.stringify(s)); else localStorage.removeItem(SLEUTEL); };
  const server = (vraag) => window.__mockServer(JSON.stringify({ ...vraag, uid: sessie()?.user?.id || null }));
  const netFout = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };

  async function vraag(v) {
    const r = await server(v);
    if (r === 'OFFLINE') return { data: null, error: netFout, status: 0 };
    return r;
  }
  class Q {
    constructor(tabel) { this.d = { t: 'q', tabel, op: 'select', filters: [], orders: [], range: null, single: false }; }
    select() { return this; }
    eq(k, v) { this.d.filters.push([k, 'eq', v]); return this; }
    gte(k, v) { this.d.filters.push([k, 'gte', v]); return this; }
    neq(k, v) { this.d.filters.push([k, 'neq', v]); return this; }
    order(k, o = {}) { this.d.orders.push([k, o.ascending !== false]); return this; }
    range(a, b) { this.d.range = [a, b]; return this; }
    maybeSingle() { this.d.single = true; return this; }
    upsert(rijen, opts = {}) { this.d.op = 'upsert'; this.d.rijen = rijen; this.d.opts = opts; return this; }
    delete() { this.d.op = 'delete'; return this; }
    then(ok, nok) { return vraag(this.d).then(ok, nok); }
  }
  const kanalen = new Map();
  window.__mockOntvang = (topic, event, payload) => {
    for (const fn of kanalen.get(topic) || []) fn({ type: 'broadcast', event, payload });
  };
  window.__vagantTestKlant = {
    from: (t) => new Q(t),
    rpc: (naam, args) => vraag({ t: 'rpc', naam, args }),
    realtime: { setAuth: async () => {} },
    channel(topic) {
      const ls = [];
      return {
        on(type, filter, cb) { ls.push(cb); return this; },
        subscribe(cb) {
          server({ t: 'sub', topic }).then((r) => {
            if (r === 'OFFLINE' || r?.error) { cb?.('CHANNEL_ERROR'); return; }
            if (!kanalen.has(topic)) kanalen.set(topic, new Set());
            for (const l of ls) kanalen.get(topic).add(l);
            cb?.('SUBSCRIBED');
          });
          return this;
        },
        send({ event, payload }) { server({ t: 'send', topic, event, payload }); return Promise.resolve('ok'); },
        unsubscribe() { kanalen.delete(topic); },
      };
    },
    auth: {
      async getSession() { return { data: { session: sessie() }, error: null }; },
      async signInAnonymously() {
        const r = await vraag({ t: 'auth', soort: 'anoniem' }); if (r.error) return r;
        zetSessie(r.data.session); return r;
      },
      async signInWithPassword({ email, password }) {
        const r = await vraag({ t: 'auth', soort: 'aanmelden', email, password }); if (r.error) return r;
        zetSessie(r.data.session); return r;
      },
      async signUp({ email, password }) {
        const r = await vraag({ t: 'auth', soort: 'registreren', email, password }); if (r.error) return r;
        zetSessie(r.data.session); return r;
      },
      async signOut() { zetSessie(null); return { error: null }; },
    },
  };
})();
