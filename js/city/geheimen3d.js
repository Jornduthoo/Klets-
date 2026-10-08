// De drie geheimen van Zwinvliet in 3D: kleine figuurtjes die je pas ziet als je goed kijkt.
// - een zwarte kat op een dak van een gildehuis aan de Markt (zwaait met haar staart, knippert met gele ogen)
// - een gouden kikker op een waterlelieblad in de Spiegelrei, vlak naast een brug (springt af en toe op)
// - Rat Remi die vist aan de binnenkant van de stadsmuur, vlak bij de Ezelpoort (zijn dobber gaat soms onder)
// Om de paar seconden glinstert er even een sterretje, zodat oplettende reizigers ze opmerken.
// Klikken geeft het id 'geheim:<id>' door aan de app (via stad.kiesbaar, zoals de gebouwen).
import * as THREE from '../../vendor/three.module.min.js';
import { Bouwer } from './modellen.js';
import { MARKT_HUIZEN, MUUR_R, WATER_Y } from './layout.js';

const TAU = Math.PI * 2;
const V3 = new THREE.Vector3();

/** Waar de geheimen zitten (wereldcoördinaten; y wordt voor de kat uit het dak berekend). */
export const GEHEIM_PLEK = {
  kat: { huis: 8 },                                                   // MARKT_HUIZEN[8]: het hoge gildehuis aan de westkant van de Markt
  kikker: { x: 13.1, z: -0.95 },                                       // in de Spiegelrei, net west van de brug (x = 15.8)
  rat: { a: 246.5 * Math.PI / 180 },                                  // aan de stadsmuur, net naast de Ezelpoort (240 graden)
};

export class Geheimen3D {
  constructor(stad) {
    this.stad = stad;
    this.lijst = [];
    this.glansMat = new THREE.SpriteMaterial({ map: stad.gloedTex, color: '#fff2b0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: true });
    this.hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitGeo = new THREE.SphereGeometry(1, 8, 6);
    this._kat(); this._kikker(); this._rat();
  }

  /** Groep met een id, een onzichtbare klikbol en een glinster. */
  _groep(id, hitR, glansY, periode, fase) {
    const g = new THREE.Group();
    const hit = new THREE.Mesh(this.hitGeo, this.hitMat); hit.scale.setScalar(hitR); hit.position.y = hitR * 0.6;
    g.add(hit);
    const glans = new THREE.Sprite(this.glansMat); glans.position.set(0, glansY, 0); glans.scale.setScalar(0.001); glans.renderOrder = 6;
    g.add(glans);
    g.userData.id = 'geheim:' + id;
    this.stad.scene.add(g);
    const e = { id, g, glans, periode, fase };
    this.lijst.push(e);
    return e;
  }
  _klaar(e) {
    e.g.traverse(o => { o.userData.id = 'geheim:' + e.id; if (o.isMesh && o.material !== this.hitMat) o.castShadow = true; });
    this.stad.kiesbaar = this.stad.kiesbaar || [];
    this.stad.kiesbaar.push(e.g);
  }

  // ---------- de kat ----------
  _kat() {
    const h = MARKT_HUIZEN[GEHEIM_PLEK.kat.huis];
    const e = this._groep('kat', 0.32, 0.42, 5.5, 0.3);
    // hoogte van het dak: één keer naar beneden schieten op de huizen van de Markt
    let y = 2.6, top = { x: h.x, z: h.z };
    const ray = new THREE.Raycaster(), doelen = this.stad.marktHuizen || [];
    if (doelen.length) {
      let best = -1;
      for (const d of [0, 0.15, -0.15]) {
        const lx = h.x + Math.sin(h.rot) * d, lz = h.z + Math.cos(h.rot) * d;
        ray.set(V3.set(lx, 20, lz), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObjects(doelen, false)[0];
        if (hit && hit.point.y > best) { best = hit.point.y; top = { x: lx, z: lz }; }
      }
      if (best > 0) y = best;
    }
    e.g.position.set(top.x, y - 0.03, top.z); e.g.rotation.y = h.rot + 0.5;
    const b = new Bouwer('kat'); b.ao = false;
    const zw = '#25222b', zw2 = '#33303a';
    b.ellips(0.085, 0.11, 0.1, 0, 0.1, -0.02, zw, 10);              // lijf (zittend)
    b.ellips(0.05, 0.035, 0.07, 0, 0.03, 0.04, zw2, 8);              // pootjes
    b.bol(0.068, 0, 0.245, 0.04, zw, 10);                             // kop
    for (const sx of [-1, 1]) b.kegel(0.028, 0.06, sx * 0.038, 0.29, 0.03, zw, 4);   // oren
    b.ellips(0.022, 0.016, 0.02, 0, 0.225, 0.1, '#3d3946', 6);        // snuitje
    b.bol(0.008, 0, 0.232, 0.118, '#e9578a', 5);
    // lijf en kop draaien samen (de kat kijkt af en toe opzij); de staart zwaait apart
    e.lijf = new THREE.Group(); e.g.add(e.lijf);
    const kop = new THREE.Mesh(b.bouw().body, new THREE.MeshLambertMaterial({ vertexColors: true }));
    e.lijf.add(kop);
    // ogen (lichten zacht op, ook 's nachts)
    const oogMat = new THREE.MeshBasicMaterial({ color: '#f5e04a' });
    e.ogen = [-1, 1].map(sx => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), oogMat); o.position.set(sx * 0.027, 0.255, 0.098); e.lijf.add(o); return o; });
    // staart: draait rond een scharnier achteraan
    const sb = new Bouwer('katstaart'); sb.ao = false;
    for (let i = 0; i < 6; i++) { const t = i / 5; sb.bol(0.022 - t * 0.006, Math.sin(t * 1.4) * 0.05, 0.02 + t * 0.2, -0.04 - Math.sin(t * 2.6) * 0.07, zw, 6); }
    e.staart = new THREE.Mesh(sb.bouw().body, kop.material);
    e.staart.position.set(0, 0.03, -0.1);
    e.g.add(e.staart);
    e.g.scale.setScalar(1.25);
    this._klaar(e);
    this.kat = e;
  }

