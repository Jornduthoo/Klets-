// De kaart van Station Klets, opgebouwd in code (geen afbeeldingen nodig).
import { rng } from '../core/util.js';

export const T = { GRAS: 0, BLOEM: 1, PAD: 2, SPOOR: 3, PERRON: 4, RAND: 5, PLEIN: 6 };

export function buildMap() {
  const W = 46, H = 32;
  const tiles = new Uint8Array(W * H);
  const solid = new Uint8Array(W * H);
  const at = (x, y) => y * W + x;
  const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) tiles[at(x, y)] = t; };
  const rect = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, t); };
  const block = (x, y, w = 1, h = 1) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < W && j < H) solid[at(i, j)] = 1; };

  const r = rng('station-klets');
  // gras met bloemen
  for (let i = 0; i < W * H; i++) tiles[i] = r() < 0.07 ? T.BLOEM : T.GRAS;
  // sporen en perron
  rect(0, 3, W, 2, T.SPOOR); block(0, 3, W, 2);
  rect(1, 5, W - 2, 2, T.PERRON); rect(1, 5, W - 2, 1, T.RAND);
  // pleinen en paden
  rect(16, 12, 14, 8, T.PLEIN);
  rect(22, 7, 2, 25, T.PAD);
  rect(2, 17, W - 2, 2, T.PAD);
  const connectors = [[5, 16, 2, 1], [13, 16, 1, 1], [33, 16, 2, 1], [41, 16, 1, 1], [33, 19, 2, 1], [12, 19, 1, 3], [26, 19, 1, 1], [9, 7, 1, 10], [37, 7, 1, 10]];
  for (const [x, y, w, h] of connectors) rect(x, y, w, h, T.PAD);
  rect(16, 7, 1, 6, T.PAD); rect(29, 7, 2, 6, T.PAD); // langs de stationshal naar het plein
  rect(9, 22, 7, 5, T.PLEIN); // kampvuurkring

  // gebouwen
  const buildings = [
    { id: 'hal', naam: 'STATION KLETS', x: 17, y: 7, w: 12, h: 5, dak: '#3b4a7a', muur: '#e3d3b0', deur: { x: 22, w: 2, kant: 'onder' }, poi: 'missiebord', klok: true },
    { id: 'kaartenkamer', naam: 'KAARTENKAMER', x: 2, y: 10, w: 6, h: 6, dak: '#3fa37a', muur: '#e8dcc0', deur: { x: 5, w: 2, kant: 'onder' }, poi: 'gids:atlas' },
    { id: 'kiosk', naam: 'REKENKIOSK', x: 11, y: 11, w: 5, h: 5, dak: '#e2643e', muur: '#efe2c6', deur: { x: 13, w: 1, kant: 'onder' }, poi: 'gids:tella' },
    { id: 'werkplaats', naam: 'WERKPLAATS', x: 31, y: 10, w: 6, h: 6, dak: '#4c8fd6', muur: '#dfe3e8', deur: { x: 33, w: 2, kant: 'onder' }, poi: 'gids:byte' },
    { id: 'seinhuis', naam: 'SEINHUIS', x: 39, y: 8, w: 5, h: 8, dak: '#9a6ad6', muur: '#e6d8c8', deur: { x: 41, w: 1, kant: 'onder' }, poi: 'gids:kroniek', toren: true },
    { id: 'wachtzaal', naam: 'WACHTZAAL', x: 30, y: 20, w: 8, h: 5, dak: '#e9a23b', muur: '#efe6cf', deur: { x: 33, w: 2, kant: 'boven' }, poi: 'gids:woordje' },
    { id: 'kluis', naam: 'KLUIS', x: 25, y: 20, w: 3, h: 3, dak: '#6d6d78', muur: '#c8c2b6', deur: { x: 26, w: 1, kant: 'boven' }, poi: 'kluis' },
  ];
  for (const b of buildings) block(b.x, b.y, b.w, b.h);

  // gidsen staan naast hun deur
  const gidsen = [
    { id: 'atlas', x: 7, y: 16 }, { id: 'tella', x: 14, y: 16 }, { id: 'byte', x: 35, y: 16 },
    { id: 'kroniek', x: 42, y: 16 }, { id: 'woordje', x: 35, y: 19 }, { id: 'bram', x: 14, y: 23 },
  ];
  for (const g of gidsen) block(g.x, g.y);

  // objecten
  const objects = [];
  const obj = (type, x, y, extra = {}) => { objects.push({ type, x, y, ...extra }); block(x, y); };
  obj('vuur', 12, 24);
  obj('boomstam', 10, 24); obj('boomstam', 12, 26); obj('boomstam', 14, 25);
  obj('klok', 18, 14);
  obj('bank', 28, 14); obj('bank', 17, 18 + 1);
  obj('bloembak', 20, 13); obj('bloembak', 25, 13);
  // lantaarns
  const lanterns = [];
  const lamp = (x, y) => { lanterns.push({ x, y }); obj('lantaarn', x, y); };
  for (let x = 4; x < W - 2; x += 7) if (x < 21 || x > 24) lamp(x, 6);
  for (const x of [3, 10, 17, 29, 36]) lamp(x, 16);
  for (const x of [5, 19, 28, 40]) lamp(x, 19);
  lamp(21, 23); lamp(24, 27);

  // de poort (oost) en de klasstad-poort (zuid)
  const poort = { x: 44, y: 15, w: 2, h: 5 };
  rect(44, 17, 2, 2, T.PAD); block(44, 15, 2, 2); block(44, 19, 2, 1);
  const stadpoort = { x: 21, y: 30, w: 4, h: 2 };
  block(21, 30, 1, 2); block(24, 30, 1, 2); block(22, 31, 2, 1);


  // nachttrein
  const trein = { x: 5, y: 3, w: 22, h: 2 };

  // bomen langs de rand en verspreid
  const trees = [];
  const free = (x, y) => tiles[at(x, y)] <= T.BLOEM && !solid[at(x, y)];
  const nearPath = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const t = tiles[at(Math.min(W - 1, Math.max(0, x + i)), Math.min(H - 1, Math.max(0, y + j)))]; if (t === T.PAD || t === T.PLEIN) return true; } return false; };
  const tree = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H || !free(x, y)) return; trees.push({ x, y }); block(x, y); };
  for (let x = 0; x < W; x += 1) { tree(x, 1); if (x % 2 === 0) tree(x, 0); }
  for (let y = 7; y < H; y++) { tree(0, y); if (!(y >= 15 && y <= 19)) tree(W - 1, y); }
  for (let x = 1; x < W - 1; x++) if (x < 21 || x > 24) tree(x, H - 1);
  for (let i = 0; i < 70; i++) {
    const x = 1 + Math.floor(r() * (W - 2)), y = 7 + Math.floor(r() * (H - 8));
    if (!nearPath(x, y) && free(x, y)) {
      let ok = true;
      for (const b of buildings) if (x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h + 1) ok = false;
      for (const g of gidsen) if (Math.abs(g.x - x) <= 1 && Math.abs(g.y - y) <= 1) ok = false;
      if (ok) tree(x, y);
    }
  }

  // interessepunten: tegels (geblokkeerd) waar je tegen loopt, op klikt of naast staat + spatie
  block(44, 17, 2, 2);
  const pois = [];
  const poi = (id, label, foot) => pois.push({ id, label, foot });
  for (const g of gidsen) poi('gids:' + g.id, g.id, [[g.x, g.y]]);
  for (const b of buildings) {
    const foot = [];
    for (let j = b.y; j < b.y + b.h; j++) for (let i = b.x; i < b.x + b.w; i++) foot.push([i, j]);
    if (!b.poi.startsWith('gids:')) poi(b.poi, b.naam, foot);
    else pois.find(p => p.id === b.poi).foot.push(...foot);
  }
  poi('poort', 'DE POORT', [[44, 15], [45, 15], [44, 16], [45, 16], [44, 17], [45, 17], [44, 18], [45, 18], [44, 19], [45, 19]]);
  poi('klasstad', 'KLASSTAD', [[21, 30], [22, 31], [23, 31], [24, 30], [21, 31], [24, 31]]);
  const treinFoot = []; for (let i = trein.x; i < trein.x + trein.w; i++) { treinFoot.push([i, 3], [i, 4]); }
  poi('trein', 'NACHTTREIN', treinFoot);
  pois.find(p => p.id === 'gids:bram').foot.push([12, 24]);
  const poiAt = new Map();
  for (const p of pois) for (const [x, y] of p.foot) poiAt.set(at(x, y), p);

  const spawn = { x: 22, y: 6 };
  return { W, H, tiles, solid, at, buildings, gidsen, objects, lanterns, trees, pois, poiAt, poort, stadpoort, trein, spawn };
}
