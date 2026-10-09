// RLS-tests voor sql/vagant-supabase.sql, zonder echte Supabase: het script draait in PGlite (Postgres 17 in WebAssembly)
// bovenop een kleine nabootsing van Supabase (tests/supabase-stub.sql: rollen anon/authenticated, auth.uid(), realtime).
//
//   npm i --no-save @electric-sql/pglite@0.3.7     (eenmalig, in een map naar keuze)
//   PGLITE=/pad/naar/node_modules/@electric-sql/pglite/dist/index.js node tests/rls.test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { PGlite } = await import(process.env.PGLITE || '@electric-sql/pglite');
const hier = dirname(fileURLToPath(import.meta.url));
// PGlite kent geen GRANT CREATE ON DATABASE; de stub maakt het schema vagant_priv daarom vooraf (eigenaar sb_eigenaar).
const SCRIPT = readFileSync(join(hier, '..', 'sql', 'vagant-supabase.sql'), 'utf8').replace('create schema if not exists vagant_priv;', '');
const STUB = readFileSync(join(hier, 'supabase-stub.sql'), 'utf8');

let ok = 0, fout = 0;
function check(naam, voorwaarde, extra = '') {
  if (voorwaarde) { ok++; console.log('  ok   ' + naam); }
  else { fout++; console.log('  FOUT ' + naam + (extra ? ' -> ' + extra : '')); }
}

const db = new PGlite();
await db.exec(STUB);
// het script twee keer draaien (idempotent), als een rol zonder superuser maar met BYPASSRLS, zoals 'postgres' in Supabase
for (let i = 0; i < 2; i++) {
  try { await db.exec('set role sb_eigenaar;' + SCRIPT + '; reset role;'); }
  catch (e) { console.log('Script faalt:', e.message, e.where || ''); process.exit(1); }
}
check('script draait twee keer na elkaar zonder fouten (idempotent)', true);

const U = {
  juf: '00000000-0000-0000-0000-00000000000a', juf2: '00000000-0000-0000-0000-00000000000b',
  mila: '00000000-0000-0000-0000-000000000001', noor: '00000000-0000-0000-0000-000000000002',
  ali: '00000000-0000-0000-0000-000000000003', milaTablet: '00000000-0000-0000-0000-000000000004',
  vreemd: '00000000-0000-0000-0000-000000000005', extra: '00000000-0000-0000-0000-000000000006',
};
for (const [n, id] of Object.entries(U)) {
  await db.query('insert into auth.users (id, email, is_anonymous) values ($1, $2, $3)', [id, n.startsWith('juf') ? n + '@school.test' : null, !n.startsWith('juf')]);
}

/** Voer sql uit als een gebruiker (zoals PostgREST: rol authenticated + JWT-claims). */
async function als(wie, sql, params = []) {
  await db.exec('reset role');
  if (wie === 'anon') {
    await db.query("select set_config('request.jwt.claims', '{\"role\":\"anon\"}', false)");
    await db.exec('set role anon');
  } else {
    const claims = JSON.stringify({ sub: U[wie], role: 'authenticated', is_anonymous: !wie.startsWith('juf') });
    await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
    await db.exec('set role authenticated');
  }
  try { return await db.query(sql, params); }
  finally { await db.exec('reset role'); }
}
async function poging(wie, sql, params) {
  try { const r = await als(wie, sql, params); return { ok: true, r }; } catch (e) { return { ok: false, e }; }
}
const rpc = async (wie, fn, args = []) => {
  const ph = args.map((_, i) => '$' + (i + 1)).join(', ');
  return (await als(wie, `select public.${fn}(${ph}) as r`, args)).rows[0].r;
};
const telData = async (wie, klas) => Number((await als(wie, 'select count(*)::int as n from public.klasdata where klas_id = $1', [klas])).rows[0].n);

console.log('Klassen maken');
const kA = await rpc('juf', 'vagant_maak_klas', ['6A']);
const kB = await rpc('juf2', 'vagant_maak_klas', ['6B']);
check('leerkracht maakt klas A met klascode', kA.ok && /^[A-HJ-NP-Z2-9]{6}$/.test(kA.klas.code), JSON.stringify(kA));
check('tweede leerkracht maakt klas B', kB.ok && kB.klas.code !== kA.klas.code);
const A = kA.klas.id, B = kB.klas.id;
const anonKlas = await rpc('mila', 'vagant_maak_klas', ['hack']);
check('anonieme gebruiker (leerling) kan geen klas maken', !anonKlas.ok && anonKlas.reden === 'enkel_leerkracht');

