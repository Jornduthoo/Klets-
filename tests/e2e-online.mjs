// Browsertest van "klas online" zonder echte Supabase: de pagina's krijgen een nagemaakte client
// (tests/e2e-mock-pagina.js) die alles doorgeeft aan een kleine klasdatabank hier in Node.
// Elke browsercontext = een ander toestel (eigen localStorage, eigen anonieme sessie).
//
//   python3 -m http.server 8765      (in de map van de app)
//   node tests/e2e-online.mjs
// Omgevingsvariabelen: PLAYWRIGHT (pad naar playwright/index.mjs), CHROMIUM (pad naar chrome), BASE (url).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright/index.mjs');
const BASE = process.env.BASE || 'http://localhost:8765/';
const hier = dirname(fileURLToPath(import.meta.url));
const MOCK = readFileSync(join(hier, 'e2e-mock-pagina.js'), 'utf8');
const URL_SB = 'https://kkqzstqsczcooutdjypt.supabase.co';
const wacht = (ms) => new Promise(r => setTimeout(r, ms));
const foto = async (page, naam) => { if (process.env.SHOTS) await page.screenshot({ path: join(process.env.SHOTS, naam + '.png') }).catch(() => {}); };

let ok = 0, fout = 0;
function check(naam, v, extra = '') { if (v) { ok++; console.log('  ok   ' + naam); } else { fout++; console.log('  FOUT ' + naam + (extra ? ' -> ' + extra : '')); } }

// ---------- de nagemaakte klasdatabank ----------
const DB = { users: [], klassen: [], reizigers: [], leden: [], klasdata: [], klok: Date.parse('2026-10-09T08:00:00Z') };
const pages = new Set();
const offline = new Set();   // contexten zonder wifi
const tijd = () => new Date(DB.klok += 1000).toISOString();
const id = () => Math.random().toString(16).slice(2, 10) + '-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
const lid = (uid, klas) => DB.leden.find(l => l.user_id === uid && l.klas_id === klas);
const isLk = (uid, klas) => DB.klassen.some(k => k.id === klas && k.eigenaar === uid);
const klasJ = (k) => ({ id: k.id, code: k.code, naam: k.naam });
const pin = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');

