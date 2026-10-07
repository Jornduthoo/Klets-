// Kies de juiste stad: 3D met WebGL, anders de eenvoudige 2D-kaart. De app praat enkel met dit bestand.
import { Stad2D } from './stad2d.js';

export function heeftWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

/** Kwaliteit: 'auto' (standaard, zakt vanzelf naar 'laag' als het traag is), 'hoog' of 'laag'. */
export function bewaardeKwaliteit() {
  const qs = new URLSearchParams(location.search).get('kwaliteit');
  if (['auto', 'hoog', 'laag'].includes(qs)) return qs;
  try { return localStorage.getItem('klets:kwaliteit') || 'auto'; } catch { return 'auto'; }
}
export function bewaarKwaliteit(q) { try { localStorage.setItem('klets:kwaliteit', q); } catch { /* geen opslag */ } }

/**
 * Maak de stad in een container. opts: zie Stad3D. Geeft altijd een stad terug:
 * lukt WebGL niet (of ?webgl=0), dan de 2D-terugvalkaart.
 */
export async function maakStad(container, opts = {}) {
  const forceer2D = new URLSearchParams(location.search).get('webgl') === '0';
  if (!forceer2D && heeftWebGL()) {
    try {
      const { Stad3D } = await import('./stad3d.js');
      return new Stad3D(container, { kwaliteit: bewaardeKwaliteit(), ...opts });
    } catch (e) {
      console.warn('3D-stad lukt niet, terugval naar 2D:', e);
      container.querySelectorAll('canvas, .stad-markers').forEach(c => c.remove());
    }
  }
  return new Stad2D(container, opts);
}