console.log('Reizigers aansluiten');
const mila = await rpc('mila', 'vagant_nieuwe_reiziger', [kA.klas.code.toLowerCase(), '  Mila ']);
check('Mila sluit aan bij klas A (klascode hoofdletterongevoelig, spaties weg)', mila.ok && mila.bijnaam === 'Mila' && /^\d{4}$/.test(mila.pin), JSON.stringify(mila));
const milaOpnieuw = await rpc('mila', 'vagant_nieuwe_reiziger', [kA.klas.code, 'mila']);
check('opnieuw proberen op hetzelfde toestel geeft dezelfde reiziger', milaOpnieuw.ok && milaOpnieuw.pid === mila.pid);
const noor = await rpc('noor', 'vagant_nieuwe_reiziger', [kA.klas.code, 'Noor']);
const ali = await rpc('ali', 'vagant_nieuwe_reiziger', [kB.klas.code, 'Ali']);
check('Noor (klas A) en Ali (klas B) sluiten aan', noor.ok && ali.ok);
check('een bestaande bijnaam kan niet nog eens (ander toestel)', (await rpc('vreemd', 'vagant_nieuwe_reiziger', [kA.klas.code, 'MILA'])).reden === 'bijnaam_bestaat');
for (const slecht of ['a', 'mila@school.be', 'Jan1234', 'Een veel te lange bijnaam', '<script>']) {
  check(`bijnaam '${slecht}' wordt geweigerd`, (await rpc('vreemd', 'vagant_nieuwe_reiziger', [kA.klas.code, slecht])).reden === 'bijnaam');
}
check('foute klascode -> onbekend', (await rpc('vreemd', 'vagant_klas_info', ['ZZZZZZ'])).reden === 'onbekend');
check('juiste klascode -> klasnaam', (await rpc('vreemd', 'vagant_klas_info', [kA.klas.code])).klas?.naam === '6A');
check('de leerkracht kan geen reiziger worden in de eigen klas', (await rpc('juf', 'vagant_nieuwe_reiziger', [kA.klas.code, 'Juf'])).reden === 'enkel_reiziger');
const mk = await rpc('mila', 'vagant_mijn_klas', [kA.klas.code]);
check('vagant_mijn_klas geeft rol en pid terug', mk.ok && mk.rol === 'reiziger' && mk.pid === mila.pid && mk.bijnaam === 'Mila');

console.log('Lezen');
check('Mila ziet de reizigers van klas A (2 documenten)', await telData('mila', A) === 2);
check('Mila ziet NIETS van klas B', await telData('mila', B) === 0);
check('Ali ziet NIETS van klas A', await telData('ali', A) === 0);
check('een niet-lid (ander toestel) ziet niets van klas A', await telData('vreemd', A) === 0);
const anonLees = await poging('anon', 'select count(*) from public.klasdata');
check('niet aangemeld (rol anon) mag de tabel niet eens lezen', !anonLees.ok);
check('de leerkracht ziet alles van klas A', await telData('juf', A) === 2);
check('de leerkracht van A ziet niets van klas B', await telData('juf', B) === 0);
const pinsMila = (await als('mila', 'select pid, pin from public.reizigers')).rows;
check('Mila ziet enkel haar eigen pincode', pinsMila.length === 1 && pinsMila[0].pid === mila.pid);
const pinsJuf = (await als('juf', 'select pid, pin from public.reizigers where klas_id = $1', [A])).rows;
check('de leerkracht ziet alle pincodes van klas A', pinsJuf.length === 2);
check('de leerkracht van B ziet geen pincodes van A', (await als('juf2', 'select * from public.reizigers where klas_id = $1', [A])).rows.length === 0);
check('Mila ziet enkel haar eigen lidmaatschap', (await als('mila', 'select * from public.leden')).rows.length === 1);
check('de leerkracht ziet alle toestellen van klas A', (await als('juf', 'select * from public.leden where klas_id = $1', [A])).rows.length === 3);
check('Mila ziet haar klas', (await als('mila', 'select * from public.klassen')).rows.length === 1);
check('de pogingen-tabel is niet leesbaar', !(await poging('juf', 'select * from vagant_priv.pogingen')).ok);

