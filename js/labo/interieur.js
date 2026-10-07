// Het binnenste van een themagebouw, als 2.5D-tekening: een kamer met werkbanken. Elke werkbank is een
// station van het labo (filmpje, echte weerdata, proefopstelling, test). Je klikt op een werkbank om ze
// te openen; afgewerkte banken krijgen een vinkje.
import { h } from '../core/util.js';
import { maakCanvas, Tekenaar, label } from './tekenen.js';

const BREED = 160, HOOG = 90;

/** Hoe elk gebouw er binnen uitziet (kleuren en wat er aan de muur hangt). */
export const KAMERS = {
  weerstation: { naam: 'Weerstation op het Belfort', muur: '#d9c9a8', vloer: '#a8845a', licht: '#fff3d6', decor: 'weer' },
  scheepswerf: { naam: 'Scheepswerf aan de haven', muur: '#b89a74', vloer: '#8a6a44', licht: '#ffe9c0', decor: 'werf' },
  waterlabo: { naam: 'Waterlabo bij het Minnewater', muur: '#cfe0e8', vloer: '#9fb8a8', licht: '#eafaff', decor: 'labo' },
  sluis: { naam: 'Controlekamer van de sluis', muur: '#cfd5de', vloer: '#8d96a4', licht: '#e4f1ff', decor: 'sluis' },
  vuurtoren: { naam: 'Lantaarnkamer van de vuurtoren', muur: '#e8e4da', vloer: '#b9a98c', licht: '#fff6d0', decor: 'toren' },
  werkplaats: { naam: 'Werkplaats op de Markt', muur: '#c9b89a', vloer: '#a8743f', licht: '#ffeccf', decor: 'werkplaats' },
};
const STATION_NAAM = { filmpje: 'Filmpje', weerdata: 'Echte weerdata', simulatie: 'Proefopstelling', test: 'Check (test)' };

/**
 * Tekening van een kamer met werkbanken.
 * opts: { interieur, stations: [{ id, klaar }], onKies(id) }
 */
