// Portretten en vooraanzichten van de 3D-figuren voor de interface (adviseursbalk, infokaarten, profiel,
// dashboard, digibord, aanmelden). Eén kleine WebGL-renderer tekent elk portret één keer naar een beeld
// (PNG in het geheugen) en bewaart het; daarna is het gewoon een <img>. Zonder WebGL: een eenvoudige
// getekende versie in dezelfde kleuren (figuren2d.js).
import { kleurenVan, DEFAULT_LOOK } from './uiterlijk.js';
import { tekenAvatar2D, tekenGids2D } from './figuren2d.js';

let motor = null;            // Promise -> { THREE, F, renderer, scene, cam } | null
const beelden = new Map();   // sleutel -> Promise<string dataURL>
const geos = new Map();      // sleutel -> geometrie

function heeftWebGL() {
  if (new URLSearchParams(location.search).get('webgl') === '0') return false;
  try { const c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch { return false; }
}

function startMotor() {
  if (motor) return motor;
  motor = (async () => {
    if (!heeftWebGL()) return null;
    try {
      const THREE = await import('../../vendor/three.module.min.js');
      const F = await import('./modellen.js');
      const canvas = document.createElement('canvas');
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.NoToneMapping;
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight('#ffffff', '#e0d4c6', 2.7));
      const zon = new THREE.DirectionalLight('#fff4e2', 2.3); zon.position.set(0.9, 1.7, 3); scene.add(zon);
      const rand = new THREE.DirectionalLight('#cfe6ff', 1.4); rand.position.set(-2, 1.6, -1.4); scene.add(rand);
      const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
      return { THREE, F, renderer, scene, cam, mat, canvas };
    } catch (e) { console.warn('portretten in 3D lukken niet:', e); return null; }
  })();
  return motor;
}

let rij = Promise.resolve();
/** Teken een figuur naar een PNG. vorm: 'portret' (hoofd en schouders) of 'vol' (hele figuur). */
function render(sleutel, maakGeo, vorm, px, yaw) {
  const k = sleutel + '|' + vorm + '|' + px + '|' + yaw.toFixed(2);
  if (beelden.has(k)) return beelden.get(k);
  const p = (rij = rij.then(async () => {
    const M = await startMotor();
    if (!M) return null;
    // even ademen tussen twee portretten, zodat de pagina reageert terwijl de rij wordt afgewerkt
    await new Promise(r => setTimeout(r, 30));
    const { THREE, renderer, scene, cam, mat } = M;
    let geo = geos.get(sleutel);
    if (!geo) { geo = maakGeo(M.F); geos.set(sleutel, geo); }
    const mesh = new THREE.Mesh(geo, mat); mesh.rotation.y = yaw;
    scene.add(mesh);
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(px * dpr), h = Math.round(px * dpr * (vorm === 'vol' ? 1.25 : 1));
    renderer.setSize(w, h, false);
    cam.aspect = w / h;
    if (vorm === 'vol') { cam.fov = 24; cam.position.set(0.55, 0.95, 2.9); cam.lookAt(0, 0.53, 0); }
    else { cam.fov = 24; cam.position.set(0.4, 1.05, 2.3); cam.lookAt(0, 0.79, 0); }
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(mesh);
    return url;
  }).catch(() => null));
  beelden.set(k, p);
  return p;
}

function maakImg(klasse, px, vorm, alt) {
  const img = document.createElement('img');
  img.className = klasse; img.alt = alt || ''; img.decoding = 'async';
  if (!alt) img.setAttribute('aria-hidden', 'true');
  img.width = px; img.height = Math.round(px * (vorm === 'vol' ? 1.25 : 1));
  img.draggable = false;
  return img;
}
function vul2D(img, teken, px, vorm) {
  const c = document.createElement('canvas'), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(px * dpr); c.height = Math.round(px * dpr * (vorm === 'vol' ? 1.25 : 1));
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  teken(g, px, Math.round(px * (vorm === 'vol' ? 1.25 : 1)), vorm);
  img.src = c.toDataURL('image/png');
}

