// SupabaseStore: dezelfde interface als LocalStore (zie store.js), maar de gegevens staan in de klasdatabank.
//
// Hoe het werkt:
//  - Alles van de klas staat in één tabel klasdata (klas_id, soort, id, pid, data). soort = settings | pupil | attempt | gallery | event.
//  - Dit toestel houdt een kopie in het geheugen. De eerste keer haalt het alles op, daarna enkel wat veranderde
//    (updated_at). Het privékanaal van de klas meldt elke wijziging ('db'), dan haalt het de nieuwe stukken op.
//  - Schrijven gaat eerst naar de kopie en een wachtrij (localStorage), daarna naar de server. Zonder wifi blijft
//    de wachtrij bewaard en gaat ze vanzelf door zodra er weer verbinding is: er gaat geen voortgang verloren.
//  - Een reiziger die zijn eigen reiziger bewaart, voegt samen met wat op de server staat: de routes komen van de
//    leerkracht, XP en gevonden codes gaan nooit achteruit.

import * as SB from './supabase.js';

const SOORTEN = ['settings', 'pupil', 'attempt', 'gallery', 'event'];
const PAGINA = 1000;            // PostgREST geeft max. 1000 rijen per keer
const VERS = 15000;             // zonder melding: na 15 s opnieuw kijken
const VOLLEDIG = 60 * 60000;    // af en toe alles opnieuw (vangt gemiste verwijderingen op); ook na een herverbinding
const GALERIJ_VERS = 60000;     // galerijfoto's zijn zwaar: apart en enkel op vraag ophalen

const kopie = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

/** De gevonden geheimen en de beste scores van twee toestellen samenvoegen. */
export function voegGeheimen(a, b) {
  if (!a && !b) return undefined;
  const best = { ...(a?.best || {}) };
  for (const [k, v] of Object.entries(b?.best || {})) best[k] = Math.max(best[k] || 0, v || 0);
  return { gevonden: [...new Set([...(a?.gevonden || []), ...(b?.gevonden || [])])], best };
}
/** Server-versie + versie van dit toestel van dezelfde reiziger. */
export function voegReizigerSamen(server, lokaal, { routesVanServer = false } = {}) {
  if (!server) return lokaal;
  const uit = { ...server, ...lokaal,
    xp: Math.max(server.xp || 0, lokaal.xp || 0),
    codes: [...new Set([...(server.codes || []), ...(lokaal.codes || [])])],
    kosmetiek: [...new Set([...(server.kosmetiek || []), ...(lokaal.kosmetiek || [])])],
    gezien: [...new Set([...(server.gezien || []), ...(lokaal.gezien || [])])] };
  const g = voegGeheimen(server.geheimen, lokaal.geheimen); if (g) uit.geheimen = g;
  if (routesVanServer && server.routes) uit.routes = server.routes;
  return uit;
}

