// Visser aan de kaai (het geheim van Rat Remi): help Remi vissen in de rei. Laat de haak zakken en vang vissen.
// Afval aan je haak kost een wormpje (Remi gooit het wel netjes in de vuilnisbak). Drie wormpjes, 75 seconden.
import { K, rrect, vul, ellips, cirkel, vis, afval, rat, tekst, trapgevel, wolk, zaad } from './teken.js';
import { hudBalk } from './spelkader.js';

const DUUR = 75;
const KAAI_Y = 200, WATER_Y = 230, BODEM_Y = 575;
const SOORTEN = {
  klein: { kleur: '#e2643e', s: 0.9, punten: 1, v: [70, 120] },
  groot: { kleur: '#6f8fa6', s: 1.35, punten: 2, v: [40, 70] },
  goud: { kleur: '#f2c94c', s: 0.85, punten: 5, v: [130, 170] },
};

function worm(g, x, y, s = 1, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(-10, 4); g.bezierCurveTo(-5, -8 + Math.sin(t * 6) * 2, 2, 10, 10, -2);
  g.strokeStyle = K.inkt; g.lineWidth = 8; g.lineCap = 'round'; g.stroke();
  g.strokeStyle = '#e98a8a'; g.lineWidth = 5; g.stroke();
  g.restore();
}

function decor(g, t, helder) {
  const lucht = g.createLinearGradient(0, 0, 0, KAAI_Y); lucht.addColorStop(0, '#9fd3f1'); lucht.addColorStop(1, '#f7e9c8');
  g.fillStyle = lucht; g.fillRect(0, 0, 960, KAAI_Y);
  wolk(g, (120 + t * 8) % 1100 - 70, 50, 0.9); wolk(g, (620 + t * 5) % 1100 - 70, 34, 0.7);
  // de huizen aan de overkant van de kaai (Rozenhoedkaai)
  const r = zaad(42);
  let x = -10;
  const muren = [K.baksteen, K.baksteen2, K.baksteen3, '#efe4cc', '#d9c9a8'];
  while (x < 960) { const w = 70 + Math.floor(r() * 40), hh = 60 + Math.floor(r() * 50); trapgevel(g, x, KAAI_Y - 8, w, hh, { muur: muren[Math.floor(r() * muren.length)], treden: 3 + Math.floor(r() * 2), deur: r() < 0.6 }); x += w + 2; }
  // de kaai
  g.fillStyle = '#cbbd9f'; g.fillRect(0, KAAI_Y - 10, 960, 18);
  g.strokeStyle = K.inkt; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, KAAI_Y - 10); g.lineTo(960, KAAI_Y - 10); g.stroke();
  g.fillStyle = K.baksteen; g.fillRect(0, KAAI_Y + 8, 960, WATER_Y - KAAI_Y - 8);
  g.fillStyle = K.voeg; for (let yy = KAAI_Y + 15; yy < WATER_Y; yy += 8) g.fillRect(0, yy, 960, 1.5);
  // het water
  const wg = g.createLinearGradient(0, WATER_Y, 0, BODEM_Y);
  wg.addColorStop(0, helder > 0.5 ? '#5fb6d8' : '#7f9a6a'); wg.addColorStop(1, helder > 0.5 ? '#1f5f86' : '#3c4a2a');
  g.fillStyle = wg; g.fillRect(0, WATER_Y, 960, 600 - WATER_Y);
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2.5;
  g.beginPath(); for (let xx = 0; xx <= 960; xx += 20) { const yy = WATER_Y + Math.sin(xx * 0.04 + t * 2) * 3; xx ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke();
  // lichtstralen in het water
  g.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 5; i++) { const bx = (i * 230 + t * 10) % 1100 - 70; g.beginPath(); g.moveTo(bx, WATER_Y); g.lineTo(bx + 60, WATER_Y); g.lineTo(bx + 140, BODEM_Y); g.lineTo(bx + 40, BODEM_Y); g.closePath(); g.fill(); }
  // de bodem met waterplanten en stenen
  g.fillStyle = '#6b5a3a'; g.beginPath(); g.moveTo(0, 600); for (let xx = 0; xx <= 960; xx += 40) g.lineTo(xx, BODEM_Y + Math.sin(xx * 0.05) * 6); g.lineTo(960, 600); g.closePath(); g.fill();
  for (let i = 0; i < 9; i++) {
    const px = 40 + i * 110 + (i % 2) * 30;
    g.strokeStyle = '#3f7a3a'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px, BODEM_Y + 4); g.quadraticCurveTo(px + Math.sin(t * 1.2 + i) * 14, BODEM_Y - 40, px + Math.sin(t + i) * 8, BODEM_Y - 70 - (i % 3) * 18); g.stroke();
  }
}

