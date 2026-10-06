// Pixelkunst in code: lettertype, gidsen, reizigers (avatars) en tegels.
// Alles wordt getekend met rechthoeken op een gehele pixelschaal, zodat het scherp blijft.

// ---------- 3x5 pixel-lettertype ----------
const G = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', '!': '010010010000010', '-': '000000111000000', '.': '000000000000010', ':': '000010000010000',
  '?': '110001010000010', '/': '001001010100100', '+': '000010111010000', "'": '010010000000000', ' ': '000000000000000',
  ',': '000000000010100', '(': '010100100100010', ')': '010001001001010', '%': '101001010100101',
};
function glyph(ch) {
  const c = ch.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return G[c] || G['?'];
}
export function textWidth(text, s = 1) { return text.length ? (text.length * 4 - 1) * s : 0; }
export function drawText(ctx, text, x, y, color = '#fff', s = 1, shadow = null) {
  if (shadow) drawText(ctx, text, x + s, y + s, shadow, s, null);
  ctx.fillStyle = color;
  let cx = Math.round(x);
  for (const ch of String(text)) {
    const g = glyph(ch);
    for (let i = 0; i < 15; i++) if (g[i] === '1') ctx.fillRect(cx + (i % 3) * s, Math.round(y) + Math.floor(i / 3) * s, s, s);
    cx += 4 * s;
  }
}
/** Naambordje: tekst op een donker plankje, gecentreerd op x. */
export function drawLabel(ctx, text, cx, y, { fg = '#fff', bg = 'rgba(20,18,40,0.78)', s = 1 } = {}) {
  const w = textWidth(text, s) + 4 * s;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, 9 * s);
  drawText(ctx, text, x + 2 * s, y + 2 * s, fg, s);
}

// ---------- Sprites uit tekst ----------
function sprite(rows, pal) { return { rows, pal, w: 16, h: rows.length }; }
export function drawSprite(ctx, sp, x, y, { flip = false, alpha = 1 } = {}) {
  if (alpha !== 1) ctx.globalAlpha = alpha;
  for (let r = 0; r < sp.rows.length; r++) {
    const row = sp.rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]; if (ch === '.' || ch === ' ') continue;
      const col = sp.pal[ch]; if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(x) + (flip ? 15 - c : c), Math.round(y) + r, 1, 1);
    }
  }
  if (alpha !== 1) ctx.globalAlpha = 1;
}

const K = '#22192a';
export const GIDS_SPRITES = {
  tella: sprite([
    '...k........k...', '..kok......kok..', '..kdok....kodk..', '..kooooooooook..', '.kooooooooooook.',
    '.kooeooooooeook.', '.koowwwnnwwwook.', '..kowwwwwwwwok..', '...kkwwwwwwkk...', '...kggggggggk.kk',
    '..koowwwwwwookdk', '..koowwwwwwookok', '..kooowwwwoookwk', '...kooooooookkk.', '...kdk....kdk...', '...kk......kk...',
  ], { k: K, o: '#e2783e', d: '#b5532a', w: '#f7ead2', e: '#141018', n: '#3a2a25', g: '#2c9c8f' }),
  woordje: sprite([
    '................', '......kkkk......', '.....krrrrk.....', '....krrrrrrk....', '....krwerrrk....', '....krrrrbbk....',
    '....kgrrrbbbk...', '...kggggrkbk....', '...kgGggggk.....', '..kgGgyyyggk....', '..kgGgyyyggk....', '..kgGggggggk....',
    '...kgGgggggk....', '....kgggggkGk...', '....kbk.kbk.kGk.', '...ppppppppppp..',
  ], { k: K, g: '#3fb34f', G: '#2a8a3a', r: '#e04a3a', y: '#f2c230', w: '#ffffff', e: '#141018', b: '#f2a530', p: '#7a5230' }),
  atlas: sprite([
    '................', '......kkkk......', '.....kggggk.....', '....kgegeggk....', '....kggggggk....', '.....kgggk......',
    '...kkkkkkkkkk...', '..ksmssmssmssk..', '.ksssmmmmsssssk.', '.ksmsssmsssmssk.', '.kssmsssmmsssSk.', '.kSSSSSSSSSSSSk.',
    '..kggk....kggk..', '..kkk......kkk..', '................', '................',
  ], { k: K, g: '#7cc06a', G: '#5a9a4c', s: '#b07a3a', S: '#8a5a26', m: '#eedcae', e: '#141018' }),
  kroniek: sprite([
    '................', '...kk......kk...', '...kbk....kbk...', '...kbbkkkkbbk...', '..kbbbbbbbbbbk..', '..kbwwwbbwwwbk..',
    '..kbwewbbwewbk..', '..kbwwwyywwwbk..', '..kbbbbyybbbbk..', '..kBbccccccbBk..', '..kBbcbcbcbcBk..', '..kBbccccccbBk..',
    '...kBbccccbBk...', '....kkbbbbkk....', '.....yk..ky.....', '................',
  ], { k: K, b: '#8a6a4a', B: '#6b4f35', c: '#e8d6b0', w: '#ffffff', e: '#141018', y: '#e8a83a' }),
  bram: sprite([
    '................', '..kkk......kkk..', '.kbmbk....kbmbk.', '.kbbbkkkkkkbbbk.', '..kbbbbbbbbbbk..', '.kbbbbbbbbbbbbk.',
    '.kbbebbbbbbebbk.', '.kbbbbmmmmbbbbk.', '.kbbbbmnnmbbbbk.', '..kbbbmmmmbbbk..', '..kkbbbbbbbbkk..', '.kbbbbmmmmbbbbk.',
    '.kbbbmmrrmmbbbk.', '.kbbbmmmmmmbbbk.', '..kbbbkkkkbbbk..', '..kkkk....kkkk..',
  ], { k: K, b: '#9a6b43', m: '#d9b48a', e: '#141018', n: '#3a2418', r: '#d9577b' }),
  byte: sprite([
    '.......r........', '.......k........', '...kkkkkkkkkk...', '...kssssssssk...', '...ksccccccsk...', '...ksceccecsk...',
    '...ksccCCccsk...', '...kssssssssk...', '....kkkkkkkk....', '..kSssssssssSk..', '.kSkssyysssskSk.', '.kSksssssssskSk.',
    '..kkSSSSSSSSkk..', '....kSk..kSk....', '...kkkk..kkkk...', '................',
  ], { k: K, s: '#c3ccd6', S: '#8a96a3', c: '#3ad1e6', C: '#1d8fa3', e: '#0d3b44', r: '#e2643e', y: '#f2c230' }),
};

