// Eenvoudige getekende figuren (zonder WebGL): dezelfde ronde vormen en kleuren als de 3D-figuren,
// met een zachte schaduw. Gebruikt als terugval en als voorlopig beeld tot het 3D-portret klaar is.

function licht(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (sh) => { const v = (n >> sh) & 255; return Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f); };
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}
function bol(g, x, y, rx, ry, kleur) {
  const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.4, Math.min(rx, ry) * 0.1, x, y, Math.max(rx, ry) * 1.05);
  gr.addColorStop(0, licht(kleur, 1.18)); gr.addColorStop(1, licht(kleur, 0.8));
  g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
}
function rondeRect(g, x, y, w, h, r, kleur) {
  const gr = g.createLinearGradient(x, y, x + w, y + h);
  gr.addColorStop(0, licht(kleur, 1.12)); gr.addColorStop(1, licht(kleur, 0.82));
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
}
function ogen(g, cx, cy, s, d = 0.34) {
  for (const k of [-1, 1]) {
    g.fillStyle = '#2a2230'; g.beginPath(); g.ellipse(cx + k * s * d, cy, s * 0.11, s * 0.15, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + k * s * d + s * 0.04, cy - s * 0.06, s * 0.04, 0, Math.PI * 2); g.fill();
  }
}

/** Kader: de figuur in het midden, hoofd met straal s op (cx, cy). */
function kader(w, h, vorm) {
  if (vorm === 'vol') { const s = Math.min(w, h / 1.25) * 0.24; return { s, cx: w / 2, cy: h * 0.3, lijf: true }; }
  const s = w * 0.3; return { s, cx: w / 2, cy: h * 0.44, lijf: false };
}

