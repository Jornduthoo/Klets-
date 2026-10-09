// Tests voor SupabaseStore en SupabaseSync met een nagemaakte Supabase-client (geen netwerk nodig).
//   node tests/adapters.test.mjs
import { MockSupabase, maakKanalen, GeheugenOpslag } from './mock-supabase.mjs';

globalThis.localStorage = new GeheugenOpslag();
const { SupabaseStore, voegReizigerSamen } = await import('../js/core/supabase-store.js');
const { SupabaseSync } = await import('../js/core/sync.js');
const { LocalStore, DEFAULT_SETTINGS } = await import('../js/core/store.js');

let ok = 0, fout = 0;
function check(naam, v, extra = '') { if (v) { ok++; console.log('  ok   ' + naam); } else { fout++; console.log('  FOUT ' + naam + (extra ? ' -> ' + extra : '')); } }
const wacht = (ms) => new Promise(r => setTimeout(r, ms));

const KLAS = { id: '11111111-1111-1111-1111-111111111111', code: 'ABCDEF', rol: 'reiziger', pid: 'll_mila' };
const LEERKRACHT = { ...KLAS, rol: 'leerkracht', pid: undefined };
const meldingen = [];
function maak({ db, klas = KLAS, opslag = new GeheugenOpslag(), kanaal = maakKanalen() } = {}) {
  const st = new SupabaseStore({
    klant: async () => db, klas: () => klas, kanaal, opslag,
    rpc: async (naam, args) => { const r = await db.rpc(naam, args); if (r.error) throw Object.assign(new Error(r.error.message), r.error, { status: r.status }); return r.data; },
    netStatus: (s) => meldingen.push(s),
  });
  return st;
}

// 1. interface gelijk aan LocalStore
const methodes = (c) => Object.getOwnPropertyNames(c.prototype).filter(n => !n.startsWith('_') && n !== 'constructor').sort();
const missend = methodes(LocalStore).filter(m => !methodes(SupabaseStore).includes(m));
check('SupabaseStore heeft alle methodes van LocalStore', missend.length === 0, missend.join(', '));
const syncMissend = ['connect', 'publish', 'subscribe', 'close'].filter(m => typeof SupabaseSync.prototype[m] !== 'function');
check('SupabaseSync heeft connect/publish/subscribe/close', !syncMissend.length);

// 2. zonder klas: standaardwaarden, geen netwerk
{
  const db = new MockSupabase();
  const st = maak({ db, klas: null });
  const s = await st.getSettings();
  check('zonder klas: standaardinstellingen', s.huidigeWeek === DEFAULT_SETTINGS.huidigeWeek && s.huidigThema === DEFAULT_SETTINGS.huidigThema);
  check('zonder klas: geen reizigers en geen verzoeken', (await st.listPupils()).length === 0 && db.verzoeken === 0);
  st.stop();
}

// 3. bewaren en lezen
{
  const db = new MockSupabase();
  db.zetRij({ klas_id: KLAS.id, soort: 'settings', id: 'klas', data: { huidigeWeek: 3, allesOpen: true } });
  db.zetRij({ klas_id: KLAS.id, soort: 'pupil', id: 'll_noor', pid: 'll_noor', data: { id: 'll_noor', naam: 'Noor', xp: 40 } });
  const st = maak({ db });
  const s = await st.getSettings();
  check('instellingen komen van de server', s.huidigeWeek === 3 && s.allesOpen === true && s.mistDoel === DEFAULT_SETTINGS.mistDoel);
  await st.savePupil({ id: 'll_mila', naam: 'Mila', xp: 10, codes: [], kosmetiek: [] });
  const rij = db.tabellen.klasdata.find(r => r.id === 'll_mila');
  check('savePupil schrijft naar klasdata met pid = id', rij && rij.pid === 'll_mila' && rij.soort === 'pupil' && rij.data.naam === 'Mila');
  const lijst = await st.listPupils();
  check('listPupils gesorteerd op naam', lijst.map(p => p.naam).join() === 'Mila,Noor');
  const p = await st.getPupil('ll_mila'); p.xp = 999;
  check('getPupil geeft een kopie (aanpassen zonder bewaren verandert niets)', (await st.getPupil('ll_mila')).xp === 10);
  await st.addAttempt({ id: 'p-1', pid: 'll_mila', missie: 'm1', goed: 3, totaal: 4, ts: 2 });
  await st.addAttempt({ id: 'p-0', pid: 'll_mila', missie: 'm0', goed: 1, totaal: 4, ts: 1 });
  const att = await st.listAttempts({ pid: 'll_mila' });
  check('addAttempt + listAttempts({pid}) (op tijd gesorteerd)', att.length === 2 && att[0].id === 'p-0' && db.tabellen.klasdata.find(r => r.id === 'p-1')?.pid === 'll_mila');
  await st.addGallery({ id: 'g-1', pid: 'll_mila', naam: 'Mila', data: 'data:image/jpeg;base64,AAAA', ts: 3 });
  check('addGallery + listGallery', (await st.listGallery()).length === 1);
  st.stop();
}

