// Klokkenluider van het Belfort (het geheim van de zwarte kat): een geheugenspel met de klokken van de beiaard.
// De klokken spelen een reeks; speel ze na in dezelfde volgorde. Elke ronde komt er een klok bij.
// Geluid is niet nodig: elke klok zwaait en licht op, en heeft een eigen kleur, nummer en plaats.
import { K, rrect, vul, ellips, cirkel, klok, kat, tekst, wolk, ster } from './teken.js';
import { hudBalk } from './spelkader.js';

const KLOKKEN = [
  { x: 210, kleur: '#d9534a', toon: 523.25, s: 1.15, naam: '1' },
  { x: 390, kleur: '#3a8fd9', toon: 659.25, s: 1.0, naam: '2' },
  { x: 570, kleur: '#5aa64a', toon: 783.99, s: 0.9, naam: '3' },
  { x: 750, kleur: '#e8b630', toon: 1046.5, s: 0.8, naam: '4' },
];
const KLOK_Y = 190, MAX = 12;
const TOETS = { '1': 0, '2': 1, '3': 2, '4': 3, 'arrowleft': 0, 'arrowdown': 1, 'arrowup': 2, 'arrowright': 3, '&': 0, 'é': 1, '"': 2, "'": 3 };

function achtergrond(g, t) {
  // de klokkenkamer: stenen muur, een groot spitsboogvenster met de stad, een zware houten balk
  g.fillStyle = '#d9c9a8'; g.fillRect(0, 0, 960, 600);
  g.fillStyle = 'rgba(120,100,70,.16)';
  for (let y = 0; y < 600; y += 30) for (let x = (y / 30) % 2 ? -30 : 0; x < 960; x += 60) { g.fillRect(x + 2, y + 2, 56, 26); }
  // venster
  g.save();
  g.beginPath(); g.moveTo(140, 600); g.lineTo(140, 230); g.quadraticCurveTo(140, 70, 480, 50); g.quadraticCurveTo(820, 70, 820, 230); g.lineTo(820, 600); g.closePath();
  const lucht = g.createLinearGradient(0, 50, 0, 600); lucht.addColorStop(0, '#8fcdf0'); lucht.addColorStop(0.7, '#f7e9c8'); lucht.addColorStop(1, '#f2d9a8');
  g.fillStyle = lucht; g.fill(); g.clip();
  wolk(g, 260 + Math.sin(t * 0.1) * 20, 120, 1.2); wolk(g, 640 - Math.sin(t * 0.08) * 20, 160, 0.9);
  // daken van Brugge
  const daken = [[150, 470, 80, 90], [230, 450, 70, 110], [300, 480, 90, 80], [390, 430, 60, 130], [450, 470, 80, 90], [530, 440, 70, 120], [600, 465, 90, 95], [690, 450, 70, 110], [760, 480, 80, 80]];
  for (const [x, y, w, hh] of daken) {
    g.fillStyle = '#b97a64';
    g.beginPath(); g.moveTo(x, 600); g.lineTo(x, y); for (let i = 0; i < 4; i++) { g.lineTo(x + i * w / 9, y - i * 14); g.lineTo(x + (i + 1) * w / 9, y - i * 14); } g.lineTo(x + w / 2, y - 60); for (let i = 3; i >= 0; i--) { g.lineTo(x + w - (i + 1) * w / 9, y - i * 14); g.lineTo(x + w - i * w / 9, y - i * 14); } g.lineTo(x + w, y); g.lineTo(x + w, 600); g.closePath(); g.fill();
    void hh;
  }
  // torenspits van de Onze-Lieve-Vrouwekerk in de verte
  g.fillStyle = '#a7867a'; g.fillRect(612, 330, 30, 160); g.beginPath(); g.moveTo(606, 332); g.lineTo(627, 230); g.lineTo(648, 332); g.closePath(); g.fill();
  g.restore();
  g.lineWidth = 10; g.strokeStyle = '#bfae8c';
  g.beginPath(); g.moveTo(140, 600); g.lineTo(140, 230); g.quadraticCurveTo(140, 70, 480, 50); g.quadraticCurveTo(820, 70, 820, 230); g.lineTo(820, 600); g.stroke();
  g.lineWidth = 3; g.strokeStyle = K.inkt; g.stroke();
  // de balk waar de klokken aan hangen
  rrect(g, 60, 92, 840, 34, 4); vul(g, '#7a5636', K.inkt, 3);
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(64, 112, 832, 10);
  for (const x of [70, 890]) { rrect(g, x - 16, 92, 32, 520, 4); vul(g, '#6a4a30', K.inkt, 3); }
  // de vloer
  g.fillStyle = '#8a6a4a'; g.fillRect(0, 540, 960, 60); g.fillStyle = 'rgba(0,0,0,.15)'; for (let x = 0; x < 960; x += 80) g.fillRect(x, 540, 3, 60);
  g.strokeStyle = K.inkt; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 540); g.lineTo(960, 540); g.stroke();
}

