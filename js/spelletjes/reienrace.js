// Reienrace (het geheim van de gouden kikker): vaar met een rondvaartboot over de rei naar het Minnewater.
// Vang de eendjes (ze varen achter je aan), ontwijk het slijk van de Slijkkraak en het afval. Drie hartjes, één minuut.
import { K, rrect, vul, ellips, cirkel, eendje, slijk, afval, hart, tekst, zaad, kikker } from './teken.js';
import { hudBalk } from './spelkader.js';

const DUUR = 60;                       // seconden tot aan het Minnewater
const KX0 = 300, KX1 = 660;            // de rei (binnen de kaaimuren)
const BOOT_Y = 470;

function bootTekenen(g, x, y, t, knipper) {
  if (knipper && Math.floor(t * 12) % 2) return;
  g.save(); g.translate(x, y);
  // kielzog
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 14, 38); g.quadraticCurveTo(s * 26, 70, s * 40, 96); g.stroke(); }
  // romp
  g.beginPath(); g.moveTo(0, -50); g.bezierCurveTo(26, -34, 26, 20, 22, 44); g.lineTo(-22, 44); g.bezierCurveTo(-26, 20, -26, -34, 0, -50); g.closePath();
  vul(g, '#8a5a33', K.inkt, 3);
  g.beginPath(); g.moveTo(0, -42); g.bezierCurveTo(19, -29, 19, 18, 16, 38); g.lineTo(-16, 38); g.bezierCurveTo(-19, 18, -19, -29, 0, -42); g.closePath();
  vul(g, '#c9955a', null);
  for (let i = 0; i < 3; i++) { g.fillStyle = '#7a4e2c'; g.fillRect(-16, -14 + i * 18, 32, 5); }
  // passagiers en de schipper
  const kl = ['#e2643e', '#3aa6f3', '#6fae4a', '#e9578a'];
  for (let i = 0; i < 4; i++) cirkel(g, (i % 2 ? 8 : -8), -20 + Math.floor(i / 2) * 18, 6, kl[i], K.inkt, 1.8);
  cirkel(g, 0, 30, 7, '#2b3a78', K.inkt, 2); ellips(g, 0, 27, 8, 3, '#f2c94c', K.inkt, 1.5);
  g.restore();
}