const telling = {};
function zend(topic, event, payload, van = null) {
  telling[event] = (telling[event] || 0) + 1;
  for (const p of pages) if (p !== van && p.__topics?.has(topic)) p.evaluate(([t, e, d]) => window.__mockOntvang?.(t, e, d), [topic, event, payload]).catch(() => {});
}
const RPC = {
  vagant_status: () => ({ versie: 1, ontbrekend: [], zonder_rls: [], realtime: true }),
  vagant_maak_klas: (uid, a) => {
    const u = DB.users.find(x => x.id === uid); if (!u || u.is_anonymous) return { ok: false, reden: 'enkel_leerkracht' };
    const k = { id: id(), code: 'KL' + String(DB.klassen.length + 2).padStart(4, '2').replace(/[01]/g, '9'), naam: a.p_naam || '', eigenaar: uid };
    DB.klassen.push(k); DB.leden.push({ klas_id: k.id, user_id: uid, rol: 'leerkracht', pid: null });
    return { ok: true, klas: klasJ(k) };
  },
  vagant_klas_info: (uid, a) => { const k = DB.klassen.find(x => x.code === a.p_code.toUpperCase()); return k ? { ok: true, klas: klasJ(k) } : { ok: false, reden: 'onbekend' }; },
  vagant_mijn_klas: (uid, a) => {
    const k = DB.klassen.find(x => x.code === a.p_code.toUpperCase()); if (!k) return { ok: false, reden: 'onbekend' };
    const l = lid(uid, k.id); if (!l) return { ok: false, reden: 'geen_lid' };
    return { ok: true, klas: klasJ(k), rol: l.rol, pid: l.pid, bijnaam: DB.reizigers.find(r => r.pid === l.pid)?.bijnaam };
  },
  vagant_nieuwe_reiziger: (uid, a) => {
    const k = DB.klassen.find(x => x.code === a.p_code.toUpperCase()); if (!k) return { ok: false, reden: 'onbekend' };
    const n = a.p_bijnaam.trim();
    if (DB.reizigers.some(r => r.klas_id === k.id && r.bijnaam.toLowerCase() === n.toLowerCase())) return { ok: false, reden: 'bijnaam_bestaat' };
    const r = { klas_id: k.id, pid: 'll_' + Math.random().toString(16).slice(2, 10), bijnaam: n, pin: pin() };
    DB.reizigers.push(r);
    DB.leden = DB.leden.filter(l => !(l.user_id === uid && l.klas_id === k.id)); DB.leden.push({ klas_id: k.id, user_id: uid, rol: 'reiziger', pid: r.pid });
    zetDoc({ klas_id: k.id, soort: 'pupil', id: r.pid, pid: r.pid, data: { id: r.pid, naam: n, xp: 0, codes: [], kosmetiek: [] } });
    return { ok: true, klas: klasJ(k), pid: r.pid, pin: r.pin, bijnaam: n };
  },
  vagant_aanmelden: (uid, a) => {
    const k = DB.klassen.find(x => x.code === a.p_code.toUpperCase()); if (!k) return { ok: false, reden: 'onbekend' };
    const r = DB.reizigers.find(x => x.klas_id === k.id && x.bijnaam.toLowerCase() === a.p_bijnaam.trim().toLowerCase());
    if (!r || r.pin !== a.p_pin) return { ok: false, reden: 'pin' };
    DB.leden = DB.leden.filter(l => !(l.user_id === uid && l.klas_id === k.id)); DB.leden.push({ klas_id: k.id, user_id: uid, rol: 'reiziger', pid: r.pid });
    return { ok: true, klas: klasJ(k), pid: r.pid, bijnaam: r.bijnaam };
  },
  vagant_verwijder_reiziger: (uid, a) => {
    if (!isLk(uid, a.p_klas)) return { ok: false, reden: 'geen_leerkracht' };
    DB.klasdata = DB.klasdata.filter(r => !(r.klas_id === a.p_klas && r.pid === a.p_pid));
    DB.reizigers = DB.reizigers.filter(r => r.pid !== a.p_pid); DB.leden = DB.leden.filter(l => l.pid !== a.p_pid);
    zend('klas:' + a.p_klas, 'db', { op: 'delete', soort: 'pupil', ids: [a.p_pid] });
    return { ok: true };
  },
  vagant_nieuwe_pin: (uid, a) => { const r = DB.reizigers.find(x => x.pid === a.p_pid); r.pin = pin(); return { ok: true, pin: r.pin }; },
  vagant_wis_klasdata: (uid, a) => { DB.klasdata = DB.klasdata.filter(r => r.klas_id !== a.p_klas); DB.reizigers = DB.reizigers.filter(r => r.klas_id !== a.p_klas); return { ok: true }; },
};
function zetDoc(r) {
  const i = DB.klasdata.findIndex(x => x.klas_id === r.klas_id && x.soort === r.soort && x.id === r.id);
  const rij = { ...r, updated_at: tijd() };
  if (i >= 0) DB.klasdata[i] = rij; else DB.klasdata.push(rij);
  if (r.soort === 'pupil' && !DB.reizigers.some(x => x.klas_id === r.klas_id && x.pid === r.pid)) DB.reizigers.push({ klas_id: r.klas_id, pid: r.pid, bijnaam: r.data.naam, pin: pin() });
}
function query(uid, v) {
  const tabel = DB[v.tabel];
  const pas = (r) => v.filters.every(([k, op, w]) => op === 'eq' ? r[k] === w : op === 'neq' ? r[k] !== w : r[k] >= w);
  if (v.op === 'upsert') {
    for (const r of v.rijen) {
      const l = lid(uid, r.klas_id);
      if (!l || (l.rol === 'reiziger' && r.pid !== l.pid)) return { data: null, error: { code: '42501', message: 'row-level security' }, status: 403 };
    }
    for (const r of v.rijen) {
      if (v.opts.ignoreDuplicates && DB.klasdata.some(x => x.klas_id === r.klas_id && x.soort === r.soort && x.id === r.id)) continue;
      zetDoc(r);
    }
    const per = new Map(); for (const r of v.rijen) per.set(r.klas_id + '|' + r.soort, r);
    for (const r of per.values()) zend('klas:' + r.klas_id, 'db', { op: 'insert', soort: r.soort, ids: v.rijen.filter(x => x.soort === r.soort).map(x => x.id).slice(0, 50) });
    return { data: null, error: null, status: 201 };
  }
  if (v.op === 'delete') {
    const weg = DB.klasdata.filter(pas); DB.klasdata = DB.klasdata.filter(r => !pas(r));
    for (const r of weg) zend('klas:' + r.klas_id, 'db', { op: 'delete', soort: r.soort, ids: [r.id] });
    return { data: null, error: null };
  }
  let rijen = tabel.filter(pas).filter(r => {
    if (v.tabel === 'klasdata') return !!lid(uid, r.klas_id);
    if (v.tabel === 'klassen') return r.eigenaar === uid || !!lid(uid, r.id);
    if (v.tabel === 'reizigers') return isLk(uid, r.klas_id) || lid(uid, r.klas_id)?.pid === r.pid;
    return true;
  });
  for (const [k, asc] of [...v.orders].reverse()) rijen = [...rijen].sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (asc ? 1 : -1));
  if (v.range) rijen = rijen.slice(v.range[0], v.range[1] + 1);
  rijen = JSON.parse(JSON.stringify(rijen));
  return { data: v.single ? (rijen[0] || null) : rijen, error: null };
}
function auth(v) {
  if (v.soort === 'anoniem') { const u = { id: id(), is_anonymous: true }; DB.users.push(u); return { data: { session: { user: u } }, error: null }; }
  if (v.soort === 'registreren') {
    if (DB.users.some(u => u.email === v.email)) return { data: {}, error: { message: 'User already registered' } };
    const u = { id: id(), email: v.email, password: v.password, is_anonymous: false }; DB.users.push(u);
    return { data: { session: { user: { id: u.id, email: u.email, is_anonymous: false } } }, error: null };
  }
  const u = DB.users.find(x => x.email === v.email && x.password === v.password);
  return u ? { data: { session: { user: { id: u.id, email: u.email, is_anonymous: false } } }, error: null } : { data: {}, error: { message: 'Invalid login credentials' } };
}