export function tekenAvatar2D(g, K, w, h, vorm = 'portret') {
  const { s, cx, cy, lijf } = kader(w, h, vorm);
  // schouders / lijf
  if (lijf) {
    for (const k of [-1, 1]) { rondeRect(g, cx + k * s * 0.32 - s * 0.16, cy + s * 1.55, s * 0.32, s * 0.7, s * 0.12, K.broek); bol(g, cx + k * s * 0.32, cy + s * 2.25, s * 0.22, s * 0.12, '#3a3446'); }
    rondeRect(g, cx - s * 0.68, cy + s * 0.8, s * 1.36, s * 0.95, s * 0.4, K.jas);
    for (const k of [-1, 1]) { rondeRect(g, cx + k * s * 0.72 - s * 0.14, cy + s * 0.9, s * 0.28, s * 0.7, s * 0.14, K.jas); bol(g, cx + k * s * 0.72, cy + s * 1.62, s * 0.14, s * 0.14, K.huid); }
  } else {
    rondeRect(g, cx - s * 1.15, cy + s * 0.85, s * 2.3, s * 1.4, s * 0.7, K.jas);
  }
  const stijl = K.stijl;
  // haar achter het hoofd
  if (stijl === 'lang') rondeRect(g, cx - s * 0.98, cy - s * 0.4, s * 1.96, s * 1.5, s * 0.6, K.haar);
  if (stijl === 'staart') bol(g, cx + s * 0.95, cy - s * 0.2, s * 0.3, s * 0.45, K.haar);
  if (stijl === 'hoofddoek') { bol(g, cx, cy + s * 0.05, s * 1.12, s * 1.15, '#7a5bb5'); rondeRect(g, cx - s * 0.9, cy + s * 0.55, s * 1.8, s * 0.7, s * 0.35, '#7a5bb5'); }
  // hoofd
  bol(g, cx, cy, s, s * 0.94, K.huid);
  ogen(g, cx, cy + s * 0.06, s);
  g.fillStyle = 'rgba(255,120,140,.35)'; for (const k of [-1, 1]) { g.beginPath(); g.ellipse(cx + k * s * 0.56, cy + s * 0.32, s * 0.15, s * 0.09, 0, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#7a3b3b'; g.lineWidth = Math.max(1, s * 0.05); g.beginPath(); g.arc(cx, cy + s * 0.32, s * 0.13, 0.2, Math.PI - 0.2); g.stroke();
  // haar bovenop
  if (stijl === 'kort' || stijl === 'lang' || stijl === 'staart' || stijl === 'pet') {
    g.save(); g.beginPath(); g.ellipse(cx, cy - s * 0.1, s * 1.06, s * 0.98, 0, Math.PI, Math.PI * 2); g.clip(); bol(g, cx, cy - s * 0.12, s * 1.06, s * 0.98, K.haar); g.restore();
  }
  if (stijl === 'krul') for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; bol(g, cx + Math.cos(a) * s * 0.85, cy - s * 0.15 + Math.sin(a) * s * 0.8, s * 0.32, s * 0.3, K.haar); }
  if (stijl === 'hoofddoek') { g.strokeStyle = licht('#7a5bb5', 0.85); g.lineWidth = s * 0.18; g.beginPath(); g.ellipse(cx, cy + s * 0.05, s * 0.98, s * 0.95, 0, 0, Math.PI * 2); g.stroke(); }
  const uit = K.uit || {};
  const pet = (k) => { g.save(); g.beginPath(); g.ellipse(cx, cy - s * 0.2, s * 1.06, s * 0.9, 0, Math.PI, Math.PI * 2); g.clip(); bol(g, cx, cy - s * 0.2, s * 1.06, s * 0.9, k); g.restore(); bol(g, cx + s * 0.25, cy - s * 0.22, s * 0.75, s * 0.13, licht(k.startsWith('#') ? k : '#2f3e5a', 0.85)); };
  if (stijl === 'pet') pet('#2f3e5a');
  if (uit.hoofd === 'pet-oranje') pet('#e2783e');
  if (uit.hoofd === 'muts') { g.save(); g.beginPath(); g.ellipse(cx, cy - s * 0.15, s * 1.08, s * 1.0, 0, Math.PI, Math.PI * 2); g.clip(); bol(g, cx, cy - s * 0.15, s * 1.08, s, '#d23f3f'); g.restore(); rondeRect(g, cx - s * 1.05, cy - s * 0.3, s * 2.1, s * 0.25, s * 0.12, '#f4f1ea'); bol(g, cx, cy - s * 1.18, s * 0.22, s * 0.22, '#f4f1ea'); }
  if (uit.hoofd === 'feesthoed') { g.fillStyle = '#9a6ad6'; g.beginPath(); g.moveTo(cx - s * 0.4, cy - s * 0.75); g.lineTo(cx + s * 0.4, cy - s * 0.75); g.lineTo(cx, cy - s * 1.75); g.closePath(); g.fill(); bol(g, cx, cy - s * 1.75, s * 0.15, s * 0.15, '#f2e27a'); }
  if (uit.hoofd === 'bladerkrans') for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; bol(g, cx + Math.cos(a) * s * 0.95, cy - s * 0.25 + Math.sin(a) * s * 0.7, s * 0.16, s * 0.16, i % 3 === 0 ? '#ff8fb1' : '#4fa548'); }
  if (uit.hoofd === 'veer') { g.fillStyle = '#3fb34f'; g.beginPath(); g.ellipse(cx + s * 0.6, cy - s * 1.15, s * 0.1, s * 0.4, 0.4, 0, Math.PI * 2); g.fill(); }
  if (uit.hoofd === 'koptelefoon') { g.strokeStyle = '#3a3a48'; g.lineWidth = s * 0.12; g.beginPath(); g.arc(cx, cy, s * 1.04, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); for (const k of [-1, 1]) bol(g, cx + k * s, cy, s * 0.2, s * 0.28, '#3ad1e6'); }
  if (uit.gezicht === 'bril') { g.strokeStyle = '#22222c'; g.lineWidth = Math.max(1, s * 0.06); for (const k of [-1, 1]) { g.beginPath(); g.arc(cx + k * s * 0.34, cy + s * 0.06, s * 0.2, 0, Math.PI * 2); g.stroke(); } }
  if (uit.nek) { const c = uit.nek === 'sjaal-blauw' ? '#3a6fd6' : '#d23f3f'; rondeRect(g, cx - s * 0.6, cy + s * 0.78, s * 1.2, s * 0.26, s * 0.13, c); }
}