function decorTekenen(g, off, t, rr) {
  // het water
  const gr = g.createLinearGradient(KX0, 0, KX1, 0);
  gr.addColorStop(0, K.water2); gr.addColorStop(0.5, K.water); gr.addColorStop(1, K.water2);
  g.fillStyle = gr; g.fillRect(KX0, 0, KX1 - KX0, 600);
  // rimpels die meedrijven
  g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const y = ((i * 97 + off * 1.0) % 680) - 40, x = KX0 + 30 + ((i * 173) % (KX1 - KX0 - 60));
    g.beginPath(); g.moveTo(x - 14, y); g.quadraticCurveTo(x, y - 5 + Math.sin(t * 2 + i) * 2, x + 14, y); g.stroke();
  }
  // kaaien en huizen links en rechts
  for (const kant of [-1, 1]) {
    const kx = kant < 0 ? KX0 : KX1;
    // kaaimuur (baksteen) en kasseien
    g.fillStyle = '#c9b99c'; g.fillRect(kant < 0 ? kx - 70 : kx, 0, 70, 600);
    g.fillStyle = K.baksteen; g.fillRect(kant < 0 ? kx - 14 : kx, 0, 14, 600);
    g.fillStyle = K.voeg;
    for (let y = -((off) % 16); y < 600; y += 16) g.fillRect(kant < 0 ? kx - 14 : kx, y, 14, 2);
    g.fillStyle = 'rgba(120,100,70,.18)';
    for (let y = -((off) % 22); y < 600; y += 22) for (let x = 0; x < 56; x += 14) g.fillRect((kant < 0 ? kx - 70 : kx + 14) + x + ((y / 22) % 2) * 7, y, 12, 9);
    // daken van de huizen (bovenaanzicht): rode pannen, nok, schoorsteen
    const hx = kant < 0 ? 0 : KX1 + 70, hw = kant < 0 ? KX0 - 70 : 960 - KX1 - 70;
    const blok = 130;
    for (let k = -1; k < 7; k++) {
      const n = Math.floor(off / blok) - k;
      const y = (off % blok) + k * blok - blok;
      const r = zaad(n * 7 + (kant > 0 ? 1000 : 0));
      const soort = r();
      if (soort < 0.18) {           // een tuintje met een boom
        g.fillStyle = K.gras; g.fillRect(hx, y, hw, blok);
        cirkel(g, hx + hw * (0.3 + r() * 0.4), y + blok / 2, 34, ['#5cb84a', '#6cc552', '#e8a33c'][Math.floor(r() * 3)], K.inkt, 2.5);
        continue;
      }
      const dak = ['#a2503a', '#8a5444', '#b05e42', '#7d7788'][Math.floor(r() * 4)];
      rrect(g, hx + 4, y + 4, hw - 8, blok - 8, 6); vul(g, dak, K.inkt, 2.5);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
      for (let yy = y + 16; yy < y + blok - 8; yy += 12) { g.beginPath(); g.moveTo(hx + 8, yy); g.lineTo(hx + hw - 8, yy); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 4; g.beginPath(); g.moveTo(hx + hw / 2, y + 8); g.lineTo(hx + hw / 2, y + blok - 8); g.stroke();
      rrect(g, hx + hw * 0.25, y + blok * 0.3, 16, 16, 2); vul(g, '#8e4430', K.inkt, 2);
      // trapgevel naar het water toe: getrapte rand
      g.fillStyle = K.baksteen3;
      const gx = kant < 0 ? hx + hw - 10 : hx + 4;
      for (let s = 0; s < 4; s++) g.fillRect(gx, y + 10 + s * 14, 6, 10);
      void rr;
    }
  }
  // een brug: elke 900 px een stenen boogbrug over de rei (wordt boven de boot getekend)
}
function brugTekenen(g, off) {
  const af = 900, y = (off % af) - 200;
  if (y < -120 || y > 640) return;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(KX0 - 10, y + 70, KX1 - KX0 + 20, 26);
  rrect(g, KX0 - 40, y, KX1 - KX0 + 80, 70, 8); vul(g, '#b5634a', K.inkt, 3);
  g.fillStyle = '#9e523a'; for (let x = KX0 - 30; x < KX1 + 30; x += 26) g.fillRect(x, y + 8, 2, 54);
  g.fillStyle = '#ddd2bb'; g.fillRect(KX0 - 40, y, KX1 - KX0 + 80, 10); g.fillRect(KX0 - 40, y + 60, KX1 - KX0 + 80, 10);
  g.strokeStyle = K.inkt; g.lineWidth = 2; g.strokeRect(KX0 - 40, y, KX1 - KX0 + 80, 10); g.strokeRect(KX0 - 40, y + 60, KX1 - KX0 + 80, 10);
  g.fillStyle = '#d9c9a8'; g.fillRect(KX0 - 40, y + 22, KX1 - KX0 + 80, 26);
  g.fillStyle = 'rgba(120,100,70,.25)'; for (let x = KX0 - 36; x < KX1 + 36; x += 12) g.fillRect(x, y + 26 + (x % 24 ? 0 : 10), 9, 7);
}

