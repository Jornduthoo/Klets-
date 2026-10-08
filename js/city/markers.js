// Naamkaartjes en knoppen boven de stad (DOM-markers): ze mogen elkaar nooit bedekken.
// Elk beeld krijgt elke marker zijn schermpositie; botst hij met een marker die al geplaatst is (dichter bij de
// camera, dus lager op het scherm), dan schuift hij naar boven tot hij vrij staat. De verschuiving beweegt zacht mee.

/** Maat van een marker (breedte, hoogte en de marges die het ankerpunt bepalen), af en toe opnieuw gemeten. */
function maat(m, nu) {
  if (!m.maat || nu - m.maatT > 1500 || !m.maat.w) {
    const cs = getComputedStyle(m.el);
    // een naamkaartje kan breder zijn dan de marker zelf (het steekt aan beide kanten even ver uit)
    const w0 = m.el.offsetWidth, w = Math.max(w0, m.el.scrollWidth, ...[...m.el.children].map(c => c.offsetWidth));
    m.maat = { ml: (parseFloat(cs.marginLeft) || 0) - (w - w0) / 2, mt: parseFloat(cs.marginTop) || 0, w, h: m.el.offsetHeight };
    m.maatT = nu;
  }
  return m.maat;
}

/**
 * Plaats de markers. items: [{ m (de marker: { el, ... }), x, y }] in schermpixels (het ankerpunt).
 * De marker krijgt transform: translate(x, y + verschuiving).
 */
let vorige = 0;
export function plaatsMarkers(items) {
  const nu = performance.now(), marge = 3;
  // zacht meebewegen, even snel bij 60 als bij 5 beelden per seconde
  const a = 1 - Math.exp(-Math.min(500, nu - (vorige || nu - 16)) / 90); vorige = nu;
  items.sort((a, b) => b.y - a.y);
  const vak = [];
  for (const it of items) {
    const { ml, mt, w, h } = maat(it.m, nu);
    let dy = 0;
    for (let k = 0; k < 10; k++) {
      const x0 = it.x + ml, y0 = it.y + mt + dy;
      const bots = vak.find(v => x0 < v.x1 + marge && x0 + w > v.x0 - marge && y0 < v.y1 + marge && y0 + h > v.y0 - marge);
      if (!bots) break;
      dy = bots.y0 - marge - h - it.y - mt;
    }
    const m = it.m;
    m.dy = m.dy == null || Math.abs(m.dy - dy) > 160 ? dy : m.dy + (dy - m.dy) * a;
    vak.push({ x0: it.x + ml, y0: it.y + mt + dy, x1: it.x + ml + w, y1: it.y + mt + dy + h });
    m.el.style.transform = `translate(${it.x}px, ${it.y + m.dy}px)`;
  }
}