export const VISSPEL = {
  id: 'visser', titel: 'Visser aan de kaai', kleur: '#2f8f6a', eenheid: 'punten',
  uitleg: [
    { toetsen: ['←', '→', 'spatie'], tekst: 'of klik in het water' },
    { teken: (g) => { vis(g, -8, -6, 0.75, '#e2643e'); vis(g, 10, 10, 0.6, '#f2c94c', -1); }, tekst: 'vang vissen' },
    { teken: (g) => { afval(g, 'laars', -10, 0, 0.9); afval(g, 'fles', 14, 0, 0.8, 0.4); }, tekst: 'niet het afval' },
    { teken: (g) => { worm(g, -12, 0, 0.9); worm(g, 12, 0, 0.9, 1); }, tekst: '3 wormpjes' },
  ],
  scoreIcoon: (g) => vis(g, 4, 0, 1.2, '#f2c94c'),
  maak(api) {
    const r = api.rng;
    const s = {
      score: 0, klaar: false, eindTekst: '', t: 0, wormen: 3, x: 480, doelX: null, haak: { y: KAAI_Y - 30, stand: 'klaar', vangst: null },
      vissen: [], afval: [], popups: [], opgeruimd: 0, belletjes: [],
    };
    const nieuweVis = (soort) => {
      const S = SOORTEN[soort], rechts = r() < 0.5;
      const minY = soort === 'groot' ? 380 : WATER_Y + 50, maxY = BODEM_Y - 30;
      s.vissen.push({ soort, x: rechts ? -40 : 1000, y: minY + r() * (maxY - minY), v: (S.v[0] + r() * (S.v[1] - S.v[0])) * (rechts ? 1 : -1), f: r() * 6 });
    };
    const nieuwAfval = () => { const rechts = r() < 0.5; s.afval.push({ wat: ['fles', 'laars', 'blik', 'zak'][Math.floor(r() * 4)], x: rechts ? -30 : 990, y: WATER_Y + 40 + r() * 280, v: (25 + r() * 35) * (rechts ? 1 : -1), f: r() * 6, rot: r() * 6 }); };
    for (let i = 0; i < 6; i++) { nieuweVis(r() < 0.65 ? 'klein' : 'groot'); s.vissen[i].x = 80 + r() * 800; }
    for (let i = 0; i < 2; i++) { nieuwAfval(); s.afval[i].x = 150 + r() * 660; }
    const laatZakken = () => { if (s.haak.stand === 'klaar' && !s.klaar) { s.haak.stand = 'zakt'; api.klank(330, 0.1, 'triangle', 0.05); } };
    s.toets = (k) => { if (k === ' ' || k === 'spacebar' || k === 'arrowdown' || k === 'enter' || k === 's') laatZakken(); };
    s.tik = (x, y) => { if (y > KAAI_Y - 60) { s.doelX = Math.max(60, Math.min(900, x)); s.werpBijAankomst = true; } };
    s.update = (dt) => {
      s.t += dt;
      for (const p of s.popups) { p.t += dt; p.y -= 50 * dt; }
      s.popups = s.popups.filter(p => p.t < 1);
      for (const b of s.belletjes) { b.t += dt; b.y -= 40 * dt; }
      s.belletjes = s.belletjes.filter(b => b.t < 1.4);
      if (s.klaar) return;
      if (s.t >= DUUR) { s.klaar = true; s.eindTekst = 'De tijd is om! Remi is blij met je vangst.'; return; }
      // Remi lopen (alleen als de haak boven is)
      const links = api.toets('arrowleft', 'a', 'q'), rechts = api.toets('arrowright', 'd');
      if (s.haak.stand === 'klaar') {
        if (links || rechts) { s.x += ((rechts ? 1 : 0) - (links ? 1 : 0)) * 330 * dt; s.doelX = null; }
        else if (s.doelX != null) {
          const d = s.doelX - s.x; s.x += Math.sign(d) * Math.min(Math.abs(d), 420 * dt);
          if (Math.abs(d) < 4) { s.doelX = null; if (s.werpBijAankomst) { s.werpBijAankomst = false; laatZakken(); } }
        }
        s.x = Math.max(60, Math.min(900, s.x));
      }
      // de haak
      const hk = s.haak, hx = s.x + 44;
      if (hk.stand === 'zakt') { hk.y += 300 * dt; if (hk.y >= BODEM_Y - 14) hk.stand = 'haalt'; }
      else if (hk.stand === 'haalt') {
        hk.y -= (hk.vangst ? 220 : 340) * dt;
        if (hk.y <= KAAI_Y - 30) {
          hk.y = KAAI_Y - 30; hk.stand = 'klaar';
          const v = hk.vangst; hk.vangst = null;
          if (v?.soort) { const p = SOORTEN[v.soort].punten; s.score += p; s.popups.push({ x: hx, y: KAAI_Y - 60, t: 0, tekst: '+' + p, kleur: K.goud }); api.klank(660 + p * 80, 0.25, 'klok', 0.06); }
          else if (v?.wat) { s.opgeruimd++; s.popups.push({ x: 880, y: KAAI_Y - 70, t: 0, tekst: 'in de vuilbak', kleur: '#fff', klein: true }); if (s.wormen <= 0) { s.klaar = true; s.eindTekst = 'Je wormpjes zijn op. Goed gevist!'; } }
        }
      }
      // vangen: de haak raakt een vis of afval
      if ((hk.stand === 'zakt' || hk.stand === 'haalt') && !hk.vangst && hk.y > WATER_Y) {
        for (const f of s.vissen) if (!f.weg && Math.hypot(f.x - hx, f.y - hk.y) < 22 * SOORTEN[f.soort].s + 6) { f.weg = true; hk.vangst = f; hk.stand = 'haalt'; api.klank(880, 0.1, 'triangle', 0.06); break; }
        if (!hk.vangst) for (const a of s.afval) if (!a.weg && Math.hypot(a.x - hx, a.y - hk.y) < 22) {
          a.weg = true; hk.vangst = a; hk.stand = 'haalt'; s.wormen--; api.klank(160, 0.3, 'square', 0.04);
          s.popups.push({ x: hx, y: hk.y - 20, t: 0, tekst: 'Bah!', kleur: '#fff' });
          break;
        }
      }
      // vissen en afval bewegen
      for (const f of s.vissen) { if (f.weg) continue; f.x += f.v * dt; f.y += Math.sin(s.t * 1.5 + f.f) * 12 * dt; }
      for (const a of s.afval) { if (a.weg) continue; a.x += a.v * dt; a.y += Math.sin(s.t + a.f) * 8 * dt; }
      s.vissen = s.vissen.filter(f => !f.weg && f.x > -80 && f.x < 1040);
      s.afval = s.afval.filter(a => !a.weg && a.x > -60 && a.x < 1020);
      const voortgang = s.t / DUUR;
      while (s.vissen.length < 7) nieuweVis(r() < 0.1 ? 'goud' : r() < 0.6 ? 'klein' : 'groot');
      while (s.afval.length < 2 + Math.floor(voortgang * 3)) nieuwAfval();
      if (r() < dt * 2) s.belletjes.push({ x: r() * 960, y: BODEM_Y - 10, t: 0 });
    };
    s.teken = (g, { stil = false } = {}) => {
      decor(g, s.t, 1);
      for (const b of s.belletjes) cirkel(g, b.x + Math.sin(b.t * 6) * 3, b.y, 3 + b.t * 1.5, 'rgba(255,255,255,.35)', 'rgba(255,255,255,.6)', 1);
      for (const a of s.afval) afval(g, a.wat, a.x, a.y, 1.1, a.rot + Math.sin(s.t + a.f) * 0.25);
      for (const f of s.vissen) vis(g, f.x, f.y, SOORTEN[f.soort].s, SOORTEN[f.soort].kleur, Math.sign(f.v), Math.sin(s.t * 10 + f.f));
      // de vuilbak op de kaai
      rrect(g, 862, KAAI_Y - 52, 40, 44, 5); vul(g, '#3f6b4a', K.inkt, 2.5); rrect(g, 857, KAAI_Y - 58, 50, 9, 3); vul(g, '#2f5238', K.inkt, 2);
      // Remi met zijn hengel
      const hx = s.x + 44, hk = s.haak;
      rat(g, s.x, KAAI_Y - 24, 1.25, s.t);
      g.strokeStyle = '#6a4a30'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(s.x + 10, KAAI_Y - 20); g.lineTo(hx, KAAI_Y - 74); g.stroke();
      g.strokeStyle = 'rgba(40,30,20,.8)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(hx, KAAI_Y - 74); g.lineTo(hx, hk.y); g.stroke();
      if (hk.vangst?.soort) vis(g, hx, hk.y + 18, SOORTEN[hk.vangst.soort].s, SOORTEN[hk.vangst.soort].kleur, 1, Math.sin(s.t * 20));
      else if (hk.vangst?.wat) afval(g, hk.vangst.wat, hx, hk.y + 16, 1.1, 0.3);
      else worm(g, hx, hk.y + 8, 0.7, s.t);
      g.strokeStyle = '#8d939e'; g.lineWidth = 3; g.beginPath(); g.arc(hx - 4, hk.y + 2, 5, 0, Math.PI); g.stroke();
      for (const p of s.popups) tekst(g, p.tekst, p.x, p.y, { maat: p.klein ? 18 : 28, kleur: p.kleur || K.goud });
      if (stil) return;
      const rest = Math.max(0, Math.ceil(DUUR - s.t));
      hudBalk(g, [
        { icoon: (gg) => vis(gg, 2, 0, 0.8, '#e2643e'), tekst: String(s.score), breed: 120 },
        { icoon: (gg) => worm(gg, 0, 0, 0.9, s.t), tekst: String(Math.max(0, s.wormen)), breed: 110 },
        { icoon: (gg) => { cirkel(gg, 0, 0, 13, '#fff', K.inkt, 2.5); gg.strokeStyle = K.inkt; gg.lineWidth = 2.5; gg.beginPath(); gg.moveTo(0, 0); gg.lineTo(0, -8); gg.moveTo(0, 0); gg.lineTo(6, 3); gg.stroke(); }, tekst: String(rest), breed: 120 },
      ]);
      if (s.haak.stand === 'klaar' && s.t < 6) { rrect(g, 330, 552, 300, 40, 20); vul(g, 'rgba(255,246,227,.95)', K.inkt, 2.5); tekst(g, 'Klik in het water of druk op spatie', 480, 573, { maat: 18, kleur: K.inkt, lijn: null }); }
    };
    return s;
  },
};