// 4. offline: niets gaat verloren, wachtrij in localStorage, daarna doorsturen
{
  const db = new MockSupabase();
  db.zetRij({ klas_id: KLAS.id, soort: 'pupil', id: 'll_mila', pid: 'll_mila', data: { id: 'll_mila', naam: 'Mila', xp: 10 } });
  const opslag = new GeheugenOpslag();
  const st = maak({ db, opslag });
  await st.listPupils();
  db.offline = true; meldingen.length = 0;
  let gegooid = null;
  try {
    await st.addAttempt({ id: 'p-off', pid: 'll_mila', missie: 'm1', goed: 4, totaal: 4, ts: 5 });
    const f = await st.getPupil('ll_mila'); f.xp += 50; await st.savePupil(f);
  } catch (e) { gegooid = e; }
  check('offline: bewaren gooit geen fout', !gegooid, gegooid?.message);
  const q = JSON.parse(opslag.getItem(`vagant:sb:wachtrij:${KLAS.id}`) || '[]');
  check('offline: 2 wijzigingen in de wachtrij (localStorage)', q.length === 2, JSON.stringify(q.map(o => o.id)));
  check('offline: de app ziet haar eigen wijzigingen', (await st.getPupil('ll_mila')).xp === 60 && (await st.listAttempts({ pid: 'll_mila' })).some(a => a.id === 'p-off'));
  check('offline: melding "geen verbinding"', meldingen.some(m => m.online === false && m.wachtend === 2));
  check('offline: nog niets op de server', !db.tabellen.klasdata.some(r => r.id === 'p-off'));
  // het toestel herstart offline: een nieuwe store met dezelfde opslag
  const st2 = maak({ db, opslag });
  check('offline herstart: de reiziger en de wachtende resultaten zijn er nog', (await st2.getPupil('ll_mila'))?.xp === 60 && (await st2.listAttempts()).some(a => a.id === 'p-off'));
  st2.stop();
  // intussen verandert de leerkracht de routes op de server
  db.offline = false;
  db.zetRij({ klas_id: KLAS.id, soort: 'pupil', id: 'll_mila', pid: 'll_mila', data: { id: 'll_mila', naam: 'Mila', xp: 10, routes: { Wetenschap: 'telescoop' } } });
  await st.flush();
  const server = db.tabellen.klasdata.find(r => r.id === 'll_mila').data;
  check('weer online: wachtrij doorgestuurd', db.tabellen.klasdata.some(r => r.id === 'p-off') && JSON.parse(opslag.getItem(`vagant:sb:wachtrij:${KLAS.id}`)).length === 0);
  check('samenvoegen: XP van dit toestel, routes van de leerkracht', server.xp === 60 && server.routes?.Wetenschap === 'telescoop', JSON.stringify(server));
  check('melding verdwijnt', meldingen.at(-1)?.online === true && meldingen.at(-1)?.wachtend === 0);
  st.stop();
}

// 5. geweigerd door de server (RLS): fout in het Nederlands, niet eindeloos opnieuw, maar bewaard in 'mislukt'
{
  const db = new MockSupabase();
  const opslag = new GeheugenOpslag();
  const st = maak({ db, opslag });
  db.weiger = (r) => r.pid === 'll_noor';
  let e = null;
  try { await st.addAttempt({ id: 'p-x', pid: 'll_noor', ts: 1 }); } catch (x) { e = x; }
  check('geweigerd: VagantFout met Nederlandse uitleg', e && e.code === 'geweigerd' && /weigert/.test(e.message), e?.message);
  check('geweigerd: niet meer in de wachtrij, wel in "mislukt"', JSON.parse(opslag.getItem(`vagant:sb:wachtrij:${KLAS.id}`)).length === 0 && JSON.parse(opslag.getItem(`vagant:sb:mislukt:${KLAS.id}`)).length === 1);
  st.stop();
}

