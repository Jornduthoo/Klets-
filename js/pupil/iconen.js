// Kleine lijn-iconen (SVG) voor de werkbalk van de stad. Geen externe bestanden.
const P = {
  missies: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M8.5 11.5l1.5 1.5 3-3M8.5 16.5h7"/>',
  adviseurs: '<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3 19c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5M13.5 15.2c.9-.5 1.9-.7 3-.7 2.2 0 3.8 1.4 4.5 4.5"/>',
  lagen: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  huis: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  kluis: '<rect x="4" y="5" width="16" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.2"/><path d="M12 9.3v-1M12 16.7v1M15.2 12.5h1M7.8 12.5h1M7 20v1.5M17 20v1.5"/>',
  stad: '<path d="M3 21h18"/><path d="M5 21V11h4v10M10 21V6h5v15M16 21v-8h3.5v8"/><path d="M12 9h1M12 12h1M12 15h1"/>',
  poort: '<path d="M4 21V9a8 8 0 0116 0v12"/><path d="M8 21v-9a4 4 0 018 0v9"/><path d="M2.5 21h19"/>',
  trein: '<rect x="5" y="3.5" width="14" height="14" rx="3"/><path d="M5 10.5h14M9 21l1.5-3.5M15 21l-1.5-3.5"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
  links: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v4.5h4.5"/>',
  rechts: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>',
  plus: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6M11 8v6"/>',
  min: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M8 11h6"/>',
  thuis: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  zon: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  maan: '<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/>',
  avond: '<path d="M3 18h18M6 14.5a6 6 0 0112 0"/><path d="M12 4.5V7M5 8l1.6 1.6M19 8l-1.6 1.6"/>',
  cyclus: '<path d="M12 3v2M12 19v2"/><path d="M12 7a5 5 0 100 10V7z" fill="currentColor"/><circle cx="12" cy="12" r="5"/>',
  kwaliteit: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  uit: '<path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  sluit: '<path d="M6 6l12 12M18 6L6 18"/>',
  doel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
};
export function icoon(naam, klasse = 'ico') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', klasse); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.9');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
  s.innerHTML = P[naam] || P.doel;
  return s;
}