// ---------- Reizigers (avatars) ----------
export const AVATAR_OPTIES = {
  huid: ['#f6d3b3', '#e8b48c', '#c98d5e', '#a86b42', '#7d4a2b', '#5a341f'],
  haar: ['kort', 'krul', 'lang', 'staart', 'hoofddoek', 'pet', 'kaal'],
  haarKleur: ['#1d1514', '#4a2e1c', '#8a5a2b', '#d2a24c', '#a33b2a', '#6d6d78'],
  kleren: ['#e2643e', '#e9a23b', '#3fa37a', '#4c8fd6', '#9a6ad6', '#d9577b', '#2f3e5a', '#e8e2d0'],
  broek: ['#2f3e5a', '#4a3a2e', '#3d5a3d', '#5b5b66'],
};
export const DEFAULT_LOOK = { huid: 2, haar: 'kort', haarKleur: 0, kleren: 3, broek: 0, uitrusting: {} };

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * Teken een reiziger van 16x16 op (x, y) in wereldpixels.
 * dir: 'down' | 'up' | 'left' | 'right'; frame: 0..3 (stapanimatie)
 */
export function drawPerson(ctx, x, y, look = DEFAULT_LOOK, dir = 'down', frame = 0) {
  x = Math.round(x); y = Math.round(y);
  const O = AVATAR_OPTIES;
  const skin = O.huid[look.huid] ?? O.huid[2];
  const hair = O.haarKleur[look.haarKleur] ?? O.haarKleur[0];
  const uit = look.uitrusting || {};
  let shirt = O.kleren[look.kleren] ?? O.kleren[3];
  if (uit.kleur === 'kleur-goud') shirt = '#e8c040';
  if (uit.kleur === 'kleur-nacht') shirt = '#2b3a78';
  const pants = O.broek[look.broek] ?? O.broek[0];
  const p = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + px, y + py, w, h); };
  const step = frame % 2 === 1 ? 1 : 0;
  const side = dir === 'left' || dir === 'right';
  const flip = dir === 'left';
  const fx = (px, w = 1) => flip ? 16 - px - w : px; // spiegel voor links

  // rug-uitrusting achter het lichaam
  if (uit.rug === 'cape') { p(3, 8, 10, 7, K); p(4, 8, 8, 6, '#2b3a78'); p(5, 10, 1, 1, '#f2e27a'); p(9, 12, 1, 1, '#f2e27a'); }
  if (uit.rug === 'rugzak' && dir !== 'up') { p(fx(side ? 2 : 2), 8, 3, 5, K); p(fx(side ? 2 : 2) + (flip ? 0 : 0), 9, 2, 3, '#a8742e'); }

  // benen
  const shoe = '#2a2230';
  if (side) {
    p(6, 12, 4, 2, pants);
    const a = frame % 2 ? 2 : 0;
    p(fx(5 + a, 2), 13, 2, 2, pants); p(fx(8 - a, 2), 13, 2, 2, pants);
    p(fx(5 + a, 2), 15, 2, 1, shoe); p(fx(8 - a, 2), 15, 2, 1, shoe);
  } else {
    const up = frame === 1 ? 1 : 0, up2 = frame === 3 ? 1 : 0;
    p(5, 12, 2, 3 - up, pants); p(9, 12, 2, 3 - up2, pants);
    p(4, 15 - up, 3, 1, shoe); p(9, 15 - up2, 3, 1, shoe);
  }
  // lichaam
  p(3, 8, 10, 5, K);
  p(4, 8, 8, 4, shirt); p(4, 11, 8, 1, shade(shirt, 0.8));
  // armen
  if (!side) { p(3, 9, 1, 2, shade(shirt, 0.85)); p(12, 9, 1, 2, shade(shirt, 0.85)); p(3, 11, 1, 1, skin); p(12, 11, 1, 1, skin); }
  else { p(fx(7), 9, 2, 3, shade(shirt, 0.8)); p(fx(7), 11 + step, 2, 1, skin); }
  // nek-uitrusting
  if (uit.nek) { const c = uit.nek === 'sjaal-blauw' ? '#3a6fd6' : '#d23f3f'; p(4, 8, 8, 1, c); if (!side) p(9, 9, 2, 2, c); }

  // hoofd
  p(3, 1, 10, 8, K);
  p(4, 2, 8, 6, skin);
  const style = look.haar || 'kort';
  if (dir === 'up') {
    if (style === 'hoofddoek') p(4, 1, 8, 8, '#7a5bb5');
    else if (style !== 'kaal') p(4, 1, 8, 6, hair);
  } else {
    // ogen
    if (side) { p(fx(10), 4, 1, 2, K); }
    else { p(6, 4, 1, 2, K); p(9, 4, 1, 2, K); p(5, 6, 1, 1, shade(skin, 0.9)); p(10, 6, 1, 1, shade(skin, 0.9)); }
    // haar
    if (style === 'kort') { p(4, 1, 8, 2, hair); p(4, 3, 1, 1, hair); if (!side) p(11, 3, 1, 1, hair); else p(fx(4), 3, 2, 2, hair); }
    if (style === 'krul') { p(3, 0, 10, 3, hair); p(3, 3, 1, 2, hair); p(12, 3, 1, 2, hair); p(5, 0, 1, 1, shade(hair, 1.3)); p(9, 1, 1, 1, shade(hair, 1.3)); }
    if (style === 'lang') { p(4, 1, 8, 2, hair); p(3, 2, 1, 7, hair); if (!side) p(12, 2, 1, 7, hair); else p(fx(3), 2, 3, 7, hair); }
    if (style === 'staart') { p(4, 1, 8, 2, hair); p(4, 3, 1, 1, hair); p(11, 3, 1, 1, hair); p(side ? fx(1, 2) : 12, 3, 2, 4, hair); }
    if (style === 'hoofddoek') { const hd = '#7a5bb5'; p(3, 0, 10, 3, hd); p(3, 3, 1, 6, hd); p(12, 3, 1, 6, hd); p(4, 8, 8, 1, hd); p(4, 3, 8, 1, shade(hd, 0.85)); }
    if (style === 'pet') { p(4, 1, 8, 2, '#2f3e5a'); p(side ? fx(10, 4) : 3, 3, side ? 4 : 10, 1, '#2f3e5a'); p(4, 3, 1, 1, hair); }
  }
  // gezicht/hoofd-uitrusting
  if (uit.gezicht === 'bril' && dir !== 'up') { if (side) p(fx(9), 4, 3, 2, '#141018'); else { p(5, 4, 3, 1, '#141018'); p(8, 4, 3, 1, '#141018'); } }
  const hoofd = uit.hoofd;
  if (hoofd === 'pet-oranje') { p(4, 0, 8, 2, '#e2783e'); p(side ? fx(10, 4) : 3, 2, side ? 4 : 10, 1, '#b5532a'); }
  if (hoofd === 'muts') { p(4, -1, 8, 3, '#d23f3f'); p(4, 1, 8, 1, '#f0f0f0'); p(7, -2, 2, 1, '#f0f0f0'); }
  if (hoofd === 'feesthoed') { p(6, -2, 4, 2, '#9a6ad6'); p(7, -4, 2, 2, '#e9a23b'); p(7, -5, 2, 1, '#f2e27a'); }
  if (hoofd === 'bladerkrans') { p(3, 1, 10, 1, '#3f8a46'); p(4, 0, 1, 1, '#6bc35a'); p(8, 0, 1, 1, '#6bc35a'); p(11, 0, 1, 1, '#6bc35a'); }
  if (hoofd === 'veer') { p(11, -3, 1, 4, '#3fb34f'); p(12, -4, 1, 2, '#e04a3a'); }
  if (hoofd === 'koptelefoon') { p(4, 0, 8, 1, '#3a3a48'); p(2, 3, 2, 3, '#3ad1e6'); p(12, 3, 2, 3, '#3ad1e6'); }
  if (uit.hand === 'lantaarn') { const lx = dir === 'left' ? 1 : 13; p(lx, 10, 2, 3, K); p(lx, 11, 2, 1, '#ffd36b'); }
}