// 6. live: een andere gebruiker schrijft; het kanaal meldt 'db'; onChange en nieuwe gegevens
{
  const db = new MockSupabase();
  const kanaal = maakKanalen();
  const st = maak({ db, kanaal });
  db.zetRij({ klas_id: KLAS.id, soort: 'pupil', id: 'll_noor', pid: 'll_noor', data: { id: 'll_noor', naam: 'Noor', xp: 1 } });
  check('eerste keer: alles opgehaald', (await st.listPupils()).length === 1);
  let gemeld = 0; st.onChange(() => gemeld++);
  await wacht(10);
  db.zetRij({ klas_id: KLAS.id, soort: 'pupil', id: 'll_noor', pid: 'll_noor', data: { id: 'll_noor', naam: 'Noor', xp: 77 } });
  db.zetRij({ klas_id: KLAS.id, soort: 'attempt', id: 'p-n', pid: 'll_noor', data: { id: 'p-n', pid: 'll_noor', ts: 1 } });
  const server = await kanaal(KLAS.id);         // de 'server' zendt op hetzelfde topic
  server.send('db', { op: 'update', soort: 'pupil', ids: ['ll_noor'] });
  await wacht(400);
  check('onChange wordt opgeroepen na een db-melding', gemeld === 1);
  check('na de melding: enkel het nieuwe opgehaald (delta) en zichtbaar', (await st.getPupil('ll_noor')).xp === 77 && (await st.listAttempts()).length === 1);
  db.tabellen.klasdata = db.tabellen.klasdata.filter(r => r.id !== 'p-n');
  server.send('db', { op: 'delete', soort: 'attempt', ids: ['p-n'] });
  await wacht(400);
  check('verwijderd op de server -> ook weg op dit toestel', (await st.listAttempts()).length === 0);
  const voor = gemeld;
  await st.addAttempt({ id: 'p-eigen', pid: 'll_mila', ts: 9 });
  server.send('db', { op: 'insert', soort: 'attempt', ids: ['p-eigen'] });
  await wacht(400);
  check('de echo van een eigen wijziging geeft geen extra onChange', gemeld === voor);
  st.stop();
}

// 7. meer dan 1000 rijen (PostgREST-limiet): per pagina ophalen
{
  const db = new MockSupabase();
  for (let i = 0; i < 2500; i++) db.zetRij({ klas_id: KLAS.id, soort: 'attempt', id: 'p-' + i, pid: 'll_mila', data: { id: 'p-' + i, pid: 'll_mila', ts: i } });
  db.zetRij({ klas_id: '22222222-2222-2222-2222-222222222222', soort: 'attempt', id: 'p-ander', pid: 'x', data: { id: 'p-ander', pid: 'x' } });
  const st = maak({ db });
  const a = await st.listAttempts();
  check('2500 resultaten in pagina\'s van 1000 opgehaald (andere klas niet)', a.length === 2500 && !a.some(x => x.id === 'p-ander'));
  st.stop();
}