export function maakInterieur({ interieur = 'waterlabo', stations = [], onKies } = {}) {
  const kamer = KAMERS[interieur] || KAMERS.waterlabo;
  const canvas = maakCanvas(760, 'labo-canvas kamer');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${kamer.naam}, met ${stations.length} werkbanken`);
  const tk = new Tekenaar(canvas);
  const banken = stations.map((s, i) => ({
    ...s, x: 26 + i * (108 / Math.max(1, stations.length - 1 || 1)) * (stations.length > 1 ? 1 : 0) + (stations.length === 1 ? 54 : 0),
    y: 58 + (i % 2) * 8, naam: STATION_NAAM[s.id] || s.id,
  }));
  let over = null, raf = 0, t = 0;

  canvas.addEventListener('pointermove', (e) => { const p = tk.punt(e); over = banken.find(b => Math.abs(b.x - p.x) < 15 && Math.abs(b.y - p.y) < 12) || null; canvas.style.cursor = over ? 'pointer' : 'default'; });
  canvas.addEventListener('pointerleave', () => { over = null; });
  canvas.addEventListener('pointerdown', (e) => { const p = tk.punt(e); const b = banken.find(b => Math.abs(b.x - p.x) < 15 && Math.abs(b.y - p.y) < 12); if (b) onKies?.(b.id); });

  function teken() {
    const g = tk.begin();
    // muur en vloer
    g.fillStyle = kamer.muur; g.fillRect(0, 0, BREED, 56);
    g.fillStyle = kamer.vloer; g.beginPath(); g.moveTo(0, 56); g.lineTo(BREED, 56); g.lineTo(BREED, HOOG); g.lineTo(0, HOOG); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 0.4;
    for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(i * 16, 56); g.lineTo(i * 16 * 1.25 - 20, HOOG); g.stroke(); }
    // raam met licht
    g.fillStyle = kamer.licht; g.beginPath(); g.roundRect(10, 10, 34, 26, 2); g.fill();
    g.strokeStyle = '#6d7684'; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.moveTo(27, 10); g.lineTo(27, 36); g.moveTo(10, 23); g.lineTo(44, 23); g.stroke();
    // decor aan de muur per gebouw
    tekenDecor(g, kamer.decor, t);
    // werkbanken
    for (const b of banken) {
      const hoog = over === b ? 1.08 : 1;
      g.save(); g.translate(b.x, b.y); g.scale(hoog, hoog);
      g.fillStyle = '#8a6a44'; g.beginPath(); g.roundRect(-13, -2, 26, 10, 1.4); g.fill();
      g.fillStyle = '#b9834f'; g.beginPath(); g.roundRect(-14, -5, 28, 4, 1.2); g.fill();
      g.fillStyle = b.klaar ? '#38b37a' : '#f2c94c';
      g.beginPath(); g.arc(0, -9, 3.4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#243049'; g.font = '3.4px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(b.klaar ? 'v' : '!', 0, -9);
      g.restore();
      label(g, { x: b.x, y: b.y + 13, tekst: b.naam });
    }
    label(g, { x: 80, y: 5, tekst: kamer.naam, groot: 1 });
  }
  function tekenDecor(g, soort, tt) {
    if (soort === 'weer') {
      g.strokeStyle = '#6d7684'; g.lineWidth = 0.8;
      g.beginPath(); g.arc(120, 22, 11, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#e2643e'; g.save(); g.translate(120, 22); g.rotate(tt * 0.4); g.fillRect(-1, -9, 2, 9); g.restore();
      label(g, { x: 120, y: 38, tekst: 'barometer' });
      g.fillStyle = '#cfd5e0'; g.fillRect(70, 14, 4, 26); g.fillStyle = '#e2643e'; g.fillRect(70.6, 30, 2.8, 10);
      label(g, { x: 72, y: 46, tekst: 'thermometer' });
    } else if (soort === 'werf') {
      g.strokeStyle = '#7a5436'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(96, 8); g.lineTo(96, 34); g.lineTo(130, 34); g.stroke();
      g.fillStyle = '#8fa8c0'; g.beginPath(); g.moveTo(104, 34); g.lineTo(126, 34); g.lineTo(120, 42); g.lineTo(110, 42); g.closePath(); g.fill();
      label(g, { x: 115, y: 48, tekst: 'bootje in de bouw' });
    } else if (soort === 'labo') {
      for (let i = 0; i < 3; i++) { g.fillStyle = '#7cc7ea'; g.fillRect(100 + i * 12, 24, 7, 14); g.strokeStyle = '#cfe4ef'; g.lineWidth = 0.6; g.strokeRect(100 + i * 12, 20, 7, 18); }
      label(g, { x: 112, y: 46, tekst: 'stalen uit het Minnewater' });
    } else if (soort === 'sluis') {
      g.fillStyle = '#17202f'; g.beginPath(); g.roundRect(92, 12, 50, 28, 2); g.fill();
      g.fillStyle = '#5fe0a8'; for (let i = 0; i < 6; i++) g.fillRect(96, 16 + i * 4, 10 + ((Math.sin(tt + i) + 1) * 14), 2);
      label(g, { x: 117, y: 46, tekst: 'bedieningsscherm' });
    } else if (soort === 'toren') {
      g.fillStyle = `rgba(255,243,196,${0.35 + Math.sin(tt * 1.5) * 0.3})`;
      g.beginPath(); g.moveTo(110, 24); g.lineTo(160, 10); g.lineTo(160, 40); g.closePath(); g.fill();
      g.fillStyle = '#e8e4da'; g.beginPath(); g.arc(110, 24, 6, 0, Math.PI * 2); g.fill();
      label(g, { x: 112, y: 42, tekst: 'de lantaarn' });
    } else {
      g.fillStyle = '#9a6a44'; g.fillRect(96, 14, 48, 4);
      for (let i = 0; i < 5; i++) { g.fillStyle = ['#9aa0aa', '#f2c94c', '#e2643e', '#4a5162', '#38b37a'][i]; g.fillRect(100 + i * 9, 18, 3, 8); }
      label(g, { x: 120, y: 30, tekst: 'gereedschapsrek' });
    }
  }
  function lus() { raf = requestAnimationFrame(lus); t += 1 / 60; teken(); }
  raf = requestAnimationFrame(lus);

  // ook een lijst met knoppen, zodat alles met het toetsenbord werkt
  const knoppen = h('div', { class: 'bank-knoppen' }, ...banken.map(b =>
    h('button', { type: 'button', class: 'btn' + (b.klaar ? ' klaar' : ' primair'), onclick: () => onKies?.(b.id) }, (b.klaar ? 'Opnieuw: ' : '') + b.naam)));

  return {
    el: h('div', { class: 'interieur' }, canvas, knoppen),
    stop() { cancelAnimationFrame(raf); },
    zetKlaar(id, klaar = true) { const b = banken.find(b => b.id === id); if (b) b.klaar = klaar; knoppen.innerHTML = ''; knoppen.append(...banken.map(b => h('button', { type: 'button', class: 'btn' + (b.klaar ? ' klaar' : ' primair'), onclick: () => onKies?.(b.id) }, (b.klaar ? 'Opnieuw: ' : '') + b.naam))); },
  };
}
