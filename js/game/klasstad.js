// De Klasstad: elk behaald doel = een gebouw. Getekend in pixelstijl.
import { drawText, textWidth } from './pixel.js';
import { rng } from '../core/util.js';

const K = '#22192a';
const KLEUR = { Taal: '#e9a23b', Getal: '#e2643e', Wereld: '#3fa37a', Hart: '#d9577b', Maker: '#4c8fd6', Brein: '#9a6ad6' };

/** Teken de stad. Geeft hitboxen terug (canvaspixels) voor tooltips. */
export function drawKlasstad(cv, gebouwen, { kaartstukken = 0 } = {}) {
  const cols = 8, lotW = 36, lotH = 44, pad = 10;
  const rows = Math.max(2, Math.ceil((gebouwen.length + 1) / cols));
  const W = cols * lotW + pad * 2, H = 60 + rows * lotH + pad;
  const S = Math.max(2, Math.min(4, Math.floor((cv.parentElement?.clientWidth || 640) / W)));
  cv.width = W * S; cv.height = H * S;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(S, 0, 0, S, 0, 0);
  const r = rng('stad');
  // grond
  g.fillStyle = '#5a9e4b'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 400; i++) { g.fillStyle = r() > 0.5 ? '#6bb35a' : '#4c8a3f'; g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 2); }
  // lucht met verdwijnende mist bovenaan
  const sky = g.createLinearGradient(0, 0, 0, 40); sky.addColorStop(0, '#9fc9ef'); sky.addColorStop(1, '#d9ecf7');
  g.fillStyle = sky; g.fillRect(0, 0, W, 40);
  // stadhuis met kaartstukken
  const sx = W / 2 - 40;
  g.fillStyle = K; g.fillRect(sx - 1, 10, 82, 40);
  g.fillStyle = '#efe2c6'; g.fillRect(sx, 22, 80, 27);
  g.fillStyle = '#3b4a7a'; for (let i = 0; i < 12; i++) g.fillRect(sx - 2 + i, 22 - i, 84 - i * 2, 1);
  drawText(g, 'STADHUIS', sx + 40 - textWidth('STADHUIS') / 2, 26, K);
  for (let i = 0; i < 6; i++) { // wereldkaart in 6 stukken
    const px = sx + 8 + i * 11, py = 34;
    g.fillStyle = K; g.fillRect(px - 1, py - 1, 11, 11);
    g.fillStyle = i < kaartstukken ? '#4c8fd6' : '#b8b4aa'; g.fillRect(px, py, 9, 9);
    if (i < kaartstukken) { g.fillStyle = '#3fa37a'; g.fillRect(px + 1 + (i % 3), py + 2, 4, 3); g.fillRect(px + 4, py + 5 + (i % 2), 3, 2); }
  }
  // straten
  g.fillStyle = '#c9b48a';
  for (let row = 0; row <= rows; row++) g.fillRect(pad, 54 + row * lotH, cols * lotW, 4);
  g.fillRect(W / 2 - 2, 48, 4, 8);
  const hits = [];
  gebouwen.forEach((b, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = pad + col * lotW + 4, baseY = 54 + (row + 1) * lotH - 2;
    const h = drawGebouw(g, b, x, baseY);
    hits.push({ x: x * S, y: (baseY - h) * S, w: 28 * S, h: h * S, tekst: `${b.type}: ${b.code} - ${b.aantal} reiziger${b.aantal > 1 ? 's' : ''}. ${b.doel}` });
  });
  // lege bouwgrond
  for (let i = gebouwen.length; i < rows * cols; i++) {
    const col = i % cols, row = Math.floor(i / cols); const x = pad + col * lotW + 4, y = 54 + (row + 1) * lotH - 14;
    g.fillStyle = '#7a5a3a'; g.fillRect(x + 4, y, 20, 10); g.fillStyle = '#8a6a4a'; g.fillRect(x + 5, y + 1, 18, 8);
    g.fillStyle = K; g.fillRect(x + 13, y - 6, 1, 7); g.fillStyle = '#f4efe2'; g.fillRect(x + 10, y - 9, 8, 4);
  }
  return hits;
}

function drawGebouw(g, b, x, baseY) {
  const c = KLEUR[b.macht] || '#888';
  const verd = Math.min(6, b.aantal);
  const w = 28;
  let h;
  if (b.macht === 'Hart') { // vredestuin: boom met hartjesbloemen, groeit breder
    h = 14 + verd * 3;
    g.fillStyle = '#3d7a34'; g.fillRect(x, baseY - 4, w, 4);
    g.fillStyle = '#6b4a2f'; g.fillRect(x + 13, baseY - h + 8, 3, h - 8);
    g.fillStyle = K; g.fillRect(x + 5, baseY - h - 1, 19, 12); g.fillStyle = '#3f8a46'; g.fillRect(x + 6, baseY - h, 17, 10);
    for (let i = 0; i < verd; i++) { g.fillStyle = c; g.fillRect(x + 2 + i * 4, baseY - 7, 3, 3); }
    return h + 2;
  }
  const floorH = b.macht === 'Getal' || b.macht === 'Brein' ? 8 : 7;
  h = 8 + verd * floorH;
  const bw = b.macht === 'Getal' || b.macht === 'Brein' ? 18 : w; const bx = x + (w - bw) / 2;
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(bx + 2, baseY - 1, bw, 3);
  g.fillStyle = K; g.fillRect(bx - 1, baseY - h, bw + 2, h);
  g.fillStyle = '#efe6cf'; g.fillRect(bx, baseY - h + 6, bw, h - 6);
  for (let f = 0; f < verd; f++) {
    const fy = baseY - 7 - f * floorH;
    for (let wx = bx + 2; wx < bx + bw - 3; wx += 5) { g.fillStyle = '#9fd3f0'; g.fillRect(wx, fy, 3, 3); }
  }
  // dak
  if (b.macht === 'Wereld') { g.fillStyle = K; g.fillRect(bx + 3, baseY - h - 4, bw - 6, 5); g.fillStyle = c; g.fillRect(bx + 4, baseY - h - 3, bw - 8, 4); g.fillRect(bx, baseY - h, bw, 6); }
  else if (b.macht === 'Brein') { g.fillStyle = c; g.fillRect(bx, baseY - h, bw, 6); g.fillStyle = K; g.fillRect(bx + bw - 4, baseY - h - 5, 6, 3); }
  else { g.fillStyle = c; for (let i = 0; i < 6; i++) g.fillRect(bx - 1 + i, baseY - h + i - 2, bw + 2 - i * 2, 1); g.fillRect(bx, baseY - h + 3, bw, 3); }
  if (b.macht === 'Maker') { g.fillStyle = K; g.fillRect(bx + bw - 6, baseY - h - 6, 3, 6); }
  // deur
  g.fillStyle = '#7a5230'; g.fillRect(bx + bw / 2 - 2, baseY - 5, 4, 5);
  // vlaggetje met aantal
  g.fillStyle = K; g.fillRect(bx + 1, baseY - h - 9, 1, 8); g.fillStyle = c; g.fillRect(bx + 2, baseY - h - 9, 6, 6);
  drawText(g, String(Math.min(9, b.aantal)), bx + 3, baseY - h - 9 + 1, '#fff');
  return h + 10;
}