/** Portret (of hele figuur) van een reiziger als <img>. opts: { px, vorm: 'portret'|'vol', klasse, yaw } */
export function avatarBeeld(look = DEFAULT_LOOK, { px = 48, vorm = 'portret', klasse = 'avatar', yaw = 0.35, alt } = {}) {
  const img = maakImg(klasse + ' fig-beeld', px, vorm, alt);
  const lk = look || DEFAULT_LOOK;
  const sleutel = 'a:' + JSON.stringify([lk.huid, lk.haar, lk.haarKleur, lk.kleren, lk.broek, lk.uitrusting || {}]);
  vul2D(img, (g, w, h, v) => tekenAvatar2D(g, kleurenVan(lk), w, h, v), px, vorm);
  render(sleutel, (F) => F.avatarGeo(lk), vorm, px, yaw).then(url => { if (url) img.src = url; });
  return img;
}
/** Portret van een gids als <img>. */
export function gidsBeeld(id, { px = 48, vorm = 'portret', klasse = 'portret', yaw = 0.3, alt } = {}) {
  const img = maakImg(klasse + ' fig-beeld', px, vorm, alt);
  vul2D(img, (g, w, h, v) => tekenGids2D(g, id, w, h, v), px, vorm);
  render('g:' + id, (F) => F.gidsGeo(id), vorm, px, yaw).then(url => { if (url) img.src = url; });
  return img;
}
/** Laat de motor alvast opwarmen en de gidsen tekenen (sneller bij het eerste scherm). */
export function warmOp(ids = []) { startMotor(); for (const id of ids) render('g:' + id, (F) => F.gidsGeo(id), 'portret', 48, 0.3); }

/**
 * Draaiend 3D-voorbeeld van een reiziger (aanmelden, garderobe). Tekent via dezelfde kleine renderer
 * naar een gewoon canvas. Geeft { zet(look), stop() }.
 */
export function maakVoorbeeld(houder, look, { px = 220 } = {}) {
  const c = document.createElement('canvas'); c.className = 'fig-voorbeeld';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = Math.round(px * dpr); c.height = Math.round(px * 1.2 * dpr);
  c.style.width = px + 'px'; c.style.height = Math.round(px * 1.2) + 'px';
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Zo ziet je reiziger eruit');
  houder.append(c);
  const g = c.getContext('2d');
  let huidig = look, mesh = null, geo = null, U = null, raf = 0, t = 0, laatst = performance.now(), stop = false, draai = 0.5, sleep = null;
  const teken2D = () => { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, px, px * 1.2); tekenAvatar2D(g, kleurenVan(huidig), px, Math.round(px * 1.2), 'vol'); };
  teken2D();
  startMotor().then(M => {
    if (!M || stop) return;
    const { THREE, F, renderer, scene, cam } = M;
    U = F.figUniforms();
    const { mat } = F.figMaterialen(U);
    const bouw = () => {
      if (mesh) { scene.remove(mesh); geo.dispose(); }
      geo = F.voegFigurenSamen([F.avatarGeo(huidig)]);
      mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    };
    bouw();
    const frame = (nu) => {
      if (stop) return;
      if (!c.isConnected && t > 0.5) { stop = true; return; }
      raf = requestAnimationFrame(frame);
      if (nu - laatst < 33) return;
      const dt = Math.min(0.1, (nu - laatst) / 1000); laatst = nu; t += dt;
      if (sleep == null) draai += dt * 0.7;
      U.uFigT.value = t;
      // af en toe zwaaien
      const zw = (t % 7) < 1.6 ? Math.sin(Math.min(1, (t % 7) / 0.3) * Math.PI / 2) * (1 - Math.max(0, (t % 7) - 1.3) / 0.3) : 0;
      U.uFigA.value[0].set(0, 0, 0, draai); U.uFigB.value[0].set(1, 0, 0, Math.max(0, zw));
      scene.add(mesh);
      renderer.setSize(c.width, c.height, false);
      cam.aspect = c.width / c.height; cam.fov = 24; cam.position.set(0, 0.95, 3.2); cam.lookAt(0, 0.52, 0); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
      scene.remove(mesh);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(renderer.domElement, 0, 0);
    };
    raf = requestAnimationFrame(frame);
    vb.zet = (l) => { huidig = l; bouw(); };
  });
  // slepen om zelf te draaien
  c.addEventListener('pointerdown', (e) => { sleep = e.clientX; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', (e) => { if (sleep != null) { draai += (e.clientX - sleep) * 0.02; sleep = e.clientX; } });
  c.addEventListener('pointerup', () => { sleep = null; });
  const vb = {
    zet(l) { huidig = l; teken2D(); },
    draai(d) { draai += d; },
    stop() { stop = true; cancelAnimationFrame(raf); c.remove(); },
  };
  return vb;
}
