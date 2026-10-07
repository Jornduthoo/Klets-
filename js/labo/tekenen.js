// Tekengereedschap voor de labo's: een eenvoudige tekenlaag op canvas, met alle beeldelementen uit de
// storyboards van de thema's (zie data/thema-waterwereld.js, veld filmpje.scenes[].beeld).
// Het tekenveld is altijd 160 breed en 90 hoog; de canvas schaalt mee.
export const BREED = 160, HOOG = 90;

/** Maak een canvas dat de ruimte vult en scherp blijft op een digibord. */
export function maakCanvas(breedte = 640, klasse = 'labo-canvas') {
  const c = document.createElement('canvas');
  c.className = klasse;
  c.width = breedte; c.height = Math.round(breedte * HOOG / BREED);
  c.style.width = '100%'; c.style.height = 'auto';
  return c;
}

/** Een tekenaar met het veld 160 x 90, ongeacht de echte grootte van het canvas. */
export class Tekenaar {
  constructor(canvas) { this.c = canvas; this.g = canvas.getContext('2d'); }
  get s() { return this.c.width / BREED; }
  begin() {
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.c.width, this.c.height);
    g.scale(this.s, this.s);
    g.lineJoin = 'round'; g.lineCap = 'round';
    return g;
  }
  /** Schermpunt (clientX, clientY) naar veldcoordinaten. */
  punt(e) {
    const r = this.c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * BREED, y: ((e.clientY - r.top) / r.height) * HOOG };
  }
}