console.log('Schrijven');
const doc = (id, data) => JSON.stringify({ id, ...data });
let r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'pupil', $2, $2, $3)
  on conflict (klas_id, soort, id) do update set data = excluded.data`, [A, mila.pid, doc(mila.pid, { naam: 'Mila', xp: 50 })]);
check('Mila bewaart haar eigen reiziger (upsert)', r.ok, r.e?.message);
r = await poging('mila', `update public.klasdata set data = data || '{"xp":9999}' where klas_id = $1 and soort = 'pupil' and id = $2`, [A, noor.pid]);
check('Mila kan Noor NIET aanpassen (0 rijen)', r.ok && r.r.affectedRows === 0);
r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'pupil', 'll-nep', 'll-nep', $2)`, [A, doc('ll-nep', { naam: 'Nep' })]);
check('Mila kan geen andere reiziger aanmaken', !r.ok);
r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-1', $2, $3)`, [A, mila.pid, doc('p-1', { pid: mila.pid, goed: 3, totaal: 4 })]);
check('Mila bewaart een eigen resultaat', r.ok, r.e?.message);
r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-2', $2, $3)`, [A, noor.pid, doc('p-2', { pid: noor.pid })]);
check('Mila kan geen resultaat voor Noor bewaren', !r.ok);
r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-3', $2, $3)`, [A, mila.pid, doc('p-3', { pid: noor.pid })]);
check('pid-kolom en data.pid moeten kloppen', !r.ok);
r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, data) values ($1, 'settings', 'klas', '{"allesOpen":true}')`, [A]);
check('Mila kan de instellingen niet veranderen', !r.ok);
r = await poging('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-4', $2, $3)`, [B, mila.pid, doc('p-4', { pid: mila.pid })]);
check('Mila kan niets in klas B schrijven', !r.ok);
r = await poging('mila', `delete from public.klasdata where klas_id = $1`, [A]);
check('Mila kan niets verwijderen (0 rijen)', r.ok && r.r.affectedRows === 0);
r = await poging('mila', `update public.klassen set naam = 'hack' where id = $1`, [A]);
check('Mila kan de klasnaam niet veranderen', r.ok && r.r.affectedRows === 0);
r = await poging('juf', `update public.klassen set code = 'AAAAAA' where id = $1`, [A]);
check('zelfs de leerkracht kan de klascode niet rechtstreeks veranderen', !r.ok);
r = await poging('juf', `update public.klassen set naam = '6A Zwinvliet' where id = $1`, [A]);
check('de leerkracht kan de klasnaam veranderen', r.ok && r.r.affectedRows === 1);
r = await poging('mila', `insert into public.reizigers (klas_id, pid, bijnaam, pin) values ($1, 'x', 'Xx', '1111')`, [A]);
check('niemand schrijft rechtstreeks in reizigers', !r.ok);
r = await poging('mila', `insert into public.leden (klas_id, user_id, rol) values ($1, $2, 'leerkracht')`, [A, U.mila]);
check('niemand maakt zichzelf rechtstreeks lid/leerkracht', !r.ok);