// ---------- Tegels (16x16) ----------
export const TILE = 16;
export function paintGrass(ctx, x, y, r, frame = 0) {
  ctx.fillStyle = '#5a9e4b'; ctx.fillRect(x, y, 16, 16);
  for (let i = 0; i < 7; i++) {
    const gx = Math.floor(r() * 15), gy = Math.floor(r() * 14);
    ctx.fillStyle = r() > 0.5 ? '#6bb35a' : '#4c8a3f';
    ctx.fillRect(x + gx, y + gy, 1, 2);
  }
}
export function paintFlowers(ctx, x, y, r, frame) {
  paintGrass(ctx, x, y, r);
  const cols = ['#f2e27a', '#f08aa8', '#ffffff', '#b9a0ff'];
  for (let i = 0; i < 3; i++) {
    const fx = 2 + Math.floor(r() * 11), fy = 2 + Math.floor(r() * 11), c = cols[Math.floor(r() * cols.length)];
    const sway = (frame + i) % 2;
    ctx.fillStyle = '#3d7a34'; ctx.fillRect(x + fx, y + fy + 1, 1, 2);
    ctx.fillStyle = c; ctx.fillRect(x + fx - 1 + sway, y + fy - 1, 3, 1); ctx.fillRect(x + fx + sway, y + fy - 2, 1, 3);
  }
}
export function paintPath(ctx, x, y, r) {
  ctx.fillStyle = '#c9b48a'; ctx.fillRect(x, y, 16, 16);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 2 : 0;
    for (let col = -1; col < 4; col++) {
      ctx.fillStyle = r() > 0.5 ? '#d3c096' : '#bfa97e';
      ctx.fillRect(x + col * 4 + off + 1, y + row * 4 + 1, 3, 3);
    }
  }
}
export function paintRail(ctx, x, y) {
  ctx.fillStyle = '#6e6a62'; ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#5b5750'; for (let i = 0; i < 6; i++) ctx.fillRect(x + (i * 5) % 16, y + (i * 7) % 16, 1, 1);
  ctx.fillStyle = '#6b4a2f'; for (let i = 0; i < 16; i += 4) ctx.fillRect(x + i, y + 3, 2, 10);
  ctx.fillStyle = '#b8c0c8'; ctx.fillRect(x, y + 4, 16, 1); ctx.fillRect(x, y + 11, 16, 1);
  ctx.fillStyle = '#8a929a'; ctx.fillRect(x, y + 5, 16, 1); ctx.fillRect(x, y + 12, 16, 1);
}
export function paintPlatform(ctx, x, y, r, edge = false) {
  ctx.fillStyle = '#a7a39a'; ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#95918a'; ctx.fillRect(x, y + 15, 16, 1); ctx.fillRect(x + 15, y, 1, 16);
  if (r() > 0.7) { ctx.fillStyle = '#b4b0a6'; ctx.fillRect(x + 3, y + 5, 2, 1); }
  if (edge) { ctx.fillStyle = '#e8c547'; ctx.fillRect(x, y, 16, 2); ctx.fillStyle = '#7d7a73'; ctx.fillRect(x, y + 2, 16, 1); }
}
export function paintTreeTop(ctx, x, y, r) {
  ctx.fillStyle = K; ctx.beginPath();
  const blob = (cx, cy, rad, col) => { ctx.fillStyle = col; for (let dy = -rad; dy <= rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - dy * dy)); ctx.fillRect(x + cx - w, y + cy + dy, w * 2, 1); } };
  blob(8, 9, 8, '#1f4a2a'); blob(8, 8, 7, '#2f6e3a'); blob(7, 7, 5, '#3f8a46'); blob(6, 5, 2, '#57a85a');
}
export function paintTrunk(ctx, x, y) {
  ctx.fillStyle = '#1f4a2a'; ctx.fillRect(x + 2, y, 12, 3);
  ctx.fillStyle = '#4a3220'; ctx.fillRect(x + 6, y + 2, 4, 9);
  ctx.fillStyle = '#6b4a2f'; ctx.fillRect(x + 7, y + 2, 2, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + 11, 10, 2);
}