// ---------- bouwstenen ----------
export function lucht(g, { donker = 0, nacht = 0 } = {}) {
  const gr = g.createLinearGradient(0, 0, 0, HOOG);
  if (nacht) { gr.addColorStop(0, '#101c3a'); gr.addColorStop(1, '#2b3c63'); }
  else { gr.addColorStop(0, donker > 0.3 ? '#7b8699' : '#8fd0f2'); gr.addColorStop(1, donker > 0.3 ? '#aab3c0' : '#d8f0fd'); }
  g.fillStyle = gr; g.fillRect(0, 0, BREED, HOOG);
  if (nacht) { g.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) { const x = (i * 37) % BREED, y = (i * 53) % 44; g.globalAlpha = 0.3 + ((i * 7) % 7) / 10; g.fillRect(x, y, 0.6, 0.6); } g.globalAlpha = 1; }
}
export function zee(g, { y = 62, vuil = 0 } = {}) {
  const gr = g.createLinearGradient(0, y, 0, HOOG);
  gr.addColorStop(0, vuil ? '#6c7350' : '#3f9ad0');
  gr.addColorStop(1, vuil ? '#4e5540' : '#1e6ea0');
  g.fillStyle = gr; g.fillRect(0, y, BREED, HOOG - y);
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 0.4;
  for (let i = 0; i < 7; i++) { const yy = y + 3 + i * 4; g.beginPath(); for (let x = 0; x <= BREED; x += 8) g.lineTo(x, yy + Math.sin(x / 7 + i) * 0.7); g.stroke(); }
}
export function water(g, { x = 0, y = 50, b = 160, h = 40, vuil = 0 } = {}) {
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, vuil ? '#6c7350' : '#4aa6d8');
  gr.addColorStop(1, vuil ? '#4a5138' : '#226e9e');
  g.fillStyle = gr; g.fillRect(x, y, b, h);
}
export function land(g, { punten, kleur = '#86c95a' } = {}) {
  if (!punten?.length) return;
  g.fillStyle = kleur; g.beginPath(); g.moveTo(punten[0][0], punten[0][1]);
  for (const p of punten.slice(1)) g.lineTo(p[0], p[1]);
  g.closePath(); g.fill();
}
export function zon(g, { x = 24, y = 18, r = 10 } = {}) {
  g.fillStyle = '#ffd95e'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,217,94,.6)'; g.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.moveTo(x + Math.cos(a) * (r + 1.5), y + Math.sin(a) * (r + 1.5)); g.lineTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4)); g.stroke(); }
}
export function maan(g, { x = 138, y = 40, r = 6, fase = 0.5 } = {}) {
  g.fillStyle = '#f3f1dc'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  if (fase < 0.98) { g.fillStyle = 'rgba(20,28,58,.85)'; g.beginPath(); g.arc(x - r * (1 - fase) * 1.4, y, r, 0, Math.PI * 2); g.fill(); }
}
export function wolk(g, { x = 60, y = 22, s = 1, kleur = '#ffffff' } = {}) {
  g.fillStyle = kleur;
  for (const [dx, dy, r] of [[-6, 1, 5], [0, -2, 7], [6, 1, 5], [0, 2.5, 6]]) {
    g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill();
  }
}
export function regen(g, { x = 60, y = 28, b = 30, h = 26, n = 30, sneeuw = false } = {}) {
  g.strokeStyle = '#bfe4f7'; g.fillStyle = '#ffffff'; g.lineWidth = 0.5;
  for (let i = 0; i < n; i++) {
    const px = x + ((i * 37) % 100) / 100 * b, py = y + ((i * 53) % 100) / 100 * h;
    if (sneeuw) { g.beginPath(); g.arc(px, py, 0.7, 0, Math.PI * 2); g.fill(); }
    else { g.beginPath(); g.moveTo(px, py); g.lineTo(px - 0.6, py + 2.2); g.stroke(); }
  }
}
export function damp(g, { x = 40, y = 60, h = 26, n = 5 } = {}) {
  g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.8;
  for (let i = 0; i < n; i++) {
    const px = x + i * 4 - n * 2;
    g.beginPath();
    for (let k = 0; k <= 10; k++) { const yy = y - (k / 10) * h; g.lineTo(px + Math.sin(k / 2 + i) * 1.6, yy); }
    g.stroke();
  }
}
export function rivier(g, { punten, b = 3, vuil = 0 } = {}) {
  if (!punten?.length) return;
  g.strokeStyle = vuil ? '#6c7350' : '#4aa6d8'; g.lineWidth = b;
  g.beginPath(); g.moveTo(punten[0][0], punten[0][1]);
  for (const p of punten.slice(1)) g.lineTo(p[0], p[1]);
  g.stroke();
}
export function druppel(g, { x = 50, y = 60, s = 1, alpha = 1 } = {}) {
  g.save(); g.globalAlpha = alpha; g.fillStyle = '#4aa6d8';
  g.beginPath(); g.moveTo(x, y - 3 * s); g.quadraticCurveTo(x + 2.2 * s, y, x, y + 2.4 * s); g.quadraticCurveTo(x - 2.2 * s, y, x, y - 3 * s); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - 0.6 * s, y - 0.2 * s, 0.5 * s, 0, Math.PI * 2); g.fill();
  g.restore();
}
export function pijl(g, { van = [0, 0], naar = [10, 0], tekst = '', kleur = '#2d3240' } = {}) {
  const [x0, y0] = van, [x1, y1] = naar;
  g.strokeStyle = kleur; g.fillStyle = kleur; g.lineWidth = 0.9;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.beginPath(); g.moveTo(x1, y1);
  g.lineTo(x1 - Math.cos(a - 0.45) * 3, y1 - Math.sin(a - 0.45) * 3);
  g.lineTo(x1 - Math.cos(a + 0.45) * 3, y1 - Math.sin(a + 0.45) * 3);
  g.closePath(); g.fill();
  if (tekst) label(g, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 - 2.5, tekst });
}
export function label(g, { x = 0, y = 0, tekst = '', groot = 0 } = {}) {
  g.font = `${groot ? 5 : 3.6}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const w = g.measureText(tekst).width + 2.4;
  g.fillStyle = 'rgba(255,255,255,.86)';
  g.beginPath(); g.roundRect(x - w / 2, y - (groot ? 3.4 : 2.6), w, groot ? 6.8 : 5.2, 1.4); g.fill();
  g.fillStyle = '#243049'; g.fillText(tekst, x, y);
}
export function bord(g, { x = 80, y = 40, b = 100, h = 40, tekst = '' } = {}) {
  g.fillStyle = '#2f3b2e'; g.beginPath(); g.roundRect(x - b / 2, y - h / 2, b, h, 2); g.fill();
  g.strokeStyle = '#a8845a'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = '#f4f1e2'; g.font = '4.4px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const woorden = String(tekst).split(/\s+/); const regels = []; let r = '';
  for (const w of woorden) { if (g.measureText(r + ' ' + w).width > b - 8) { regels.push(r); r = w; } else r = r ? r + ' ' + w : w; }
  regels.push(r);
  regels.forEach((lijn, i) => g.fillText(lijn, x, y - (regels.length - 1) * 2.8 + i * 5.6));
}
export function thermometer(g, { x = 140, y = 20, waarde = 0.5, hoogte = 26 } = {}) {
  g.fillStyle = '#f2f3f6'; g.beginPath(); g.roundRect(x - 1.6, y, 3.2, hoogte, 1.6); g.fill();
  g.fillStyle = '#e2643e'; const h = Math.max(1, waarde * (hoogte - 4));
  g.beginPath(); g.roundRect(x - 1, y + hoogte - 2 - h, 2, h, 1); g.fill();
  g.beginPath(); g.arc(x, y + hoogte, 2.4, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8f98a8'; g.lineWidth = 0.3;
  for (let i = 0; i <= 5; i++) { const yy = y + 2 + (i / 5) * (hoogte - 5); g.beginPath(); g.moveTo(x + 1.8, yy); g.lineTo(x + 3.4, yy); g.stroke(); }
}
export function glas(g, { x = 80, y = 46, b = 18, h = 26, vloeistof = 'water', vulling = 0.75 } = {}) {
  const kl = { water: '#7cc7ea', olie: '#e8c55a', zout: '#a8d8ea', modder: '#8a7b4e' }[vloeistof] || '#7cc7ea';
  const x0 = x - b / 2, y0 = y - h / 2;
  g.fillStyle = kl; g.globalAlpha = 0.85;
  g.fillRect(x0 + 0.8, y0 + h * (1 - vulling), b - 1.6, h * vulling);
  g.globalAlpha = 1;
  g.strokeStyle = '#cfe4ef'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y0 + h); g.lineTo(x0 + b, y0 + h); g.lineTo(x0 + b, y0); g.stroke();
  if (vloeistof === 'zout') { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 14; i++) g.fillRect(x0 + 2 + ((i * 29) % (b - 4)), y0 + h - 2 - ((i * 17) % (h - 6)), 0.6, 0.6); }
  if (vloeistof === 'modder') { g.fillStyle = 'rgba(70,58,32,.55)'; for (let i = 0; i < 20; i++) g.beginPath(), g.arc(x0 + 2 + ((i * 31) % (b - 4)), y0 + 4 + ((i * 23) % (h - 6)), 0.7, 0, Math.PI * 2), g.fill(); }
}
export function voorwerp(g, { x = 50, y = 40, soort = 'kurk', s = 1 } = {}) {
  const kl = { spijker: '#9aa0aa', hout: '#b9834f', steen: '#8b8b86', kurk: '#d8ab6a', ei: '#f4ead8', knikker: '#5fa8d8', plastic: '#d8e4ea' }[soort] || '#9aa0aa';
  g.fillStyle = kl;
  if (soort === 'spijker') { g.fillRect(x - 0.5 * s, y - 3 * s, 1 * s, 6 * s); g.fillRect(x - 1.6 * s, y - 3.6 * s, 3.2 * s, 1 * s); }
  else if (soort === 'hout') { g.fillRect(x - 3.4 * s, y - 1.6 * s, 6.8 * s, 3.2 * s); }
  else if (soort === 'ei') { g.beginPath(); g.ellipse(x, y, 2.2 * s, 2.9 * s, 0, 0, Math.PI * 2); g.fill(); }
  else { g.beginPath(); g.arc(x, y, 2.4 * s, 0, Math.PI * 2); g.fill(); }
}
export function boot(g, { x = 80, y = 56, s = 1, soort = 'rondvaart' } = {}) {
  g.fillStyle = soort === 'vracht' ? '#3f6b8c' : '#7a4a34';
  g.beginPath(); g.moveTo(x - 9 * s, y); g.lineTo(x + 9 * s, y); g.lineTo(x + 6 * s, y + 4 * s); g.lineTo(x - 6 * s, y + 4 * s); g.closePath(); g.fill();
  if (soort === 'vracht') { g.fillStyle = '#e8e4da'; g.fillRect(x + 2 * s, y - 5 * s, 5 * s, 5 * s); g.fillStyle = '#e2643e'; g.fillRect(x - 7 * s, y - 3 * s, 3.4 * s, 3 * s); g.fillStyle = '#38b37a'; g.fillRect(x - 3 * s, y - 3 * s, 3.4 * s, 3 * s); }
  else { g.fillStyle = '#a8845a'; g.fillRect(x - 7 * s, y - 1.4 * s, 14 * s, 1.4 * s); }
}
export function skyline(g, { y = 56, klein = false } = {}) {
  const h = klein ? 0.6 : 1;
  g.fillStyle = '#b6a98f';
  const huizen = [[12, 10], [22, 7], [31, 12], [41, 8], [120, 9], [131, 13], [142, 8], [151, 11]];
  for (const [x, hh] of huizen) { g.fillRect(x, y - hh * h, 8, hh * h); }
  // het Belfort
  g.fillStyle = '#c9b89a'; g.fillRect(74, y - 26 * h, 7, 26 * h);
  g.fillRect(68, y - 9 * h, 19, 9 * h);
  g.fillStyle = '#a8977c'; g.fillRect(74.5, y - 30 * h, 6, 4.4 * h);
}
export function belfort(g, { x = 78, y = 70, s = 1 } = {}) {
  g.fillStyle = '#c9b89a'; g.fillRect(x - 3.5 * s, y - 30 * s, 7 * s, 30 * s);
  g.fillRect(x - 10 * s, y - 10 * s, 20 * s, 10 * s);
  g.fillStyle = '#a8977c'; g.fillRect(x - 3 * s, y - 34 * s, 6 * s, 4 * s);
  g.fillStyle = '#f4efe2'; g.beginPath(); g.arc(x, y - 22 * s, 1.6 * s, 0, Math.PI * 2); g.fill();
}
export function sluis(g, { x = 80, y = 60, s = 1, binnen = 0.5, deurL = 0, deurR = 0, zee = 0.2, kanaal = 0.8, boot = null } = {}) {
  const b = 40 * s, h = 22 * s, x0 = x - b / 2, y0 = y - h;
  // zee links, kanaal rechts
  g.fillStyle = '#4aa6d8';
  g.fillRect(x0 - 26 * s, y - zee * h, 26 * s, zee * h + 4);
  g.fillRect(x0 + b, y - kanaal * h, 26 * s, kanaal * h + 4);
  g.fillStyle = '#5aa8d2'; g.fillRect(x0, y - binnen * h, b, binnen * h);
  g.strokeStyle = '#9aa0aa'; g.lineWidth = 1.2;
  g.strokeRect(x0, y0, b, h);
  g.fillStyle = '#7b8794';
  const deur = (px, open) => { g.save(); g.translate(px, y0); g.rotate(open * 1.2); g.fillRect(-0.9 * s, 0, 1.8 * s, h); g.restore(); };
  deur(x0, deurL); deur(x0 + b, -deurR);
  if (boot != null) { const bx = x0 - 20 * s + boot * (b + 40 * s); const by = y - Math.max(zee, Math.min(kanaal, binnen)) * h; boot === 0 ? null : null; g.save(); g.translate(0, 0); exportBoot(g, bx, by, s); g.restore(); }
  g.fillStyle = '#6b7383'; g.fillRect(x0 - 26 * s, y, b + 52 * s, 4);
}
function exportBoot(g, x, y, s) { boot(g, { x, y, s: 0.5 * s, soort: 'rondvaart' }); }
export function aarde(g, { x = 70, y = 45, r = 18, stip = false, draai = 0 } = {}) {
  g.fillStyle = '#2f7fc0'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#4f9a52';
  for (let i = 0; i < 4; i++) {
    const a = draai + i * 1.6;
    g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.5, y + Math.sin(a * 0.7) * r * 0.45, r * 0.3, r * 0.22, a, 0, Math.PI * 2); g.fill();
  }
  if (stip) { const a = draai; g.fillStyle = '#e2643e'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1.6, 0, Math.PI * 2); g.fill(); }
}
export function getij(g, { x = 70, y = 45, r = 18, hoek = 0, sterk = 1 } = {}) {
  g.strokeStyle = 'rgba(120,200,255,.9)'; g.lineWidth = 1.2;
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = i / 40 * Math.PI * 2;
    const bult = 1 + Math.cos((a - hoek) * 2) * 0.1 * sterk;
    const rr = r * 1.06 * bult;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.stroke();
}
export function plant(g, { x = 20, y = 86, s = 1 } = {}) {
  g.strokeStyle = '#3f8f4a'; g.lineWidth = 0.9;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + i * 2 * s, y - 6 * s, x + i * 3.4 * s, y - 11 * s); g.stroke(); }
}
export function dier(g, { soort = 'vis', x = 60, y = 50, s = 1 } = {}) {
  const kl = { vis: '#7fa8c0', kikker: '#5fa83c', eend: '#6b5a44', zwaan: '#fdfdfb', reiger: '#c8cfd8', slak: '#c9a24b', watervlo: '#9a7fd0', alg: '#4f9a52', meeuw: '#fdfdfb' }[soort] || '#7fa8c0';
  g.fillStyle = kl;
  if (soort === 'vis') { g.beginPath(); g.ellipse(x, y, 3.4 * s, 1.8 * s, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x + 3 * s, y); g.lineTo(x + 5.4 * s, y - 1.6 * s); g.lineTo(x + 5.4 * s, y + 1.6 * s); g.closePath(); g.fill(); g.fillStyle = '#243049'; g.beginPath(); g.arc(x - 2 * s, y - 0.4 * s, 0.4 * s, 0, Math.PI * 2); g.fill(); }
  else if (soort === 'zwaan') { g.beginPath(); g.ellipse(x, y, 4 * s, 2.4 * s, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x - 2 * s, y - 1.5 * s); g.quadraticCurveTo(x - 5 * s, y - 7 * s, x - 2.4 * s, y - 8 * s); g.lineTo(x - 1.2 * s, y - 7 * s); g.quadraticCurveTo(x - 3 * s, y - 6 * s, x - 0.6 * s, y - 1.5 * s); g.fill(); g.fillStyle = '#e8a33c'; g.beginPath(); g.moveTo(x - 2.8 * s, y - 8 * s); g.lineTo(x - 4.6 * s, y - 7.4 * s); g.lineTo(x - 2.6 * s, y - 7 * s); g.fill(); }
  else if (soort === 'kikker') { g.beginPath(); g.ellipse(x, y, 3 * s, 2 * s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#f4e06a'; g.beginPath(); g.arc(x - 1.2 * s, y - 1.6 * s, 0.8 * s, 0, Math.PI * 2); g.arc(x + 1.2 * s, y - 1.6 * s, 0.8 * s, 0, Math.PI * 2); g.fill(); }
  else if (soort === 'eend') { g.beginPath(); g.ellipse(x, y, 3.4 * s, 2 * s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2f5a3a'; g.beginPath(); g.arc(x - 2.6 * s, y - 2.6 * s, 1.5 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8a33c'; g.fillRect(x - 5 * s, y - 3 * s, 2 * s, 0.9 * s); }
  else if (soort === 'reiger') { g.strokeStyle = '#e8c35a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y + 6 * s); g.lineTo(x, y); g.stroke(); g.fillStyle = kl; g.beginPath(); g.ellipse(x, y - 1 * s, 2.4 * s, 3 * s, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x, y - 3 * s); g.lineTo(x + 0.8 * s, y - 8 * s); g.lineTo(x - 0.8 * s, y - 8 * s); g.fill(); g.beginPath(); g.arc(x, y - 8.6 * s, 1.2 * s, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e8c35a'; g.beginPath(); g.moveTo(x + 1 * s, y - 8.6 * s); g.lineTo(x + 4.4 * s, y - 7.8 * s); g.lineTo(x + 1 * s, y - 7.8 * s); g.fill(); }
  else if (soort === 'alg') { g.strokeStyle = kl; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + i * 1.4 * s - 1.4 * s, y + 3 * s); g.quadraticCurveTo(x + i * 2 * s - 2 * s, y, x + i * 1.4 * s - 1.4 * s, y - 4 * s); g.stroke(); } }
  else if (soort === 'watervlo') { g.beginPath(); g.ellipse(x, y, 1.6 * s, 2.2 * s, 0.3, 0, Math.PI * 2); g.fill(); g.strokeStyle = kl; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x + 1 * s, y + 1.8 * s); g.lineTo(x + 3 * s, y + 3.4 * s); g.stroke(); }
  else if (soort === 'slak') { g.beginPath(); g.arc(x, y, 2.2 * s, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#8a6a3b'; g.lineWidth = 0.4; g.beginPath(); g.arc(x, y, 1.3 * s, 0, Math.PI * 1.6); g.stroke(); }
  else { g.beginPath(); g.ellipse(x, y, 3 * s, 2 * s, 0, 0, Math.PI * 2); g.fill(); }
}
export function slijk(g, { x = 80, y = 52, s = 1 } = {}) {
  g.fillStyle = '#6b7a4a';
  g.beginPath();
  for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; const r = (8 + Math.sin(i * 1.7) * 2) * s; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6); }
  g.closePath(); g.fill();
  g.fillStyle = '#f4f0d8';
  for (const dx of [-3, 3]) { g.beginPath(); g.arc(x + dx * s, y - 2 * s, 1.6 * s, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#243049';
  for (const dx of [-3, 3]) { g.beginPath(); g.arc(x + dx * s, y - 2 * s, 0.7 * s, 0, Math.PI * 2); g.fill(); }
}
export function filter(g, { x = 80, y = 46, lagen = ['grind', 'zand'], b = 20, h = 34 } = {}) {
  const kleur = { grind: '#9a9183', zand: '#e3cf9a', houtskool: '#3f3f44', doek: '#f2efe4', watten: '#f8f6ef' };
  const x0 = x - b / 2, y0 = y - h / 2;
  g.strokeStyle = '#cfe4ef'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 2, y0 + h); g.lineTo(x0 + b - 2, y0 + h); g.lineTo(x0 + b, y0); g.closePath(); g.stroke();
  const lh = (h - 3) / Math.max(1, lagen.length);
  lagen.forEach((l, i) => {
    g.fillStyle = kleur[l] || '#cccccc';
    g.beginPath(); g.rect(x0 + 1.4 + i * 0.3, y0 + 1 + i * lh, b - 2.8 - i * 0.6, lh - 0.4); g.fill();
    label(g, { x: x + b / 2 + 12, y: y0 + 1 + i * lh + lh / 2, tekst: l });
  });
  g.fillStyle = '#7cc7ea'; g.beginPath(); g.arc(x, y0 + h + 4, 1.2, 0, Math.PI * 2); g.fill();
}

const SOORTEN = {
  lucht, zee, water, land, zon, maan, wolk, regen, damp, rivier, druppel, pijl, label, bord, thermometer,
  glas, voorwerp, boot, skyline, belfort, sluis, aarde, getij, plant, slijk, filter,
  sneeuw: (g, o) => regen(g, { ...o, sneeuw: true }),
};
for (const soort of ['vis', 'kikker', 'eend', 'zwaan', 'reiger', 'slak', 'watervlo', 'alg', 'meeuw']) {
  SOORTEN[soort] = (g, o) => dier(g, { ...o, soort });
}

/**
 * Teken een beeld uit een storyboard: een lijst elementen { t: soort, ...eigenschappen, anim: { prop: [van, naar] } }.
 * u = 0..1, hoe ver de scene gevorderd is (voor de animaties).
 */
export function tekenBeeld(g, beeld = [], u = 0) {
  for (const el of beeld) {
    const fn = SOORTEN[el.t];
    if (!fn) continue;
    const o = { ...el };
    for (const [k, [van, naar]] of Object.entries(el.anim || {})) o[k] = van + (naar - van) * u;
    try { fn(g, o); } catch { /* een enkel element mag de scene niet breken */ }
  }
}
export const BEELD_SOORTEN = Object.keys(SOORTEN);