export class SupabaseStore {
  /**
   * @param {object} o
   *  - klant: async () => supabase-client (standaard SB.klant)
   *  - klas: () => { id, code, rol, pid } | null (standaard SB.huidigeKlas)
   *  - kanaal: async (klasId) => kanaal met .on(event, fn) (standaard SB.klasKanaal)
   *  - opslag: localStorage-achtig object
   */
  constructor({ url, anonKey, klant, klas, kanaal, opslag, rpc, netStatus } = {}) {
    this.url = url; this.anonKey = anonKey;
    this._klant = klant || SB.klant;
    this._klas = klas || SB.huidigeKlas;
    this._kanaal = kanaal || ((id) => SB.klasKanaal(id));
    this._rpc = rpc || SB.rpc;
    this._netStatus = netStatus || SB.toonNetStatus;
    this._opslag = opslag || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.isOnline = true;          // in de klasdatabank (niet: is er wifi)
    this._leeg();
    this._luisteraars = new Set();
    this._eigen = new Map();   // soort|id -> wanneer dit toestel het bewaarde
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flush().catch(() => {}));
      window.addEventListener('vagant-klas', () => { this._leeg(); this._verbind(); });
    }
    this._herhaal = setInterval(() => { if (this.klasId && this._wachtrij().length) this.flush().catch(() => {}); }, 20000);
    this._herhaal.unref?.();
  }
  stop() { clearInterval(this._herhaal); clearTimeout(this._meldT); }
  _leeg() {
    this.d = Object.fromEntries(SOORTEN.map(s => [s, new Map()]));
    this.klasId = null; this.geladen = false; this.vuil = true; this.laatste = null; this.gesyncOp = 0; this.volledigOp = 0; this.galerijOp = 0;
    this._bezig = null;
  }
  _k() {
    const k = this._klas();
    if (k?.id !== this.klasId) { const id = k?.id || null; this._leeg(); this.klasId = id; if (id) this._laadKopie(); }
    return k;
  }
  _rol() { return this._k()?.rol || null; }

  // ---------- lokale kopie en wachtrij (localStorage) ----------
  _sl(naam) { return `vagant:sb:${naam}:${this.klasId}`; }
  _leesLS(k, f) { try { const r = this._opslag?.getItem(k); return r ? JSON.parse(r) : f; } catch { return f; } }
  _schrijfLS(k, v) { try { this._opslag?.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
  _wachtrij() { return this.klasId ? this._leesLS(this._sl('wachtrij'), []) : []; }
  _zetWachtrij(q) {
    if (!this._schrijfLS(this._sl('wachtrij'), q)) {
      // opslag vol: geen galerijfoto's in de wachtrij houden, de rest wel
      this._schrijfLS(this._sl('wachtrij'), q.filter(o => o.soort !== 'gallery'));
    }
  }
  /** Bewaar een beperkte kopie voor als het toestel offline opstart (instellingen, reizigers, eigen resultaten). */
  _bewaarKopie() {
    if (!this.klasId) return;
    const k = this._klas();
    const att = [...this.d.attempt.values()].filter(a => k?.rol === 'reiziger' ? a.pid === k.pid : false);
    this._schrijfLS(this._sl('kopie'), { settings: [...this.d.settings.values()], pupil: [...this.d.pupil.values()], attempt: att, event: [...this.d.event.values()] });
  }
  _laadKopie() {
    const c = this._leesLS(this._sl('kopie'), null);
    if (c) for (const s of SOORTEN) for (const x of c[s] || []) this.d[s].set(s === 'settings' ? 'klas' : x.id, x);
    this._pasWachtrijToe();
  }
  _pasWachtrijToe() {
    for (const o of this._wachtrij()) {
      if (o.op === 'del') this.d[o.soort].delete(o.id); else this.d[o.soort].set(o.id, o.data);
    }
  }
  _zetOnline(online) {
    this.isOnline = online;
    try { this._netStatus({ online, wachtend: this._wachtrij().length }); } catch { /* geen DOM */ }
  }

  // ---------- ophalen ----------
  async _sync({ forceer = false } = {}) {
    const k = this._k(); if (!k) return;
    const nu = Date.now();
    if (!forceer && this.geladen && !this.vuil && nu - this.gesyncOp < VERS) return;
    if (this._bezig) return this._bezig;
    this._bezig = (async () => {
      await null;
      try {
        try { await this.flush(); } catch (e) { console.warn('Vagant: een wijziging werd geweigerd', e); }
        const volledig = forceer || !this.geladen || nu - this.volledigOp > VOLLEDIG;
        this.vuil = false;
        const rijen = await this._haal(volledig ? null : this.laatste);
        if (volledig) for (const s of SOORTEN) if (s !== 'gallery') this.d[s].clear();
        for (const r of rijen) {
          if (!this.d[r.soort]) continue;
          this.d[r.soort].set(r.id, r.data);
          if (!this.laatste || r.updated_at > this.laatste) this.laatste = r.updated_at;
        }
        this._pasWachtrijToe();
        this.geladen = true; this.gesyncOp = Date.now(); if (volledig) this.volledigOp = this.gesyncOp;
        this._zetOnline(true);
        this._bewaarKopie();
        this._verbind();
      } catch (e) {
        this.vuil = true;
        if (SB.isNetwerkfout(e)) this._zetOnline(false);
        else console.warn('Vagant: ophalen mislukt', e);
      } finally { this._bezig = null; }
    })();
    return this._bezig;
  }
  async _haal(sinds, { galerij = false } = {}) {
    const kl = await this._klant();
    const uit = [];
    for (let van = 0; ; van += PAGINA) {
      let q = kl.from('klasdata').select('soort,id,pid,data,updated_at').eq('klas_id', this.klasId);
      q = galerij ? q.eq('soort', 'gallery') : q.neq('soort', 'gallery');
      if (sinds) q = q.gte('updated_at', sinds);
      const { data, error } = await q.order('updated_at', { ascending: true }).order('soort').order('id').range(van, van + PAGINA - 1);
      if (error) throw SB.vertaalFout(error);
      uit.push(...(data || []));
      if (!data || data.length < PAGINA) break;
    }
    return uit;
  }
  /** Luister op het klaskanaal naar wijzigingen ('db'). */
  async _verbind() {
    const id = this.klasId; if (!id || this._verbondenMet === id) return;
    this._verbondenMet = id;
    try {
      const ent = await this._kanaal(id);
      ent.on('db', (p) => {
        if (this.klasId !== id) return;
        if (p?.op === 'delete') {
          if (Array.isArray(p.ids)) for (const x of p.ids) this.d[p.soort]?.delete(x);
          else this.geladen = false;   // te veel: alles opnieuw
        }
        this.vuil = true;
        // de echo van wat dit toestel zelf net bewaarde: geen nieuwe tekenbeurt nodig
        const nu = Date.now();
        if (Array.isArray(p?.ids) && p.op !== 'delete' && p.ids.length && p.ids.every(x => nu - (this._eigen.get(p.soort + "|" + x) || 0) < 5000)) return;
        this._meld(p?.soort);
      });
      let eerder = false;
      ent.opStatus?.((s) => {
        if (s !== 'SUBSCRIBED' || this.klasId !== id) return;
        // na een onderbreking kunnen er meldingen gemist zijn: alles opnieuw ophalen
        if (eerder) { this.geladen = false; this.galerijOp = 0; }
        eerder = true; this.vuil = true; this.flush().catch(() => {});
      });
    } catch (e) { this._verbondenMet = null; console.warn('Vagant: live-kanaal niet beschikbaar', e); }
  }
  _meld(soort) {
    clearTimeout(this._meldT);
    this._meldT = setTimeout(() => { for (const fn of this._luisteraars) { try { fn(soort || 'klasdata'); } catch (e) { console.error(e); } } }, 300);
  }

  // ---------- schrijven ----------
  _schrijf(soort, id, data, pid = null) {
    const k = this._k(); if (!k) throw new SB.VagantFout('geen_klas', 'Dit toestel is nog niet aangemeld bij een klas.');
    data = kopie(data);
    this.d[soort].set(id, data);
    this._eigen.set(soort + '|' + id, Date.now());
    if (this._eigen.size > 500) this._eigen.clear();
    const q = this._wachtrij().filter(o => !(o.soort === soort && o.id === id));
    q.push({ op: 'zet', soort, id, pid, data, t: Date.now() });
    this._zetWachtrij(q);
    return data;
  }
  _wis(soort, id) {
    this._k();
    this.d[soort].delete(id);
    const q = this._wachtrij().filter(o => !(o.soort === soort && o.id === id));
    q.push({ op: 'del', soort, id, t: Date.now() });
    this._zetWachtrij(q);
  }
  /** Stuur de wachtrij door. Netwerkfout: alles blijft staan. Geweigerd: die wijziging gaat naar 'mislukt' en we melden het. */
  async flush() {
    const k = this._k(); if (!k) return;
    if (this._flushBezig) return this._flushBezig;
    this._flushBezig = (async () => {
      await null;   // eerst _flushBezig laten zetten, ook als de wachtrij leeg is
      let fout = null;
      try {
        for (;;) {
          const q = this._wachtrij(); if (!q.length) break;
          const eerste = q[0];
          // groepeer: opeenvolgende 'zet' van dezelfde soort samen (max. 200), 'del' een voor een
          let n = 1;
          if (eerste.op === 'zet' && eerste.soort !== 'pupil') while (n < q.length && n < 200 && q[n].op === 'zet' && q[n].soort === eerste.soort) n++;
          const groep = q.slice(0, n);
          try {
            await this._stuur(groep, k);
          } catch (e) {
            if (SB.isNetwerkfout(e)) { this._zetOnline(false); return; }
            // geweigerd: niet eindeloos opnieuw proberen, maar ook niet weggooien
            const mislukt = this._leesLS(this._sl('mislukt'), []);
            mislukt.push(...groep.map(o => ({ ...o, fout: e.message })));
            this._schrijfLS(this._sl('mislukt'), mislukt.slice(-200));
            fout = fout || SB.vertaalFout(e);
          }
          const gestuurd = new Set(groep.map(o => o.soort + '\u0000' + o.id + '\u0000' + o.t));
          this._zetWachtrij(this._wachtrij().filter(o => !gestuurd.has(o.soort + '\u0000' + o.id + '\u0000' + o.t)));
        }
        this._zetOnline(true);
      } finally { this._flushBezig = null; }
      if (fout) throw fout;
    })();
    return this._flushBezig;
  }
  async _stuur(groep, k) {
    const kl = await this._klant();
    const o = groep[0];
    if (o.op === 'del') {
      const { error } = await kl.from('klasdata').delete().eq('klas_id', this.klasId).eq('soort', o.soort).eq('id', o.id);
      if (error) throw error;
      return;
    }
    let rijen = groep.map(x => ({ klas_id: this.klasId, soort: x.soort, id: x.id, pid: x.pid, data: x.data }));
    if (o.soort === 'pupil' && k.rol === 'reiziger') {
      // samenvoegen met de server (bv. na een tijd offline, of de leerkracht veranderde de routes)
      const { data, error } = await kl.from('klasdata').select('data').eq('klas_id', this.klasId).eq('soort', 'pupil').eq('id', o.id).maybeSingle();
      if (error) throw error;
      if (data?.data) { rijen[0].data = voegReizigerSamen(data.data, o.data, { routesVanServer: true }); this.d.pupil.set(o.id, rijen[0].data); }
    }
    const nieuw = o.soort === 'attempt' || o.soort === 'gallery' || o.soort === 'event';
    const { error } = await kl.from('klasdata').upsert(rijen, { onConflict: 'klas_id,soort,id', ignoreDuplicates: nieuw });
    if (error) throw error;
  }
  async _bewaar(soort, id, data, pid) {
    const d = this._schrijf(soort, id, data, pid);
    try { await this.flush(); } catch (e) {
      // geweigerd: de kopie terugzetten naar de server-versie bij de volgende keer ophalen
      this.vuil = true; this.geladen = false; throw e;
    }
    return d;
  }

  // ---------- de interface van LocalStore ----------
  async getSettings() {
    const { DEFAULT_SETTINGS } = await import('./store.js');
    if (!this._k()) return { ...DEFAULT_SETTINGS };
    await this._sync();
    return { ...DEFAULT_SETTINGS, ...kopie(this.d.settings.get('klas') || {}) };
  }
  async saveSettings(patch) {
    const s = { ...(await this.getSettings()), ...patch };
    const opslaan = { ...s }; delete opslaan.pin;   // de PIN hoort niet in de klasdatabank (leerlingen kunnen ze lezen)
    await this._bewaar('settings', 'klas', opslaan, null);
    return s;
  }

  async listPupils() {
    if (!this._k()) return [];
    await this._sync();
    return [...this.d.pupil.values()].map(kopie).sort((a, b) => String(a.naam).localeCompare(String(b.naam), 'nl'));
  }
  async getPupil(id) {
    if (!this._k()) return null;
    await this._sync();
    return kopie(this.d.pupil.get(id) || null);
  }
  async savePupil(p) { await this._bewaar('pupil', p.id, p, p.id); return p; }
  async deletePupil(id) {
    if (!this._k()) return;
    await this._rpc('vagant_verwijder_reiziger', { p_klas: this.klasId, p_pid: id });
    this.d.pupil.delete(id);
    for (const s of ['attempt', 'gallery']) for (const [k, v] of this.d[s]) if (v.pid === id) this.d[s].delete(k);
    this._zetWachtrij(this._wachtrij().filter(o => !(o.soort === 'pupil' && o.id === id) && o.pid !== id));
  }

  async addAttempt(a) { await this._bewaar('attempt', a.id, a, a.pid); return a; }
  async listAttempts(filter = {}) {
    if (!this._k()) return [];
    await this._sync();
    let all = [...this.d.attempt.values()];
    if (filter.pid) all = all.filter(a => a.pid === filter.pid);
    return all.sort((a, b) => (a.ts || 0) - (b.ts || 0)).map(kopie);
  }

  async addGallery(item) { await this._bewaar('gallery', item.id, item, item.pid); return item; }
  async listGallery() {
    if (!this._k()) return [];
    await this._sync();
    if (Date.now() - (this.galerijOp || 0) > GALERIJ_VERS) {
      try {
        const rijen = await this._haal(null, { galerij: true });
        const wacht = new Set(this._wachtrij().filter(o => o.soort === 'gallery').map(o => o.id));
        for (const k of [...this.d.gallery.keys()]) if (!wacht.has(k)) this.d.gallery.delete(k);
        for (const r of rijen) this.d.gallery.set(r.id, r.data);
        this._pasWachtrijToe();
        this.galerijOp = Date.now();
      } catch (e) { if (!SB.isNetwerkfout(e)) console.warn('Vagant: galerij ophalen mislukt', e); }
    }
    return [...this.d.gallery.values()].sort((a, b) => (a.ts || 0) - (b.ts || 0)).map(kopie);
  }
  async deleteGallery(id) { this._wis('gallery', id); await this.flush(); }

  async addEvent(e) { await this._bewaar('event', e.id, e, null); return e; }
  async listEvents() {
    if (!this._k()) return [];
    await this._sync();
    return [...this.d.event.values()].sort((a, b) => (a.ts || 0) - (b.ts || 0)).map(kopie);
  }

  async exportAll() {
    await this._sync({ forceer: true });
    return {
      formaat: 'klets-export', versie: 1, datum: new Date().toISOString(),
      settings: await this.getSettings(), pupils: Object.fromEntries([...this.d.pupil.entries()].map(([k, v]) => [k, kopie(v)])),
      attempts: await this.listAttempts(), gallery: await this.listGallery(), events: await this.listEvents(),
    };
  }
  /** Zoals LocalStore. Handig om de gegevens van de toestellen (lokale modus) naar de klasdatabank te brengen. */
  async importAll(data, { merge = true } = {}) {
    if (!data || data.formaat !== 'klets-export') throw new Error('Dit is geen Vagant-exportbestand.');
    if (this._rol() !== 'leerkracht') throw new SB.VagantFout('geen_leerkracht');
    if (!merge) await this.reset();
    else await this._sync({ forceer: true });
    if (data.settings) { const s = { ...(this.d.settings.get('klas') || {}), ...data.settings }; delete s.pin; this._schrijf('settings', 'klas', s, null); }
    for (const [id, p] of Object.entries(data.pupils || {})) {
      const cur = this.d.pupil.get(id);
      this._schrijf('pupil', id, cur ? voegReizigerSamen(cur, p) : { ...p, id }, id);
    }
    const lijst = (soort, l, metPid) => { for (const x of l || []) if (x?.id && !this.d[soort].has(x.id)) this._schrijf(soort, x.id, x, metPid ? x.pid : null); };
    lijst('attempt', data.attempts, true); lijst('gallery', data.gallery, true); lijst('event', data.events, false);
    await this.flush();
  }
  async reset() {
    if (!this._k()) return;
    await this._rpc('vagant_wis_klasdata', { p_klas: this.klasId });
    for (const s of SOORTEN) this.d[s].clear();
    this._zetWachtrij([]);
    this._bewaarKopie();
  }

  onChange(cb) {
    this._luisteraars.add(cb);
    this._k(); this._verbind();
    return () => this._luisteraars.delete(cb);
  }
}