  // ---------- de gouden kikker ----------
  _kikker() {
    const p = GEHEIM_PLEK.kikker;
    const e = this._groep('kikker', 0.3, 0.32, 4.6, 1.7);
    e.g.position.set(p.x, WATER_Y + 0.012, p.z);
    // het waterlelieblad (met een hapje eruit) en een bloempje
    const lb = new Bouwer('lelie'); lb.ao = false;
    lb.cil(0.24, 0.24, 0.02, 0, 0, 0, '#4f9a3c', 14).cil(0.13, 0.13, 0.021, 0.27, 0, 0.14, '#5aa846', 10);
    lb.ellips(0.05, 0.03, 0.05, 0.3, 0.03, 0.15, '#f7c6d8', 6).bol(0.02, 0.3, 0.05, 0.15, '#f2c94c', 5);
    e.g.add(new THREE.Mesh(lb.bouw().body, new THREE.MeshLambertMaterial({ vertexColors: true })));
    // de kikker zelf: goud dat een beetje glanst
    const kb = new Bouwer('kikker'); kb.ao = false;
    const gd = '#e8b630', gd2 = '#c9921c';
    kb.ellips(0.085, 0.055, 0.1, 0, 0.06, 0, gd, 10);
    kb.ellips(0.06, 0.045, 0.055, 0, 0.09, 0.07, gd, 10);
    for (const sx of [-1, 1]) {
      kb.bol(0.026, sx * 0.04, 0.13, 0.085, gd, 8).bol(0.012, sx * 0.045, 0.142, 0.1, '#2a2522', 5);
      kb.ellips(0.035, 0.02, 0.06, sx * 0.08, 0.03, -0.05, gd2, 6).ellips(0.02, 0.012, 0.04, sx * 0.07, 0.015, 0.09, gd2, 6);
    }
    kb.box(0.05, 0.006, 0.008, 0, 0.085, 0.12, '#8a5a1a');
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#5a3d00' });
    e.lijf = new THREE.Mesh(kb.bouw().body, mat);
    e.lijf.position.y = 0.015; e.lijf.rotation.y = Math.PI * 0.75;
    e.g.add(e.lijf);
    // een kringetje in het water als hij landt
    e.kring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    e.kring.position.y = 0.005; e.g.add(e.kring);
    e.g.scale.setScalar(1.2);
    this._klaar(e);
    this.kikker = e;
  }

