// Tekenhulp voor de minispelletjes van de geheimen: alles op een 2D-canvas, in de stijl van Zwinvliet
// (warme baksteen, trapgevels, blauwe hardsteen, reien) met een donkerbruine omlijning zoals in een prentenboek.

export const K = {
  inkt: '#3b2a20', perkament: '#fff6e3', creme: '#f6eedd',
  baksteen: '#b4553c', baksteen2: '#a84e36', baksteen3: '#c06848', voeg: '#8e4430',
  dak: '#8a5444', leien: '#6e6a7c', steen: '#d9c9a8', steen2: '#cbbd9f', hardsteen: '#8e95a0',
  water: '#3f97c2', water2: '#2f7fa6', waterLicht: '#7cc4e2', slijk: '#6d6a3a', slijk2: '#4f4d28',
  gras: '#7cb850', gras2: '#5f9e4c', goud: '#f2c94c', goud2: '#d9a32a', rood: '#c8403c', groen: '#3f6b4a',
  lucht: '#bfe3f2', lucht2: '#f7e9c8', luik: '#3f6b4a', raam: '#8fbbe0', raamLicht: '#ffd27a', wit: '#ffffff',
};

/** Afgeronde rechthoek als pad. */
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** Vullen en omlijnen in één keer. */
export function vul(g, kleur, lijn = K.inkt, dikte = 2.5) { g.fillStyle = kleur; g.fill(); if (lijn) { g.lineWidth = dikte; g.strokeStyle = lijn; g.lineJoin = 'round'; g.stroke(); } }
export function ellips(g, x, y, rx, ry, kleur, lijn = K.inkt, dikte = 2.5, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2); vul(g, kleur, lijn, dikte); }
export function cirkel(g, x, y, r, kleur, lijn = K.inkt, dikte = 2.5) { ellips(g, x, y, r, r, kleur, lijn, dikte); }

/** Kleine deterministische toevalsgenerator (zelfde decor bij elk spel). */
export function zaad(s = 1) { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Een trapgevelhuis van voren: x = linkeronderhoek op de grond y, breedte w, muurhoogte h. */
export function trapgevel(g, x, y, w, h, { muur = K.baksteen, luik = K.luik, licht = 0, treden = 4, deur = true } = {}) {
  const H = w * 0.75, stap = w / (treden * 2 + 1), sh = H / treden;
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x, y - h);
  for (let i = 0; i < treden; i++) { g.lineTo(x + i * stap, y - h - i * sh); g.lineTo(x + i * stap, y - h - (i + 1) * sh); g.lineTo(x + (i + 1) * stap, y - h - (i + 1) * sh); }
  g.lineTo(x + treden * stap, y - h - H - sh * 0.5); g.lineTo(x + (treden + 1) * stap, y - h - H - sh * 0.5);
  for (let i = treden - 1; i >= 0; i--) { const xr = x + w - (i + 1) * stap; g.lineTo(xr, y - h - (i + 1) * sh); g.lineTo(x + w - i * stap, y - h - (i + 1) * sh); g.lineTo(x + w - i * stap, y - h - i * sh); }
  g.lineTo(x + w, y - h); g.lineTo(x + w, y); g.closePath();
  vul(g, muur);
  // ramen met luiken
  const kol = w > 70 ? 2 : 1, rijen = Math.max(1, Math.floor(h / 46));
  for (let r = 0; r < rijen; r++) for (let c = 0; c < kol; c++) {
    const rx = x + w * (kol === 1 ? 0.5 : c ? 0.72 : 0.28), ry = y - h + 18 + r * 44;
    if (deur && r === rijen - 1 && (kol === 1 || c === 0)) continue;
    rrect(g, rx - 8, ry, 16, 22, 3); vul(g, licht > 0.5 ? K.raamLicht : K.raam, K.inkt, 2);
    g.fillStyle = luik; g.fillRect(rx - 15, ry, 6, 22); g.fillRect(rx + 9, ry, 6, 22);
  }
  rrect(g, x + w / 2 - 6, y - h - H * 0.55, 12, 15, 6); vul(g, K.raam, K.inkt, 2);
  if (deur) { const dx = x + w * (kol === 1 ? 0.5 : 0.28); g.beginPath(); g.moveTo(dx - 10, y); g.lineTo(dx - 10, y - 26); g.arc(dx, y - 26, 10, Math.PI, 0); g.lineTo(dx + 10, y); g.closePath(); vul(g, '#5a3a26', K.inkt, 2); }
}