r = await poging('juf', `insert into public.klasdata (klas_id, soort, id, data) values ($1, 'settings', 'klas', '{"huidigeWeek":2}')`, [A]);
check('de leerkracht bewaart de instellingen', r.ok, r.e?.message);
r = await poging('juf', `update public.klasdata set data = data || '{"routes":{"Wetenschap":"telescoop"}}' where klas_id = $1 and soort = 'pupil' and id = $2`, [A, noor.pid]);
check('de leerkracht past Noor aan', r.ok && r.r.affectedRows === 1);
r = await poging('juf', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'pupil', 'll-zoe', 'll-zoe', $2)`, [A, doc('ll-zoe', { naam: 'Zoë' })]);
check('de leerkracht voegt een reiziger toe', r.ok, r.e?.message);
const zoe = (await als('juf', `select pin, bijnaam from public.reizigers where klas_id = $1 and pid = 'll-zoe'`, [A])).rows[0];
check('... en die krijgt automatisch een pincode', zoe && /^\d{4}$/.test(zoe.pin) && zoe.bijnaam === 'Zoë');
r = await poging('juf', `insert into public.klasdata (klas_id, soort, id, data) values ($1, 'settings', 'klas', '{}')`, [B]);
check('de leerkracht van A kan niets in klas B schrijven', !r.ok);
r = await poging('juf2', `delete from public.klasdata where klas_id = $1`, [A]);
check('de leerkracht van B kan niets in klas A wissen', r.ok && r.r.affectedRows === 0);
check('de leerkracht van B kan geen reiziger van A verwijderen', (await rpc('juf2', 'vagant_verwijder_reiziger', [A, mila.pid])).reden === 'geen_leerkracht');
check('de leerkracht van B kan geen pincode van A opvragen', (await rpc('juf2', 'vagant_nieuwe_pin', [A, mila.pid])).reden === 'geen_leerkracht');
r = await poging('mila', `update public.klasdata set data = data || '{"naam":"Noor"}' where klas_id = $1 and soort = 'pupil' and id = $2`, [A, mila.pid]);
check('Mila kan zich niet hernoemen naar een bestaande bijnaam', !r.ok);
r = await poging('mila', `update public.klasdata set data = data || '{"naam":"Milou"}' where klas_id = $1 and soort = 'pupil' and id = $2`, [A, mila.pid]);
const nieuweNaam = (await als('mila', 'select bijnaam from public.reizigers')).rows[0]?.bijnaam;
check('Mila hernoemt zich: de bijnaam volgt', r.ok && nieuweNaam === 'Milou', r.e?.message);
await als('mila', `update public.klasdata set data = data || '{"naam":"Mila"}' where klas_id = $1 and soort = 'pupil' and id = $2`, [A, mila.pid]);

console.log('Op een ander toestel aanmelden (bijnaam + pincode)');
const foutPin = mila.pin === '0000' ? '0001' : '0000';
check('foute pincode -> geweigerd', (await rpc('milaTablet', 'vagant_aanmelden', [kA.klas.code, 'Mila', foutPin])).reden === 'pin');
check('tablet ziet nog niets van klas A', await telData('milaTablet', A) === 0);
const terug = await rpc('milaTablet', 'vagant_aanmelden', [kA.klas.code, 'mila', mila.pin]);
check('juiste pincode -> zelfde reiziger op het nieuwe toestel', terug.ok && terug.pid === mila.pid, JSON.stringify(terug));
check('het nieuwe toestel ziet klas A', await telData('milaTablet', A) > 0);
r = await poging('milaTablet', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-5', $2, $3)`, [A, mila.pid, doc('p-5', { pid: mila.pid })]);
check('... en schrijft voor Mila', r.ok);
for (let i = 0; i < 5; i++) await rpc('extra', 'vagant_aanmelden', [kA.klas.code, 'Noor', foutPin === noor.pin ? '9999' : foutPin]);
check('na 5 foute pincodes is Noor 15 minuten geblokkeerd (ook met de juiste)', (await rpc('extra', 'vagant_aanmelden', [kA.klas.code, 'Noor', noor.pin])).reden === 'geblokkeerd');
const np = await rpc('juf', 'vagant_nieuwe_pin', [A, noor.pid]);
check('de leerkracht geeft een nieuwe pincode en heft de blokkering op', np.ok && (await rpc('extra', 'vagant_aanmelden', [kA.klas.code, 'Noor', np.pin])).ok);