// ---------- browser ----------
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fouten = [];
async function toestel(naam, { online = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, reducedMotion: 'reduce' });
  await ctx.exposeFunction('__mockServer', async (json) => {
    const v = JSON.parse(json);
    if (offline.has(ctx)) return 'OFFLINE';
    if (v.t === 'rpc') return RPC[v.naam] ? { data: RPC[v.naam](v.uid, v.args || {}), error: null } : { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } };
    if (v.t === 'q') return query(v.uid, v);
    if (v.t === 'auth') return auth(v);
    if (v.t === 'sub') {
      const klas = v.topic.slice(5, 41);
      if (!lid(v.uid, klas)) return { error: 'geen lid' };
      for (const p of ctx.pages()) { p.__topics = p.__topics || new Set(); p.__topics.add(v.topic); }
      return { ok: true };
    }
    if (v.t === 'send') { const van = ctx.pages()[0]; zend(v.topic, v.event, v.payload, van); return { ok: true }; }
    return null;
  });
  await ctx.addInitScript(MOCK);
  if (online) await ctx.addInitScript(() => { if (!localStorage.getItem('vagant:backend')) localStorage.setItem('vagant:backend', JSON.stringify({ aan: true, url: 'https://kkqzstqsczcooutdjypt.supabase.co', anonKey: 'sb_publishable_test' })); });
  await ctx.route('**/api.open-meteo.com/**', r => r.abort());
  await ctx.route(URL_SB + '/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ external: { anonymous_users: true, email: true } }) }));
  const page = await ctx.newPage();
  pages.add(page);
  page.on('pageerror', e => fouten.push(naam + ': ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fouten.push(naam + ' console: ' + m.text()); if (process.env.DEBUG) console.log('   [' + naam + '] ' + m.type() + ': ' + m.text()); });
  if (process.env.DEBUG) page.on('framenavigated', f => { if (f === page.mainFrame()) console.log('   [' + naam + '] navigatie: ' + f.url()); });
  return { ctx, page };
}

try {
  console.log('Leerkracht: account, klas, dashboard');
  const lk = await toestel('leerkracht');
  await lk.page.goto(BASE + 'leerkracht.html');
  await lk.page.waitForSelector('#lk-email', { timeout: 15000 });
  await foto(lk.page, 'o1-leerkracht-login');
  check('online: het dashboard vraagt e-mail en wachtwoord (geen PIN)', !(await lk.page.$('#pin')));
  await lk.page.fill('#lk-email', 'jorn@school.test'); await lk.page.fill('#lk-wachtwoord', 'geheim1234');
  await lk.page.click('#lk-registreren');
  await lk.page.waitForSelector('#klas-naam', { timeout: 10000 });
  check('eerste keer: scherm "Maak je klas"', true);
  await foto(lk.page, 'o2-maak-klas');
  await lk.page.fill('#klas-naam', '6A'); await lk.page.click('#klas-maken');
  await lk.page.waitForSelector('#nieuwe-klascode');
  const code = (await lk.page.textContent('#nieuwe-klascode')).trim();
  check('de klas krijgt een klascode', /^[A-Z0-9]{6}$/.test(code), code);
  await foto(lk.page, 'o3-klascode');
  await lk.page.click('#naar-dashboard');
  await lk.page.waitForSelector('#kop-klascode');
  check('het dashboard toont de klascode bovenaan', (await lk.page.textContent('#kop-klascode')).includes(code));
  await lk.page.click('button[data-tab="instellingen"]');
  await lk.page.waitForSelector('#klaslink');
  const link = await lk.page.inputValue('#klaslink');
  check('Instellingen: klaslink met klascode en project', link.includes('k=' + code) && link.includes('s=kkqzstqsczcooutdjypt') && link.includes('a=sb_publishable_test'), link);
  await lk.page.waitForSelector('.qr svg', { timeout: 5000 }).catch(() => {});
  check('Instellingen: QR-code (lokaal gemaakt, geen netwerk)', !!(await lk.page.$('.qr svg')));
  check('Instellingen: geen PIN-veld als de klas online staat', !(await lk.page.$('text=PIN bewaren')));
  await lk.page.click('#test-verbinding');
  await lk.page.waitForFunction(() => document.querySelectorAll('#test-uitslag li').length > 3, null, { timeout: 10000 });
  await foto(lk.page, 'o4-instellingen');
  const test = await lk.page.$$eval('#test-uitslag li', l => l.map(x => x.className + ' ' + x.textContent));
  check('Test verbinding: alles in orde', test.every(t => t.startsWith('ok')), JSON.stringify(test));

  console.log('Reiziger Mila: klaslink, nieuwe reiziger, pincode');
  const mila = await toestel('mila', { online: false });
  await mila.page.goto(link);
  await mila.page.waitForSelector('#nieuwe-reiziger', { timeout: 15000 });
  check('de klaslink zet de klas online en vult de klascode in', (await mila.page.evaluate(() => JSON.parse(localStorage.getItem('vagant:backend')).aan)) && !mila.page.url().includes('k='));
  await foto(mila.page, 'o5-keuze');
  await mila.page.click('#nieuwe-reiziger');
  await mila.page.waitForSelector('#naam');
  await mila.page.fill('#naam', 'Mila'); await mila.page.click('#start-reis');
  await mila.page.waitForSelector('#mijn-pincode', { timeout: 10000 });
  const pinMila = (await mila.page.textContent('#mijn-pincode')).trim();
  check('Mila ziet haar pincode', /^\d{4}$/.test(pinMila));
  const doc = DB.klasdata.find(r => r.soort === 'pupil' && r.data.naam === 'Mila');
  check('Mila staat in de klasdatabank met haar uiterlijk (geen e-mail, geen achternaam)', doc && doc.data.look && !JSON.stringify(doc.data).includes('@'));
  await foto(mila.page, 'o6-pincode');
  await mila.page.click('#pincode-ok');
  await mila.page.waitForSelector('#stad', { timeout: 20000 });
  check('Mila komt in de stad', true);
  await wacht(1500);
  const intro = await mila.page.$('.overlay .btn.groot.primair'); if (intro) await intro.click();

  console.log('Dashboard ziet Mila live, met pincode');
  await lk.page.click('button[data-tab="leerlingen"]');
  await lk.page.waitForFunction(() => document.body.textContent.includes('Mila'), null, { timeout: 8000 });
  await foto(lk.page, 'o7-reizigers-pins');
  const pinDash = await lk.page.$eval(`[data-pin="${doc.id}"]`, e => e.textContent).catch(() => '');
  check('het dashboard toont Mila met dezelfde pincode', pinDash === pinMila, pinDash);

  console.log('Mila op een andere Chromebook (naam + pincode)');
  await mila.page.goto('about:blank');   // swiftshader: niet drie 3D-steden tegelijk tekenen
  const tablet = await toestel('tablet', { online: false });
  await tablet.page.goto(link);
  await tablet.page.waitForSelector('#met-pincode', { timeout: 15000 });
  await tablet.page.click('#met-pincode');
  await foto(tablet.page, 'o8-pincode-stap');
  await tablet.page.fill('#pin-naam', 'mila'); await tablet.page.fill('#pin-code', pinMila === '0000' ? '1111' : '0000');
  await tablet.page.click('#pin-aanmelden'); await wacht(500);
  check('foute pincode: duidelijke melding', (await tablet.page.textContent('.pin-blok .fout')).includes('pincode'));
  await tablet.page.fill('#pin-code', pinMila); await tablet.page.click('#pin-aanmelden', { noWaitAfter: true });
  await tablet.page.waitForSelector('#stad', { timeout: 20000 });
  check('juiste pincode: Mila speelt verder op het andere toestel', true);
  await tablet.ctx.close(); pages.delete(tablet.page);
  await mila.page.goto(BASE + 'index.html');
  await mila.page.waitForSelector('#stad', { timeout: 20000 });
  check('terug op de eerste Chromebook: Mila meteen in de stad (sessie en klas onthouden)', true);
  const naamMetZelfdeNaam = await toestel('nep', { online: false });
  await naamMetZelfdeNaam.page.goto(link);
  await naamMetZelfdeNaam.page.waitForSelector('#nieuwe-reiziger'); await naamMetZelfdeNaam.page.click('#nieuwe-reiziger');
  await naamMetZelfdeNaam.page.fill('#naam', 'Mila'); await naamMetZelfdeNaam.page.click('#start-reis'); await wacht(600);
  check('dezelfde naam nog eens: geweigerd met uitleg over de pincode', (await naamMetZelfdeNaam.page.textContent('.creator .fout')).includes('pincode'));
  await naamMetZelfdeNaam.ctx.close();

  console.log('Geen wifi: niets gaat verloren');
  offline.add(mila.ctx);
  await mila.page.evaluate(async () => {
    const { createStore } = await import('./js/core/store.js');
    const st = createStore();
    const kl = JSON.parse(localStorage.getItem('vagant:sb:klas'));
    await st.addAttempt({ id: 'p-offline', pid: kl.pid, missie: 'test', week: 1, route: 'kompas', items: [], goed: 2, totaal: 2, xp: 20, ts: Date.now(), bron: 'missie' });
  });
  await wacht(300);
  check('offline: melding "Geen verbinding met de klasdatabank"', ((await mila.page.textContent('#net-status').catch(() => '')) || '').includes('Geen verbinding'));
  await foto(mila.page, 'o9-offline');
  check('offline: het resultaat wacht in localStorage', await mila.page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('vagant:sb:wachtrij') && localStorage.getItem(k).includes('p-offline'))));
  offline.delete(mila.ctx);
  await mila.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await wacht(1500);
  check('weer online: het resultaat staat in de klasdatabank', DB.klasdata.some(r => r.id === 'p-offline'));
  check('weer online: de melding verdwijnt', !(await mila.page.$('#net-status')));

  console.log('Eindbaas tussen digibord en Chromebook');
  const bord = await lk.ctx.newPage(); pages.add(bord);
  bord.on('pageerror', e => fouten.push('bord: ' + e.message));
  await bord.goto(BASE + 'digibord.html');
  await bord.waitForSelector('#b-knoppen', { timeout: 15000 });
  check('digibord opent met de aanmelding van het dashboard (geen PIN)', !(await bord.$('#pin')));
  if (await bord.$eval('#b-view', e => e.textContent.includes('de stad')).catch(() => false)) { /* al in eindbaasmodus */ } else { await bord.click('#b-view'); await wacht(800); }
  await bord.click('#b-lobby'); await wacht(800);
  if (process.env.DEBUG) { const t0 = { ...telling }; await wacht(3000); console.log('   berichten in 3 s:', JSON.stringify(Object.fromEntries(Object.entries(telling).map(([k, v]) => [k, v - (t0[k] || 0)])))); }
  await mila.page.waitForSelector('#raid-mee', { timeout: 8000 }).catch(() => {});
  check('de Chromebook ziet de eindbaas aankomen (Realtime)', !!(await mila.page.$('#raid-mee')));
  await mila.page.$eval('#raid-mee', b => b.click()); await wacht(800);
  check('het digibord telt de deelnemer', (await bord.evaluate(() => window.__raid.joined.size)) === 1);
  await bord.click('#b-start'); await wacht(800);
  const hp0 = await bord.evaluate(() => window.__raid.hp);
  for (let i = 0; i < 12; i++) {
    const opt = await mila.page.$$('.paneel.raid .raid-zone .optie');
    if (opt.length) await opt[i % opt.length].click();
    const knop = await mila.page.$('.paneel.raid .p-foot button'); if (!knop) break;
    await knop.click(); await wacht(250);
    const k2 = await mila.page.$('.paneel.raid .p-foot button'); if (k2) { await k2.click(); await wacht(200); }
  }
  await wacht(800);
  const hp1 = await bord.evaluate(() => window.__raid.hp);
  check('juiste antwoorden op de Chromebook raken de baas op het digibord', hp1 < hp0, `${hp0} -> ${hp1}`);

  console.log('Leerkracht verwijdert een reiziger');
  await lk.page.bringToFront();
  await lk.page.click('button[data-tab="leerlingen"]'); await wacht(500);
  lk.page.once('dialog', d => d.accept());
  await lk.page.click('.dash-tabel .btn.gevaar');
  await wacht(1500);
  check('Mila en haar resultaten zijn weg uit de klasdatabank', !DB.klasdata.some(r => r.pid === doc.id) && !DB.leden.some(l => l.pid === doc.id));

  console.log('Lokale modus blijft standaard');
  const lokaal = await browser.newContext(); const lp = await lokaal.newPage();
  await lp.route('**/api.open-meteo.com/**', r => r.abort());
  await lp.goto(BASE + 'leerkracht.html'); await lp.waitForSelector('#pin', { timeout: 10000 });
  check('zonder instelling: PIN-scherm zoals vroeger (lokaal)', true);
  const geladen = await lp.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('supabase-js')));
  check('lokaal: de Supabase-bibliotheek wordt niet eens geladen', !geladen);
  await lokaal.close();
} catch (e) {
  fout++; console.log('  FOUT test brak af: ' + e.message);
}

const echt = fouten.filter(f => !/open-meteo|ERR_FAILED|Failed to load resource/.test(f));
check('geen JavaScript-fouten in de pagina\'s', echt.length === 0, echt.slice(0, 5).join(' | '));
console.log(`\n${ok} geslaagd, ${fout} mislukt`);
await browser.close();
process.exit(fout ? 1 : 0);