/** Een eendje (bovenaanzicht of zijaanzicht), middelpunt x,y, grootte s (~1 = 20 px). */
export function eendje(g, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  ellips(g, 0, 4, 13, 10, '#ffd84d');
  cirkel(g, 6, -6, 8, '#ffd84d');
  g.beginPath(); g.moveTo(13, -7); g.lineTo(21, -4); g.lineTo(13, -2); g.closePath(); vul(g, '#f08a2c', K.inkt, 2);
  cirkel(g, 8, -8, 1.8, K.inkt, null);
  g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(0, 8, -9, 9); g.strokeStyle = '#e9b52f'; g.lineWidth = 2; g.stroke();
  g.restore();
}
/** Een visje; kleur, richting (1 = naar rechts). */
export function vis(g, x, y, s = 1, kleur = '#e2643e', richting = 1, staart = 0) {
  g.save(); g.translate(x, y); g.scale(s * richting, s);
  g.beginPath(); g.moveTo(-14, 0); g.lineTo(-24, -8 + staart * 3); g.lineTo(-24, 8 + staart * 3); g.closePath(); vul(g, kleur, K.inkt, 2);
  ellips(g, 0, 0, 16, 9, kleur, K.inkt, 2);
  g.beginPath(); g.moveTo(-3, -8); g.quadraticCurveTo(2, -14, 7, -8); vul(g, kleur, K.inkt, 2);
  cirkel(g, 8, -2, 2.6, '#fff', K.inkt, 1.5); cirkel(g, 8.6, -2, 1.2, K.inkt, null);
  g.beginPath(); g.moveTo(-4, -5); g.lineTo(-4, 5); g.strokeStyle = 'rgba(59,42,32,.45)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}
/** Een slijkklodder van de Slijkkraak (met boze oogjes). */
export function slijk(g, x, y, r = 18, t = 0) {
  g.save(); g.translate(x, y);
  g.beginPath();
  for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, rr = r * (0.85 + Math.sin(a * 3 + t * 2) * 0.1 + Math.sin(a * 5 - t) * 0.06); i ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.8); }
  g.closePath(); vul(g, K.slijk, K.slijk2, 3);
  ellips(g, -r * 0.3, -r * 0.3, r * 0.22, r * 0.12, 'rgba(255,255,255,.25)', null);
  cirkel(g, -r * 0.25, -r * 0.05, r * 0.16, '#fff', K.inkt, 1.5); cirkel(g, r * 0.22, -r * 0.05, r * 0.16, '#fff', K.inkt, 1.5);
  cirkel(g, -r * 0.22, -r * 0.02, r * 0.07, K.inkt, null); cirkel(g, r * 0.25, -r * 0.02, r * 0.07, K.inkt, null);
  g.restore();
}
/** Afval: 'fles', 'laars', 'blik' of 'zak'. */
export function afval(g, soort, x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  if (soort === 'fles') { rrect(g, -7, -12, 14, 24, 5); vul(g, '#6fbf8a'); rrect(g, -3, -20, 6, 9, 2); vul(g, '#6fbf8a'); rrect(g, -6, -4, 12, 8, 2); vul(g, '#f3ecd8', K.inkt, 1.5); }
  else if (soort === 'laars') { g.beginPath(); g.moveTo(-8, -16); g.lineTo(4, -16); g.lineTo(4, 4); g.lineTo(14, 6); g.lineTo(14, 13); g.lineTo(-8, 13); g.closePath(); vul(g, '#5d5a52'); g.fillStyle = '#3f3c36'; g.fillRect(-8, 9, 22, 4); }
  else if (soort === 'blik') { rrect(g, -8, -11, 16, 22, 3); vul(g, '#c8403c'); g.fillStyle = '#e8e2d6'; g.fillRect(-8, -3, 16, 6); g.strokeStyle = K.inkt; g.lineWidth = 1.5; g.strokeRect(-8, -3, 16, 6); }
  else { g.beginPath(); g.moveTo(-12, -6); g.quadraticCurveTo(0, -18, 12, -6); g.lineTo(10, 12); g.lineTo(-10, 12); g.closePath(); vul(g, '#e8e8f0'); g.beginPath(); g.moveTo(-5, -10); g.quadraticCurveTo(0, -20, 5, -10); g.strokeStyle = K.inkt; g.lineWidth = 2; g.stroke(); }
  g.restore();
}
export function hart(g, x, y, s = 1, vol = true) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-14, -4, -8, -14, 0, -7); g.bezierCurveTo(8, -14, 14, -4, 0, 6); g.closePath();
  vul(g, vol ? '#e9578a' : 'rgba(255,255,255,.35)', K.inkt, 2);
  g.restore();
}
/** Een klok (bel) van het beiaard; kleur, zwaai in radialen, gloed 0..1. */
export function klok(g, x, y, s = 1, kleur = K.goud, zwaai = 0, gloed = 0) {
  g.save(); g.translate(x, y); g.rotate(zwaai); g.scale(s, s);
  if (gloed > 0) { const gr = g.createRadialGradient(0, 40, 4, 0, 40, 95); gr.addColorStop(0, `rgba(255,240,170,${0.85 * gloed})`); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 40, 95, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = K.inkt; g.fillRect(-4, -8, 8, 14);
  g.beginPath(); g.moveTo(-18, 6); g.bezierCurveTo(-20, 30, -26, 52, -40, 62); g.lineTo(40, 62); g.bezierCurveTo(26, 52, 20, 30, 18, 6); g.quadraticCurveTo(0, -4, -18, 6); g.closePath();
  vul(g, kleur, K.inkt, 3);
  g.beginPath(); g.moveTo(-10, 12); g.bezierCurveTo(-12, 30, -16, 44, -26, 54); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-38, 54, 76, 5);
  cirkel(g, 0, 66 + Math.sin(zwaai * 3) * 2, 7, '#6b5a48', K.inkt, 2.5);
  g.restore();
}
/** Wolkje. */
export function wolk(g, x, y, s = 1, kleur = 'rgba(255,255,255,.92)') {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = kleur;
  g.beginPath(); g.arc(-22, 6, 16, 0, Math.PI * 2); g.arc(0, -4, 22, 0, Math.PI * 2); g.arc(24, 6, 15, 0, Math.PI * 2); g.rect(-22, 6, 46, 15); g.fill();
  g.restore();
}
/** Tekst met omlijning (goed leesbaar op elk decor). */
export function tekst(g, s, x, y, { maat = 28, kleur = '#fff', lijn = K.inkt, uitlijn = 'center', dik = 6, gewicht = 800 } = {}) {
  g.font = `${gewicht} ${maat}px "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif`;
  g.textAlign = uitlijn; g.textBaseline = 'middle';
  if (lijn) { g.lineWidth = dik; g.strokeStyle = lijn; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = kleur; g.fillText(s, x, y);
}
/** Een zwarte kat (zijaanzicht, zittend), staart zwaait mee met t. */
export function kat(g, x, y, s = 1, t = 0, knipper = false) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(14, 18); g.quadraticCurveTo(40 + Math.sin(t * 2) * 8, 14, 34 + Math.sin(t * 2) * 10, -12); g.strokeStyle = '#26232c'; g.lineWidth = 7; g.lineCap = 'round'; g.stroke();
  ellips(g, 0, 8, 18, 16, '#2b2832', K.inkt, 2);
  cirkel(g, -2, -14, 13, '#2b2832', K.inkt, 2);
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(-2 + sx * 4, -24); g.lineTo(-2 + sx * 12, -32); g.lineTo(-2 + sx * 12, -18); g.closePath(); vul(g, '#2b2832', K.inkt, 2); }
  if (knipper) { g.strokeStyle = '#f2c94c'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, -15); g.lineTo(-4, -15); g.moveTo(1, -15); g.lineTo(6, -15); g.stroke(); }
  else { ellips(g, -6.5, -15, 3, 3.6, '#f2e04c', null); ellips(g, 3.5, -15, 3, 3.6, '#f2e04c', null); g.fillStyle = K.inkt; g.fillRect(-7.2, -17.5, 1.4, 5); g.fillRect(2.8, -17.5, 1.4, 5); }
  cirkel(g, -2, -9, 1.6, '#e9578a', null);
  g.restore();
}
/** Rat Remi met zijn hoedje (zittend, zijaanzicht naar rechts). */
export function rat(g, x, y, s = 1, t = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(-14, 10); g.quadraticCurveTo(-34, 14 + Math.sin(t * 3) * 3, -40, 0); g.strokeStyle = '#d99a8a'; g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
  ellips(g, -2, 4, 16, 12, '#8d8794', K.inkt, 2);
  ellips(g, 13, -6, 11, 8, '#8d8794', K.inkt, 2, 0.2);
  cirkel(g, 6, -14, 6, '#b7a3ad', K.inkt, 2);
  cirkel(g, 23, -3, 2.6, '#e9578a', K.inkt, 1.2);
  cirkel(g, 15, -9, 1.8, K.inkt, null);
  g.strokeStyle = 'rgba(59,42,32,.7)'; g.lineWidth = 1; g.beginPath(); for (const d of [-2, 1, 4]) { g.moveTo(22, -3); g.lineTo(32, -4 + d + Math.sin(t * 8) * 0.8); } g.stroke();
  // hoedje
  g.beginPath(); g.ellipse(9, -17, 10, 3, 0.2, 0, Math.PI * 2); vul(g, '#c8403c', K.inkt, 2);
  rrect(g, 3, -27, 11, 10, 3); vul(g, '#c8403c', K.inkt, 2);
  g.restore();
}
/** Een gouden kikker (bovenaanzicht), voor de Reienrace. */
export function kikker(g, x, y, s = 1, glans = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (const sx of [-1, 1]) { ellips(g, sx * 13, 8, 7, 5, K.goud2, K.inkt, 2); ellips(g, sx * 11, -8, 5, 4, K.goud2, K.inkt, 2); }
  ellips(g, 0, 0, 13, 15, K.goud, K.inkt, 2);
  for (const sx of [-1, 1]) { cirkel(g, sx * 6, -11, 4.5, K.goud, K.inkt, 2); cirkel(g, sx * 6, -11.5, 1.8, K.inkt, null); }
  if (glans > 0) { g.fillStyle = `rgba(255,255,255,${glans})`; g.beginPath(); g.ellipse(-4, -2, 3, 6, -0.4, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
/** Schittering (vierpuntige ster). */
export function ster(g, x, y, r, a = 1, kleur = '255,240,170') {
  g.save(); g.translate(x, y); g.fillStyle = `rgba(${kleur},${a})`;
  g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(0, 0, r, 0); g.quadraticCurveTo(0, 0, 0, r); g.quadraticCurveTo(0, 0, -r, 0); g.quadraticCurveTo(0, 0, 0, -r); g.fill();
  g.restore();
}