  // ---------- Rat Remi ----------
  _rat() {
    const a = GEHEIM_PLEK.rat.a, r = MUUR_R - 0.38;
    const e = this._groep('rat', 0.3, 0.3, 6.2, 3.1);
    e.g.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
    e.g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));        // lokaal +z kijkt naar het midden (naar het water)
    const b = new Bouwer('rat'); b.ao = false;
    const gr = '#8d8794', gr2 = '#a59dab', roze = '#e7a0a6';
    b.ellips(0.075, 0.065, 0.1, 0, 0.065, 0, gr, 10);                 // lijf
    b.ellips(0.05, 0.045, 0.065, 0, 0.11, 0.08, gr2, 10);             // kop
    b.ellips(0.016, 0.014, 0.03, 0, 0.1, 0.145, gr2, 6).bol(0.012, 0, 0.105, 0.17, roze, 5);  // snuit
    for (const sx of [-1, 1]) { b.ellips(0.026, 0.028, 0.008, sx * 0.04, 0.16, 0.07, roze, 8); b.bol(0.008, sx * 0.022, 0.125, 0.125, '#1d1a20', 5); }
    b.cil(0.035, 0.04, 0.012, 0, 0.165, 0.08, '#c8403c', 8).cil(0.022, 0.024, 0.04, 0, 0.175, 0.08, '#c8403c', 8);   // rood hoedje
    b.cil(0.006, 0.008, 0.62, 0.05, 0.05, 0.05, '#6a4a30', 5, [1.0, 0, 0]);          // de hengel, schuin naar het water
    const lijf = new THREE.Mesh(b.bouw().body, new THREE.MeshLambertMaterial({ vertexColors: true }));
    e.g.add(lijf);
    // staart
    const sb = new Bouwer('ratstaart'); sb.ao = false;
    for (let i = 0; i < 7; i++) { const t = i / 6; sb.bol(0.01 - t * 0.004, Math.sin(t * 2) * 0.04, 0.02, -0.1 - t * 0.14, roze, 5); }
    e.staart = new THREE.Mesh(sb.bouw().body, lijf.material); e.g.add(e.staart);
    // het muizengat in de muur achter hem
    const gat = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12, 0, Math.PI), new THREE.MeshBasicMaterial({ color: '#1d1714' }));
    gat.position.set(0.16, 0.0, -0.15); e.g.add(gat);
    // lijn en dobber: de lijn hangt van de top van de hengel naar het water
    const tip = new THREE.Vector3(0.05, 0.05 + 0.62 * Math.cos(1.0), 0.05 + 0.62 * Math.sin(1.0));
    e.tip = tip;
    e.dobber = new THREE.Group();
    const db = new Bouwer('dobber'); db.ao = false; db.bol(0.028, 0, 0.02, 0, '#e8402c', 8).bol(0.02, 0, 0.045, 0, '#ffffff', 8).cil(0.004, 0.004, 0.04, 0, 0.06, 0, '#2a2522', 4);
    e.dobber.add(new THREE.Mesh(db.bouw().body, lijf.material));
    e.waterY = (WATER_Y - 0.02) / 1.3 - 0.01;                        // het water in lokale maat (de groep staat op y 0.02, schaal 1.3)
    e.dobber.position.set(tip.x, e.waterY, tip.z + 0.05);
    e.g.add(e.dobber);
    e.lijn = new THREE.Line(new THREE.BufferGeometry().setFromPoints([tip.clone(), e.dobber.position.clone()]), new THREE.LineBasicMaterial({ color: '#2a2522' }));
    e.g.add(e.lijn);
    e.kring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    e.kring.position.set(tip.x, e.waterY + 0.012, tip.z + 0.05); e.g.add(e.kring);
    e.g.scale.setScalar(1.3);
    this._klaar(e);
    this.rat = e;
  }

  /** Wereldpositie van een geheim (voor de camera en de tests). */
  positie(id) {
    const e = this.lijst.find(x => 'geheim:' + x.id === id || x.id === id);
    if (!e) return null;
    e.g.getWorldPosition(V3);
    return { x: V3.x, y: V3.y + 0.4, z: V3.z };
  }

  tick(dt, t) {
    for (const e of this.lijst) {
      // glinster: om de zoveel seconden even een sterretje
      const u = ((t + e.fase) % e.periode) / 0.7;
      const s = u < 1 ? Math.sin(u * Math.PI) * 0.55 : 0;
      e.glans.scale.setScalar(Math.max(0.001, s));
      e.glans.material.rotation = t * 2;
    }
    const k = this.kat;
    if (k) {
      k.staart.rotation.y = Math.sin(t * 1.8) * 0.5;
      k.staart.rotation.x = Math.sin(t * 0.9) * 0.12;
      const knip = (t % 3.7) < 0.12 ? 0.15 : 1;
      for (const o of k.ogen) o.scale.y = knip;
      k.lijf.rotation.y = (t % 7) > 5 ? Math.sin(((t % 7) - 5) / 2 * Math.PI) * 0.7 : 0;
    }
    const f = this.kikker;
    if (f) {
      const u = (t + 2.2) % 4.6, sprong = u < 0.5 ? Math.sin(u / 0.5 * Math.PI) : 0;
      f.lijf.position.y = 0.015 + sprong * 0.22;
      f.lijf.rotation.y = Math.PI * 0.75 + (u < 0.5 ? u / 0.5 * Math.PI : Math.PI);
      f.lijf.scale.set(1, 1 + sprong * 0.15, 1);
      const kr = u > 0.45 && u < 1.6 ? (u - 0.45) / 1.15 : -1;
      f.kring.material.opacity = kr >= 0 ? (1 - kr) * 0.6 : 0;
      f.kring.scale.setScalar(0.1 + Math.max(0, kr) * 0.45);
    }
    const r = this.rat;
    if (r) {
      r.staart.rotation.y = Math.sin(t * 2.4) * 0.35;
      const u = (t + 1.0) % 6.2, beet = u < 0.9 ? Math.sin(u / 0.9 * Math.PI * 3) * 0.035 + 0.02 : Math.sin(t * 2) * 0.006;
      r.dobber.position.y = r.waterY - beet;
      const pos = r.lijn.geometry.attributes.position; pos.setXYZ(1, r.dobber.position.x, r.dobber.position.y + 0.08, r.dobber.position.z); pos.needsUpdate = true;
      const kr = u < 1.4 ? u / 1.4 : -1;
      r.kring.material.opacity = kr >= 0 ? (1 - kr) * 0.55 : 0;
      r.kring.scale.setScalar(0.05 + Math.max(0, kr) * 0.18);
    }
    void dt; void TAU;
  }
}