console.log('Rem en maxima');
await db.query('update public.klassen set max_reizigers = 3 where id = $1', [A]);
check('klas vol -> geen nieuwe reiziger', (await rpc('vreemd', 'vagant_nieuwe_reiziger', [kA.klas.code, 'Lotte'])).reden === 'klas_vol');
r = await poging('juf', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'pupil', 'll-x', 'll-x', $2)`, [A, doc('ll-x', { naam: 'Extra' })]);
check('klas vol -> ook de leerkracht voegt niemand meer toe', !r.ok);
await db.query('update public.klassen set max_reizigers = 40 where id = $1', [A]);
for (let i = 0; i < 20; i++) await rpc('vreemd', 'vagant_klas_info', ['QQQQQ' + 'ABCDEFGHJKLMNPQRSTUV'[i]]);
check('na 20 foute klascodes per uur is het toestel geblokkeerd', (await rpc('vreemd', 'vagant_klas_info', [kA.klas.code])).reden === 'geblokkeerd');
for (let i = 0; i < 4; i++) await rpc('juf', 'vagant_maak_klas', ['extra ' + i]);
check('max. 5 klassen per leerkracht', (await rpc('juf', 'vagant_maak_klas', ['zesde'])).reden === 'te_veel_klassen');

console.log('Realtime (privékanaal per klas)');
await db.exec('reset role; truncate realtime.verzonden');
await als('mila', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-6', $2, $3)`, [A, mila.pid, doc('p-6', { pid: mila.pid, geheim: 'inhoud' })]);
const meld = (await db.query('select * from realtime.verzonden')).rows;
check('een wijziging stuurt een db-bericht op klas:<A>', meld.length === 1 && meld[0].topic === 'klas:' + A && meld[0].event === 'db' && meld[0].private === true, JSON.stringify(meld));
check('... met enkel soort en id, nooit de inhoud', meld[0] && meld[0].payload.soort === 'attempt' && !JSON.stringify(meld[0].payload).includes('inhoud'));
await db.exec(`reset role; insert into realtime.messages (topic, extension, event, payload) values ('klas:${A}', 'broadcast', 'raid:state', '{}'), ('klas:${B}', 'broadcast', 'raid:state', '{}')`);
async function kanaal(wie, topic, sql, params = []) {
  await db.query("select set_config('realtime.topic', $1, false)", [topic]);
  try { return await poging(wie, sql, params); } finally { await db.query("select set_config('realtime.topic', '', false)"); }
}
r = await kanaal('mila', 'klas:' + A, `select count(*)::int as n from realtime.messages where topic = 'klas:${A}'`);
check('Mila mag luisteren op klas:A', r.ok && r.r.rows[0].n === 1);
r = await kanaal('mila', 'klas:' + B, `select count(*)::int as n from realtime.messages where topic = 'klas:${B}'`);
check('Mila mag NIET luisteren op klas:B', r.ok && r.r.rows[0].n === 0);
r = await kanaal('mila', 'klas:' + A, `insert into realtime.messages (topic, extension, event, payload) values ($1, 'broadcast', 'raid:hit', '{}')`, ['klas:' + A]);
check('Mila mag zenden op klas:A (eindbaas)', r.ok, r.e?.message);
r = await kanaal('mila', 'klas:' + B, `insert into realtime.messages (topic, extension, event, payload) values ($1, 'broadcast', 'raid:hit', '{}')`, ['klas:' + B]);
check('Mila mag NIET zenden op klas:B', !r.ok);
r = await kanaal('juf', 'klas:' + A + ':klas', `select count(*)::int as n from realtime.messages where topic = 'klas:${A}'`);
check('de leerkracht mag luisteren op klas:A:kamer', r.ok && r.r.rows[0].n >= 1);
r = await kanaal('mila', 'klas:nonsens', `select count(*)::int as n from realtime.messages`);
check('een vreemde topic geeft niets (geen fout)', r.ok && r.r.rows[0].n === 0);

console.log('Verwijderen');
const weg = await rpc('juf', 'vagant_verwijder_reiziger', [A, noor.pid]);
check('de leerkracht verwijdert Noor', weg.ok);
check('Noors toestel ziet niets meer van klas A', await telData('noor', A) === 0);
check('Noors documenten zijn weg', Number((await als('juf', 'select count(*)::int as n from public.klasdata where klas_id = $1 and pid = $2', [A, noor.pid])).rows[0].n) === 0);
r = await poging('noor', `insert into public.klasdata (klas_id, soort, id, pid, data) values ($1, 'attempt', 'p-7', $2, $3)`, [A, noor.pid, doc('p-7', { pid: noor.pid })]);
check('Noors toestel kan niet meer schrijven', !r.ok);
const st = await rpc('anon', 'vagant_status');
check('vagant_status: alles aanwezig, RLS overal aan', st.ontbrekend.length === 0 && st.zonder_rls.length === 0 && st.realtime === true, JSON.stringify(st));
const rls = (await db.query(`select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'vagant_priv') and c.relkind = 'r'`)).rows;
check('zelfcontrole: RLS staat aan op elke tabel', rls.length === 5 && rls.every(x => x.relrowsecurity), JSON.stringify(rls));
const wis = await rpc('juf', 'vagant_wis_klasdata', [A]);
check('de leerkracht wist alle klasdata; Mila ziet daarna niets meer', wis.ok && await telData('mila', A) === 0 && await telData('juf', A) === 0);

console.log('Rooktest (sql/vagant-rooktest.sql)');
await db.exec('reset role');
try {
  const res = await db.exec(readFileSync(join(hier, '..', 'sql', 'vagant-rooktest.sql'), 'utf8'));
  const rijen = res.at(-1).rows;
  check(`rooktest: ${rijen.length} controles, alle ok`, rijen.length >= 20 && rijen.every(r => r.uitkomst === 'ok'), JSON.stringify(rijen.filter(r => r.uitkomst !== 'ok')));
  const rest = (await db.query("select count(*)::int as n from auth.users where id::text like '00000000-0000-4000-8000-%'")).rows[0].n;
  check('rooktest laat niets achter', rest === 0);
} catch (e) { check('rooktest draait', false, e.message); }

console.log(`\n${ok} geslaagd, ${fout} mislukt`);
process.exit(fout ? 1 : 0);