export const KLOKKENSPEL = {
  id: 'klokken', titel: 'Klokkenluider van het Belfort', kleur: '#c8403c', eenheid: 'rondes',
  uitleg: [
    { teken: (g) => { klok(g, -12, -18, 0.32, '#d9534a', -0.3, 0.8); klok(g, 12, -18, 0.32, '#3a8fd9'); }, tekst: 'kijk goed' },
    { toetsen: ['1', '2', '3', '4'], tekst: 'of klik: speel na' },
    { teken: (g) => { klok(g, -14, -18, 0.26, '#5aa64a'); tekst(g, '+1', 14, 6, { maat: 20, kleur: K.goud }); }, tekst: 'elke ronde: 1 klok meer' },
  ],
  scoreIcoon: (g) => klok(g, 0, -24, 0.45, K.goud),
  maak(api) {
    const r = api.rng;
    const s = {
      score: 0, klaar: false, eindTekst: '', t: 0,
      reeks: [], stand: 'pauze', wacht: 1.0, i: 0, invoer: 0, licht: [0, 0, 0, 0], zwaai: [0, 0, 0, 0], v: [0, 0, 0, 0], fout: -1, sterren: [],
    };
    const nieuweRonde = () => { s.reeks.push(Math.floor(r() * 4)); s.stand = 'toon'; s.i = 0; s.wacht = 0.6; };
    const luid = (k, duur = 0.45) => {
      s.licht[k] = duur; s.v[k] += (k % 2 ? -1 : 1) * 2.4;
      api.klank(KLOKKEN[k].toon, 1.1, 'klok', 0.07);
      for (let n = 0; n < 6; n++) s.sterren.push({ x: KLOKKEN[k].x + (r() - 0.5) * 90, y: KLOK_Y + 40 + (r() - 0.5) * 60, t: 0, k });
    };
    const tempo = () => Math.max(0.28, 0.6 - s.reeks.length * 0.025);
    s.update = (dt) => {
      s.t += dt;
      for (let k = 0; k < 4; k++) {
        s.licht[k] = Math.max(0, s.licht[k] - dt);
        s.v[k] += -s.zwaai[k] * 40 * dt; s.v[k] *= Math.pow(0.12, dt); s.zwaai[k] += s.v[k] * dt;
      }
      for (const p of s.sterren) { p.t += dt; p.y -= 30 * dt; }
      s.sterren = s.sterren.filter(p => p.t < 0.7);
      if (s.klaar) return;
      s.wacht -= dt;
      if (s.stand === 'pauze' && s.wacht <= 0) nieuweRonde();
      else if (s.stand === 'toon' && s.wacht <= 0) {
        if (s.i < s.reeks.length) { luid(s.reeks[s.i], tempo()); s.i++; s.wacht = tempo() + 0.18; }
        else { s.stand = 'beurt'; s.invoer = 0; }
      } else if (s.stand === 'goed' && s.wacht <= 0) {
        if (s.score >= MAX) { s.klaar = true; s.eindTekst = 'Bravo! Je bent meester-klokkenluider!'; }
        else nieuweRonde();
      } else if (s.stand === 'fout' && s.wacht <= 0) { s.klaar = true; s.eindTekst = 'Oei, een verkeerde klok. Goed geprobeerd!'; }
    };
    s.druk = (k) => {
      if (s.stand !== 'beurt' || s.klaar) return;
      luid(k, 0.3);
      if (k !== s.reeks[s.invoer]) { s.stand = 'fout'; s.fout = s.reeks[s.invoer]; s.wacht = 1.6; api.klank(196, 0.5, 'square', 0.04); return; }
      s.invoer++;
      if (s.invoer >= s.reeks.length) { s.score = s.reeks.length; s.stand = 'goed'; s.wacht = 1.0; }
    };
    s.toets = (key) => { const k = TOETS[key]; if (k != null) s.druk(k); };
    s.tik = (x, y) => {
      for (let k = 0; k < 4; k++) { const kl = KLOKKEN[k]; if (Math.abs(x - kl.x) < 70 * kl.s + 10 && y > KLOK_Y - 40 && y < KLOK_Y + 130 * kl.s + 40) { s.druk(k); return; } }
    };
    s.teken = (g, { stil = false } = {}) => {
      achtergrond(g, s.t);
      KLOKKEN.forEach((kl, k) => {
        const l = s.licht[k] > 0 ? Math.min(1, s.licht[k] * 5) : 0;
        g.strokeStyle = K.inkt; g.lineWidth = 4; g.beginPath(); g.moveTo(kl.x, 120); g.lineTo(kl.x, KLOK_Y - 6); g.stroke();
        const fout = s.stand === 'fout' && k === s.fout && Math.floor(s.t * 6) % 2;
        klok(g, kl.x, KLOK_Y, kl.s * 1.25, kl.kleur, s.zwaai[k], fout ? 1 : l);
        // het nummer onder de klok
        const by = KLOK_Y + 105 * kl.s * 1.25 + 26;
        cirkel(g, kl.x, by, 20, l ? '#fff7d6' : K.perkament, K.inkt, 3);
        tekst(g, kl.naam, kl.x, by + 1, { maat: 24, kleur: K.inkt, lijn: null });
      });
      for (const p of s.sterren) ster(g, p.x, p.y, 10 * (1 - p.t), 1 - p.t / 0.7);
      // de kat op de balk kijkt naar de klok die luidt
      const actief = s.licht.indexOf(Math.max(...s.licht));
      const kx = 470 + (s.licht[actief] > 0 ? (KLOKKEN[actief].x - 470) * 0.02 : 0);
      kat(g, kx, 70, 1.25, s.t, Math.sin(s.t * 1.7) > 0.985);
      if (stil) return;
      hudBalk(g, [{ icoon: (gg) => klok(gg, 0, -16, 0.3, K.goud), tekst: String(s.score), breed: 120 }]);
      // wie is aan de beurt?
      const beurt = s.stand === 'beurt';
      const msg = s.stand === 'toon' || s.stand === 'pauze' ? 'Kijk goed ...' : beurt ? 'Nu jij!' : s.stand === 'goed' ? 'Goed zo!' : 'Oei!';
      rrect(g, 360, 552, 240, 40, 20); vul(g, beurt ? '#ffcf6b' : 'rgba(255,246,227,.95)', K.inkt, 2.5);
      tekst(g, msg, 480, 573, { maat: 24, kleur: K.inkt, lijn: null });
      if (beurt) for (let i = 0; i < s.reeks.length; i++) cirkel(g, 480 - (s.reeks.length - 1) * 9 + i * 18, 535, 6, i < s.invoer ? K.goud : '#fff', K.inkt, 2);
    };
    return s;
  },
};