// 8. leerkracht: instellingen zonder PIN, verwijderen, import, reset
{
  const db = new MockSupabase();
  const geroepen = [];
  db.rpcs.vagant_verwijder_reiziger = (a) => { geroepen.push(['weg', a]); db.tabellen.klasdata = db.tabellen.klasdata.filter(r => r.pid !== a.p_pid); return { ok: true }; };
  db.rpcs.vagant_wis_klasdata = (a) => { geroepen.push(['wis', a]); db.tabellen.klasdata = db.tabellen.klasdata.filter(r => r.klas_id !== a.p_klas); return { ok: true }; };
  const st = maak({ db, klas: LEERKRACHT });
  await st.saveSettings({ huidigeWeek: 2, pin: '9999' });
  const rij = db.tabellen.klasdata.find(r => r.soort === 'settings');
  check('saveSettings bewaart zonder PIN (leerlingen kunnen de instellingen lezen)', rij && rij.data.huidigeWeek === 2 && !('pin' in rij.data) && rij.pid === null);
  const lokaal = new LocalStore('test');
  globalThis.localStorage.clear();
  await lokaal.savePupil({ id: 'll-a', naam: 'Anna', xp: 30, codes: ['X'] });
  await lokaal.addAttempt({ id: 'p-a', pid: 'll-a', ts: 1 });
  await st.importAll(await lokaal.exportAll(), { merge: true });
  check('importAll (lokale export -> klasdatabank)', db.tabellen.klasdata.some(r => r.id === 'll-a' && r.pid === 'll-a') && db.tabellen.klasdata.some(r => r.id === 'p-a' && r.pid === 'll-a'));
  await st.importAll(await lokaal.exportAll(), { merge: true });
  check('importAll twee keer: geen dubbele resultaten', db.tabellen.klasdata.filter(r => r.id === 'p-a').length === 1);
  const exp = await st.exportAll();
  check('exportAll in hetzelfde formaat als LocalStore', exp.formaat === 'klets-export' && exp.pupils['ll-a']?.naam === 'Anna' && exp.attempts.length === 1);
  await st.deletePupil('ll-a');
  check('deletePupil via vagant_verwijder_reiziger', geroepen[0]?.[0] === 'weg' && geroepen[0][1].p_pid === 'll-a' && !(await st.listPupils()).length && !(await st.listAttempts()).length);
  await st.reset();
  check('reset via vagant_wis_klasdata', geroepen.some(g => g[0] === 'wis') && !db.tabellen.klasdata.length);
  st.stop();
}

// 9. samenvoegen van een reiziger
{
  const m = voegReizigerSamen({ xp: 100, codes: ['A'], routes: { X: 'telescoop' }, geheimen: { gevonden: ['kat'], best: { k: 5 } } },
    { xp: 80, codes: ['B'], routes: { X: 'kompas' }, look: { haar: 'kort' }, geheimen: { gevonden: ['rat'], best: { k: 3, v: 2 } } }, { routesVanServer: true });
  check('samenvoegen: XP nooit achteruit, codes samen, routes van de server, look van het toestel',
    m.xp === 100 && m.codes.join() === 'A,B' && m.routes.X === 'telescoop' && m.look.haar === 'kort' && m.geheimen.gevonden.length === 2 && m.geheimen.best.k === 5);
}

// 10. SupabaseSync: de eindbaas tussen digibord en laptops
{
  const kanaal = maakKanalen();
  const bord = new SupabaseSync('klas', { klas: () => LEERKRACHT, kanaal });
  const laptop = new SupabaseSync('klas', { klas: () => KLAS, kanaal });
  const ander = new SupabaseSync('klas', { klas: () => ({ ...KLAS, id: '33333333-3333-3333-3333-333333333333' }), kanaal });
  await bord.connect(); await laptop.connect(); await ander.connect();
  const ontvangen = { bord: [], laptop: [], ander: [] };
  bord.subscribe('raid:hit', (p, meta) => ontvangen.bord.push([p, meta]));
  laptop.subscribe('raid:state', (p) => ontvangen.laptop.push(p));
  laptop.subscribe('raid:hit', (p) => ontvangen.laptop.push(p));
  ander.subscribe('raid:state', (p) => ontvangen.ander.push(p));
  bord.publish('raid:state', { raidId: 'r1', status: 'actief', hp: 20, maxHp: 20 });
  laptop.publish('raid:hit', { raidId: 'r1', hid: 'h1', pid: 'll_mila' });
  check('laptop ontvangt raid:state van het digibord', ontvangen.laptop.length === 1 && ontvangen.laptop[0].hp === 20);
  check('digibord ontvangt raid:hit met meta.from', ontvangen.bord.length === 1 && ontvangen.bord[0][0].hid === 'h1' && ontvangen.bord[0][1].from === laptop.id);
  check('een toestel hoort zijn eigen bericht niet', !ontvangen.laptop.some(p => p.hid === 'h1'));
  check('een andere klas hoort niets', ontvangen.ander.length === 0);
  const db = await kanaal(KLAS.id); db.send('db', { op: 'insert', soort: 'attempt' });
  check("'db'-meldingen gaan niet naar de app-handlers", ontvangen.laptop.length === 1);
  const zonderKlas = new SupabaseSync('klas', { klas: () => null, kanaal });
  await zonderKlas.connect(); zonderKlas.publish('raid:join', {});
  check('zonder klas: connect en publish doen niets (geen fout)', zonderKlas.ent === null);
  bord.close(); laptop.close(); ander.close();
}

console.log(`\n${ok} geslaagd, ${fout} mislukt`);
process.exit(fout ? 1 : 0);