const GIDS2D = {
  atlas: { kop: '#7cc56a', extra(g, cx, cy, s) { g.save(); g.beginPath(); g.ellipse(cx, cy - s * 0.25, s * 0.98, s * 0.85, 0, Math.PI, Math.PI * 2); g.clip(); bol(g, cx, cy - s * 0.25, s * 0.98, s * 0.85, '#e9d7a7'); g.restore(); bol(g, cx, cy - s * 0.27, s * 1.4, s * 0.12, '#dcc690'); }, lijf: '#b07a3e' },
  woordje: { kop: '#e2453a', extra(g, cx, cy, s) { for (const k of [-1, 1]) bol(g, cx + k * s * 0.38, cy, s * 0.32, s * 0.3, '#fdf4ea'); g.fillStyle = '#3a3446'; g.beginPath(); g.moveTo(cx - s * 0.22, cy + s * 0.25); g.quadraticCurveTo(cx + s * 0.05, cy + s * 0.15, cx + s * 0.22, cy + s * 0.25); g.quadraticCurveTo(cx + s * 0.1, cy + s * 0.75, cx, cy + s * 0.78); g.closePath(); g.fill(); bol(g, cx, cy - s, s * 0.15, s * 0.3, '#f6c445'); }, lijf: '#3d8fe0' },
  tella: { kop: '#ec7f35', extra(g, cx, cy, s) { for (const k of [-1, 1]) { g.fillStyle = '#ec7f35'; g.beginPath(); g.moveTo(cx + k * s * 0.35, cy - s * 0.7); g.lineTo(cx + k * s * 0.9, cy - s * 0.55); g.lineTo(cx + k * s * 0.75, cy - s * 1.35); g.closePath(); g.fill(); } bol(g, cx, cy + s * 0.45, s * 0.55, s * 0.38, '#fbf3e6'); bol(g, cx, cy + s * 0.32, s * 0.12, s * 0.09, '#2a2230'); }, lijf: '#ec7f35' },
  kroniek: { kop: '#8a5a3c', extra(g, cx, cy, s) { for (const k of [-1, 1]) { bol(g, cx + k * s * 0.4, cy, s * 0.42, s * 0.42, '#e8cfa6'); bol(g, cx + k * s * 0.4, cy, s * 0.27, s * 0.27, '#ffffff'); bol(g, cx + k * s * 0.38, cy + s * 0.02, s * 0.15, s * 0.15, '#2a2230'); } g.fillStyle = '#f2a33a'; g.beginPath(); g.moveTo(cx - s * 0.1, cy + s * 0.3); g.lineTo(cx + s * 0.1, cy + s * 0.3); g.lineTo(cx, cy + s * 0.55); g.closePath(); g.fill(); }, lijf: '#6b4430', geenOgen: true },
  bram: { kop: '#a06b45', extra(g, cx, cy, s) { for (const k of [-1, 1]) { bol(g, cx + k * s * 0.72, cy - s * 0.72, s * 0.3, s * 0.3, '#a06b45'); bol(g, cx + k * s * 0.72, cy - s * 0.72, s * 0.16, s * 0.16, '#f0a5a0'); } bol(g, cx, cy + s * 0.45, s * 0.42, s * 0.32, '#e6c49c'); bol(g, cx, cy + s * 0.35, s * 0.15, s * 0.11, '#2a2230'); }, lijf: '#3fa37a' },
  byte: { kop: '#cfd6e2', vierkant: true, extra(g, cx, cy, s) { rondeRect(g, cx - s * 0.75, cy - s * 0.45, s * 1.5, s * 1.0, s * 0.15, '#24324a'); g.fillStyle = '#5ff0ff'; for (const k of [-1, 1]) g.fillRect(cx + k * s * 0.32 - s * 0.1, cy - s * 0.2, s * 0.2, s * 0.28); g.strokeStyle = '#5ff0ff'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(cx, cy + s * 0.18, s * 0.15, 0.2, Math.PI - 0.2); g.stroke(); g.fillStyle = '#9aa3b4'; g.fillRect(cx - s * 0.03, cy - s * 1.25, s * 0.06, s * 0.4); bol(g, cx, cy - s * 1.3, s * 0.12, s * 0.12, '#ff7a59'); }, lijf: '#9aa3b4', geenOgen: true },
};
export function tekenGids2D(g, id, w, h, vorm = 'portret') {
  const G = GIDS2D[id] || GIDS2D.atlas;
  const { s, cx, cy } = kader(w, h, vorm);
  rondeRect(g, cx - s * 1.0, cy + s * 0.75, s * 2.0, s * (vorm === 'vol' ? 1.6 : 1.4), s * 0.6, G.lijf);
  if (G.vierkant) rondeRect(g, cx - s * 1.0, cy - s * 0.85, s * 2.0, s * 1.65, s * 0.3, G.kop);
  else bol(g, cx, cy, s * 1.02, s * 0.95, G.kop);
  if (!G.geenOgen) ogen(g, cx, cy, s);
  G.extra(g, cx, cy, s);
}