export const REIENRACE = {
  id: 'reienrace', titel: 'Reienrace', kleur: '#2f8fd6', eenheid: 'eendjes',
  uitleg: [
    { toetsen: ['←', '→'], tekst: 'of de muis: stuur' },
    { teken: (g) => eendje(g, 0, 2, 1.3), tekst: 'vang' },
    { teken: (g) => { slijk(g, -10, 2, 13); afval(g, 'fles', 16, 2, 0.8, 0.5); }, tekst: 'ontwijk' },
    { teken: (g) => { hart(g, -12, 0, 0.9); hart(g, 12, 0, 0.9); }, tekst: '4 hartjes' },
  ],
  scoreIcoon: (g) => eendje(g, 0, 2, 1.4),
  maak(api) {
    const s = {
      score: 0, klaar: false, eindTekst: '', t: 0, off: 0, v: 150, x: 480, vx: 0,
      harten: 4, onkwetsbaar: 0, items: [], spawn: 0.6, spetters: [], spoor: [], popups: [], gehaald: false,
    };
    const r = api.rng;
    function nieuwItem() {
      const k = r();
      const x = KX0 + 40 + r() * (KX1 - KX0 - 80);
      if (k < 0.42) {
        const n = 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) s.items.push({ soort: 'eend', x: x + i * 10 - n * 5, y: -30 - i * 34, r: 16, f: r() * 6 });
      } else if (k < 0.78) s.items.push({ soort: 'slijk', x, y: -40, r: 22 + r() * 8, f: r() * 6, drift: (r() - 0.5) * 30 });
      else s.items.push({ soort: 'afval', wat: ['fles', 'laars', 'blik', 'zak'][Math.floor(r() * 4)], x, y: -30, r: 17, f: r() * 6, rot: r() * 6 });
    }
    s.update = (dt) => {
      if (s.klaar) return;
      s.t += dt;
      const voortgang = Math.min(1, s.t / DUUR);
      s.v = 150 + voortgang * 170;
      s.off += s.v * dt;
      // sturen: toetsen of de muis
      const links = api.toets('arrowleft', 'a', 'q'), rechts = api.toets('arrowright', 'd');
      if (links || rechts) { s.vx += ((rechts ? 1 : 0) - (links ? 1 : 0)) * 1900 * dt; s.muis = false; }
      else if (api.wijzer.actief && (api.wijzer.neer || performance.now() - api.wijzer.t < 2500)) { s.vx = (api.wijzer.x - s.x) * 7; s.muis = true; }
      s.vx *= Math.pow(0.02, dt);
      s.vx = Math.max(-520, Math.min(520, s.vx));
      s.x = Math.max(KX0 + 30, Math.min(KX1 - 30, s.x + s.vx * dt));
      s.onkwetsbaar = Math.max(0, s.onkwetsbaar - dt);
      // nieuwe dingen op de rei (niet meer vlak voor de aankomst)
      s.spawn -= dt;
      if (s.spawn <= 0 && s.t < DUUR - 2.5) { nieuwItem(); s.spawn = 0.95 - voortgang * 0.4 + r() * 0.25; }
      for (const it of s.items) {
        it.y += s.v * dt * (it.soort === 'eend' ? 0.82 : 1);
        if (it.soort === 'slijk') it.x = Math.max(KX0 + 25, Math.min(KX1 - 25, it.x + Math.sin(s.t * 1.3 + it.f) * it.drift * dt));
        if (it.soort === 'eend') it.x += Math.sin(s.t * 3 + it.f) * 12 * dt;
        // botsen met de boot (twee cirkels: voor en achter)
        if (it.weg) continue;
        const d1 = Math.hypot(it.x - s.x, it.y - (BOOT_Y - 22)), d2 = Math.hypot(it.x - s.x, it.y - (BOOT_Y + 22));
        if (Math.min(d1, d2) < it.r + (it.soort === 'eend' ? 22 : 10)) {   // eendjes vang je makkelijk, slijk en afval raken minder snel
          if (it.soort === 'eend') {
            it.weg = true; s.score++; api.klank(880 + Math.min(10, s.score) * 30, 0.12, 'triangle', 0.07);
            s.popups.push({ x: it.x, y: it.y, t: 0, tekst: '+1' });
          } else if (s.onkwetsbaar <= 0) {
            it.weg = true; s.harten--; s.onkwetsbaar = 1.6; api.klank(150, 0.3, 'square', 0.05);
            for (let i = 0; i < 14; i++) s.spetters.push({ x: it.x, y: it.y, vx: (r() - 0.5) * 260, vy: (r() - 0.8) * 260, t: 0, k: it.soort === 'slijk' ? K.slijk : '#d8eef8' });
            if (s.harten <= 0) { s.klaar = true; s.eindTekst = 'Oei! Je boot zit vast in het slijk.'; }
          }
        }
      }
      s.items = s.items.filter(it => it.y < 700 && !it.weg);
      for (const p of s.spetters) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt + s.v * dt; p.vy += 300 * dt; }
      s.spetters = s.spetters.filter(p => p.t < 0.8);
      for (const p of s.popups) { p.t += dt; p.y -= 40 * dt; }
      s.popups = s.popups.filter(p => p.t < 0.8);
      // het spoor: de gevangen eendjes zwemmen in een rij achter de boot
      s.spoor.unshift({ x: s.x, y: BOOT_Y + 40 });
      for (const p of s.spoor) p.y += s.v * dt * 0.25;
      if (s.spoor.length > 200) s.spoor.length = 200;
      if (s.t >= DUUR && !s.klaar) { s.klaar = true; s.gehaald = true; s.eindTekst = 'Je bent aan het Minnewater!'; api.klank(1046, 0.6, 'klok', 0.06); }
    };
    s.teken = (g, { stil = false } = {}) => {
      decorTekenen(g, s.off, s.t);
      // het Minnewater komt in zicht (aankomst)
      const rest = DUUR - s.t;
      if (!stil && rest < 4) {
        const y = -260 + (4 - rest) / 4 * 420;
        g.fillStyle = K.water; g.fillRect(0, y - 400, 960, 400 + 40);
        g.fillStyle = K.gras; g.fillRect(0, y - 470, 960, 90);
        tekst(g, 'Minnewater', 480, y - 420, { maat: 40, kleur: '#fff' });
        for (let i = 0; i < 3; i++) { const zx = 260 + i * 220; ellips(g, zx, y - 200 + i * 30, 26, 16, '#fff'); }
      }
      for (const it of s.items) {
        if (it.soort === 'eend') eendje(g, it.x, it.y, 1.05, -Math.PI / 2 - 0.2 + Math.sin(s.t * 4 + it.f) * 0.15);
        else if (it.soort === 'slijk') slijk(g, it.x, it.y, it.r, s.t + it.f);
        else { ellips(g, it.x, it.y + 4, it.r + 4, it.r * 0.6, 'rgba(255,255,255,.25)', null); afval(g, it.wat, it.x, it.y, 1.15, it.rot + Math.sin(s.t + it.f) * 0.2); }
      }
      // gevangen eendjes achter de boot
      const n = Math.min(s.score, 12);
      for (let i = 0; i < n; i++) { const p = s.spoor[Math.min(s.spoor.length - 1, 10 + i * 9)]; if (p) eendje(g, p.x, p.y + i * 8, 0.75, -Math.PI / 2 + Math.sin(s.t * 5 + i) * 0.2); }
      bootTekenen(g, s.x, BOOT_Y, s.t, s.onkwetsbaar > 0);
      brugTekenen(g, s.off);
      for (const p of s.spetters) cirkel(g, p.x, p.y, 4 * (1 - p.t), p.k, null);
      for (const p of s.popups) tekst(g, p.tekst, p.x, p.y, { maat: 26, kleur: K.goud });
      if (stil) { kikker(g, 480, 300, 3, 0.6); return; }
      // HUD
      hudBalk(g, [
        { icoon: (gg) => eendje(gg, 0, 2, 1.05), tekst: String(s.score), breed: 120 },
        { icoon: (gg) => hart(gg, 0, 0, 1.1), tekst: String(Math.max(0, s.harten)), breed: 110 },
      ]);
      // voortgang naar het Minnewater
      const bx = 700, bw = 240;
      g.fillStyle = 'rgba(255,246,227,.92)'; rrect(g, bx, 12, bw, 46, 14); vul(g, 'rgba(255,246,227,.92)', K.inkt, 2.5);
      g.fillStyle = '#dde5ef'; rrect(g, bx + 14, 28, bw - 60, 14, 7); vul(g, '#dde5ef', K.inkt, 1.5);
      rrect(g, bx + 14, 28, Math.max(14, (bw - 60) * Math.min(1, s.t / DUUR)), 14, 7); vul(g, K.water, null);
      ellips(g, bx + bw - 26, 35, 14, 10, '#fff', K.inkt, 2);
    };
    s.toets = () => {};
    return s;
  },
};
