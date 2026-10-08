// Thema 1: Waterwereld. De stad heet Zwinvliet: een Venetië van het Noorden met reien, bruggen, kaaien,
// het Minnewater, een haven met de sluis van Zeebrugge en het Belfort op de Markt.
//
// =====================================================================================================
//  OPBOUW VAN EEN THEMABESTAND (zie ook README, "Het themaformaat")
// =====================================================================================================
//  id, nr, naam, stad          naam van het thema en van zijn stad
//  verhaal { intro, eind }     het verhaal bij de start en na de eindbaas
//  weken[]                     { week, titel, verhaal }  (vijf weken)
//  doelen{}                    doelcode -> { domein, route: 'kompas'|'telescoop', doel }
//  gebouwen{}                  themagebouwen die je kan binnengaan: { naam, plek, gids, week, labos[], interieur, uitleg }
//                              plek = een vaste plek in de stad (zie js/city/layout.js, PLEKKEN)
//  labos{}                     per labo: { naam, gebouw, week, dag, gids, domein, uitleg, herstel, beloning,
//                                           stations[], filmpje, simulatie, test }
//      stations[]              werkbanken in het gebouw: 'filmpje' | 'simulatie' | 'test' | 'weerdata'
//      filmpje                 { titel, scenes: [{ duur, tekst, gids, zegt, beeld: [element, ...] }] }
//                              een element: { t: soort, ...eigenschappen, anim: { eigenschap: [van, naar] } }
//                              soorten: lucht zee land berg zon maan wolk regen sneeuw damp rivier pijl label
//                              boot sluis aarde getij vis kikker eend zwaan reiger slak watervlo alg plant
//                              glas voorwerp thermometer skyline belfort slijk gids bord water filter druppel
//      simulatie               { type, opdrachten: { kompas: [...], telescoop: [...] } }  (type = naam van de simulatie)
//                              een opdracht: { id, tekst, doelen: [codes], ...instellingen van de simulatie }
//      test                    { kompas: [items], telescoop: [items] }  (oefentypes uit js/missions/types.js)
//      herstel                 { zone, tekst }  welk stuk water of welke machine weer werkt als de klas het labo haalt
//      beloning                { uitrusting }  wat je reiziger mag dragen na het labo
//  missies[]                   gewone missies van de week (oefenreeksen per route), aangeboden door een gids
//  eindbaas                    { id, naam, week, dag, verhaal, raid: { vragen }, test }
//  uitrusting{}                themakledij: id -> { naam, slot, uitleg }
//  codes{}                     geheime codes uit het Logboek: CODE -> { week, beloning, waar }
//
//  De doelen, weekverhalen, geheime codes en de wekelijkse check (Stadsmissie) komen uit de lesbestanden van de
//  handleiding: data/waterwereld-inhoud.js (gemaakt door tools/afleiden_waterwereld.py). De filmpjes, simulaties
//  en labovragen hieronder zijn voor de webapp geschreven en gebruiken dezelfde doelcodes.
// =====================================================================================================

import { DOELEN_WW, WEKEN_WW, CODES_WW, TOETS_WW } from './waterwereld-inhoud.js';

const kz = (id, vraag, opties, juist, goals, x = {}) => ({ id, type: 'keuze', vraag, opties, juist, goals, ...x });
const nr = (id, vraag, antwoord, goals, x = {}) => ({ id, type: 'getal', vraag, antwoord, goals, ...x });
const ty = (id, vraag, antwoorden, goals, x = {}) => ({ id, type: 'typ', vraag, antwoorden, goals, ...x });
const vo = (id, vraag, items, goals, x = {}) => ({ id, type: 'volgorde', vraag, items, goals, ...x });
const ko = (id, vraag, paren, goals, x = {}) => ({ id, type: 'koppel', vraag, paren, goals, ...x });
const so = (id, vraag, bakken, kaarten, goals, x = {}) => ({ id, type: 'sorteer', vraag, bakken, kaarten: kaarten.map(([t, bak]) => ({ t, bak })), goals, ...x });

// ---------- doelen: korte namen voor de echte doelcodes uit de lesbestanden ----------
const D = {
  we1: '4.2.GL4.1', we1t: '4.2.GL4.1',            // waterkringloop
  ak1: '4.3.GL4.12', ak1t: '4.2.GL5.16',          // weer meten en beschrijven
  wind: '4.2.GL4.14', neerslag: '4.3.GL4.11', oceaan: '4.1.GL4.1',
  we2: '3.5.+L4.1', we2t: '3.4.GL6.3', we2m: '3.4.GL6.1', olie: '3.5.+L5.5', opw: '3.5.+L4.2', opl: '3.4.GL4.1',
  oz1: '3.7.GL4.4', oz1e: '3.7.GL4.5', oz1t: '3.7.GL6.1',
  we3: '3.2.GL4.7', we3r: '3.2.GL4.6', we3b: '3.2.GL4.5', we3t: '3.2.GL5.7', we3k: '3.2.GL5.3', bio: '3.2.GL6.1',
  te1: '8.1.GL4.6', te1t: '8.1.GL5.4', infra: '4.2.GL4.8',
  we4: '4.2.GL6.20', we4t: '4.2.GL6.22', ak3: '4.2.GL6.20', ak3t: '4.2.GL6.22', maan: '4.2.GL5.22',
  rivier: '4.2.GL4.5',
  te2: '3.6.GL6.4', te2t: '3.6.GL6.4', se2: '3.2.GL6.5', se2t: '3.2.GL6.6', bact: '3.1.GL6.2',
  ge1: '5.1.GL5.8', ge1t: '5.1.GL5.9', ge2: '5.1.GL5.8', ge2t: '5.1.GL5.9',
  ak2: '4.2.GL4.8', ak2t: '4.3.GL6.7',
  se1: '9-3.3.GL4.10', se1t: '9-3.2.GL6.6', te3: '3.5.+L4.2', te3t: '3.5.GL5.9',
};
const DOELEN = DOELEN_WW;
for (const c of Object.values(D)) if (!DOELEN[c]) console.warn('Waterwereld: onbekende doelcode', c);

// ---------- filmpjes (storyboards, PLAATSHOUDERS) ----------
const FILM_KRINGLOOP = {
  titel: 'De reis van een waterdruppel',
  scenes: [
    { duur: 7, gids: 'tella', zegt: 'Dit is Drup, een waterdruppel uit de Noordzee. Volg hem op zijn reis!', tekst: 'Alle water op aarde is altijd onderweg. Dat heet de waterkringloop.',
      beeld: [{ t: 'lucht' }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'zon', x: 24, y: 18, r: 9 }, { t: 'druppel', x: 50, y: 66, s: 1.6, anim: { y: [66, 64] } }, { t: 'label', x: 50, y: 78, tekst: 'Drup' }] },
    { duur: 8, gids: 'tella', zegt: 'De zon warmt de zee op. Drup wordt waterdamp en stijgt op.', tekst: 'Verdampen: warm water wordt onzichtbare waterdamp die opstijgt.',
      beeld: [{ t: 'lucht' }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'zon', x: 24, y: 18, r: 11, anim: { r: [9, 12] } }, { t: 'damp', x: 40, y: 60, h: 28, n: 5 }, { t: 'druppel', x: 50, y: 64, s: 1.3, anim: { y: [64, 30], alpha: [1, 0.3] } }, { t: 'label', x: 66, y: 46, tekst: 'verdampen' }] },
    { duur: 8, gids: 'tella', zegt: 'Hoog in de lucht is het koud. De damp wordt weer kleine druppeltjes: er ontstaat een wolk.', tekst: 'Condenseren: in de koude lucht wordt waterdamp weer water. Zo ontstaan wolken.',
      beeld: [{ t: 'lucht' }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'zon', x: 24, y: 18, r: 10 }, { t: 'wolk', x: 60, y: 22, s: 1.0, anim: { s: [0.5, 1.2] } }, { t: 'thermometer', x: 142, y: 20, waarde: 0.2 }, { t: 'label', x: 60, y: 36, tekst: 'condenseren' }] },
    { duur: 8, gids: 'tella', zegt: 'De wind blaast de wolk over het land. Ze wordt zwaar en grijs ...', tekst: 'De wind brengt de wolken landinwaarts. Als de druppels te zwaar worden, vallen ze.',
      beeld: [{ t: 'lucht' }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'wolk', x: 60, y: 22, s: 1.2, kleur: '#9aa3b8', anim: { x: [60, 124] } }, { t: 'pijl', van: [70, 12], naar: [110, 12], tekst: 'wind' }] },
    { duur: 8, gids: 'tella', zegt: 'Plets! Drup valt als regen op het land.', tekst: 'Neerslag: regen, sneeuw of hagel valt uit de wolken.',
      beeld: [{ t: 'lucht', donker: 0.4 }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'wolk', x: 126, y: 20, s: 1.3, kleur: '#7f879b' }, { t: 'regen', x: 112, y: 28, b: 30, h: 26, n: 40 }, { t: 'label', x: 126, y: 8, tekst: 'neerslag' }] },
    { duur: 8, gids: 'tella', zegt: 'Via beken, de reien en de rivier stroomt Drup terug naar de zee. En dan begint alles opnieuw!', tekst: 'Afstromen: het water stroomt via beken en rivieren terug naar de zee.',
      beeld: [{ t: 'lucht' }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'rivier', punten: [[150, 56], [130, 62], [112, 66], [96, 68]], b: 3 }, { t: 'druppel', x: 150, y: 56, s: 1.2, anim: { x: [150, 90], y: [56, 68] } }, { t: 'zon', x: 24, y: 18, r: 9 }, { t: 'label', x: 126, y: 76, tekst: 'afstromen' }] },
    { duur: 8, gids: 'tella', zegt: 'Probeer het nu zelf in de proefopstelling: jij bent de baas over de zon!', tekst: 'Verdampen, condenseren, neerslag, afstromen: de kringloop is rond.',
      beeld: [{ t: 'lucht' }, { t: 'zee', y: 62 }, { t: 'land', punten: [[96, 90], [96, 64], [120, 60], [160, 52], [160, 90]] }, { t: 'zon', x: 24, y: 18, r: 9 }, { t: 'wolk', x: 100, y: 20, s: 1 }, { t: 'pijl', van: [44, 56], naar: [62, 30], tekst: '1' }, { t: 'pijl', van: [74, 18], naar: [96, 18], tekst: '2' }, { t: 'pijl', van: [112, 28], naar: [124, 50], tekst: '3' }, { t: 'pijl', van: [118, 66], naar: [98, 68], tekst: '4' }] },
  ],
};
const FILM_DRIJVEN = {
  titel: 'Waarom drijft een schip van ijzer?',
  scenes: [
    { duur: 7, gids: 'woordje', zegt: 'Ahoi! Op de scheepswerf bouwen we boten. Maar waarom zinkt een ijzeren schip niet?', tekst: 'Sommige dingen drijven, andere zinken. Hoe komt dat?',
      beeld: [{ t: 'lucht' }, { t: 'water', x: 0, y: 56, b: 160, h: 34 }, { t: 'boot', x: 80, y: 56, s: 1.6, soort: 'vracht' }, { t: 'skyline', y: 56 }] },
    { duur: 8, gids: 'woordje', zegt: 'Een spijker zinkt meteen. Een stuk hout blijft drijven.', tekst: 'Een kleine ijzeren spijker zinkt. Een groot stuk hout drijft.',
      beeld: [{ t: 'glas', x: 50, y: 48, vloeistof: 'water' }, { t: 'glas', x: 110, y: 48, vloeistof: 'water' }, { t: 'voorwerp', x: 50, y: 30, soort: 'spijker', anim: { y: [30, 70] } }, { t: 'voorwerp', x: 110, y: 30, soort: 'hout', anim: { y: [30, 47] } }] },
    { duur: 9, gids: 'woordje', zegt: 'Het gaat niet om hoe zwaar iets is, maar om hoe zwaar het is voor zijn grootte.', tekst: 'Massadichtheid: hoeveel massa zit er in een bepaald volume? Water: 1 gram per kubieke centimeter.',
      beeld: [{ t: 'bord', x: 80, y: 40, b: 120, h: 50, tekst: 'massadichtheid = massa : volume' }, { t: 'voorwerp', x: 40, y: 58, soort: 'steen' }, { t: 'voorwerp', x: 120, y: 58, soort: 'kurk' }] },
    { duur: 8, gids: 'woordje', zegt: 'Een schip is hol. Vanbinnen zit veel lucht. Daardoor is het hele schip lichter dan het water dat het wegduwt.', tekst: 'Een holle vorm duwt veel water opzij. Het water duwt terug: de opwaartse kracht.',
      beeld: [{ t: 'lucht' }, { t: 'water', x: 0, y: 56, b: 160, h: 34 }, { t: 'boot', x: 80, y: 56, s: 2.2, soort: 'vracht' }, { t: 'pijl', van: [80, 84], naar: [80, 62], tekst: 'opwaartse kracht' }] },
    { duur: 8, gids: 'woordje', zegt: 'Een ei zinkt in gewoon water, maar drijft in zout water. Zout water is zwaarder!', tekst: 'Zout water heeft een grotere massadichtheid dan zoet water. Daarom drijf je makkelijker in de zee.',
      beeld: [{ t: 'glas', x: 50, y: 48, vloeistof: 'water' }, { t: 'glas', x: 110, y: 48, vloeistof: 'zout' }, { t: 'voorwerp', x: 50, y: 30, soort: 'ei', anim: { y: [30, 70] } }, { t: 'voorwerp', x: 110, y: 30, soort: 'ei', anim: { y: [30, 50] } }, { t: 'label', x: 50, y: 84, tekst: 'zoet water' }, { t: 'label', x: 110, y: 84, tekst: 'zout water' }] },
    { duur: 7, gids: 'woordje', zegt: 'Nu jij! Voorspel eerst, test daarna. Een echte onderzoeker!', tekst: 'Voorspel, test en kijk of je gelijk had.',
      beeld: [{ t: 'glas', x: 36, y: 48, vloeistof: 'water' }, { t: 'glas', x: 80, y: 48, vloeistof: 'olie' }, { t: 'glas', x: 124, y: 48, vloeistof: 'zout' }] },
  ],
};
const FILM_SLUIS = {
  titel: 'Zo werkt een sluis',
  scenes: [
    { duur: 7, gids: 'byte', zegt: 'Biep! De zee en het kanaal zijn niet even hoog. Hoe krijgen we een boot erdoor?', tekst: 'Aan de kust is het water van de zee soms hoger of lager dan het water in het kanaal.',
      beeld: [{ t: 'lucht' }, { t: 'sluis', x: 80, y: 60, s: 1.4, binnen: 0.2, deurL: 0, deurR: 0, zee: 0.2, kanaal: 0.8 }, { t: 'label', x: 30, y: 84, tekst: 'zee' }, { t: 'label', x: 130, y: 84, tekst: 'kanaal' }] },
    { duur: 8, gids: 'byte', zegt: 'Stap 1: de deur aan de kant van de boot gaat open. De boot vaart de kolk in.', tekst: 'De kolk is de bak tussen de twee sluisdeuren.',
      beeld: [{ t: 'lucht' }, { t: 'sluis', x: 80, y: 60, s: 1.4, binnen: 0.2, deurL: 1, deurR: 0, zee: 0.2, kanaal: 0.8, boot: 0, anim: { boot: [0, 0.5] } }] },
    { duur: 8, gids: 'byte', zegt: 'Stap 2: de deur gaat dicht. Dan laten we water in de kolk lopen.', tekst: 'Het water in de kolk stijgt tot het even hoog staat als het kanaal.',
      beeld: [{ t: 'lucht' }, { t: 'sluis', x: 80, y: 60, s: 1.4, binnen: 0.2, deurL: 0, deurR: 0, zee: 0.2, kanaal: 0.8, boot: 0.5, anim: { binnen: [0.2, 0.8] } }] },
    { duur: 8, gids: 'byte', zegt: 'Stap 3: nu is het water even hoog. De andere deur mag open en de boot vaart verder.', tekst: 'Een sluisdeur gaat alleen open als het water aan beide kanten even hoog staat.',
      beeld: [{ t: 'lucht' }, { t: 'sluis', x: 80, y: 60, s: 1.4, binnen: 0.8, deurL: 0, deurR: 1, zee: 0.2, kanaal: 0.8, boot: 0.5, anim: { boot: [0.5, 1] } }] },
    { duur: 8, gids: 'byte', zegt: 'Een vaste volgorde van stappen noemen we een algoritme. Programmeer jij de sluis?', tekst: 'Een algoritme is een reeks stappen in de juiste volgorde. Klopt een stap niet? Zoek de fout: debuggen.',
      beeld: [{ t: 'bord', x: 80, y: 44, b: 120, h: 60, tekst: '1 open deur zee  2 vaar in  3 sluit deur  4 vul kolk  5 open deur kanaal  6 vaar uit' }] },
  ],
};
const FILM_GETIJ = {
  titel: 'Eb en vloed: de maan trekt aan de zee',
  scenes: [
    { duur: 7, gids: 'kroniek', zegt: 'Oehoe. Kijk naar het strand. Soms is de zee ver weg, soms komt ze tot aan de dijk.', tekst: 'Twee keer per dag komt de zee op (vloed) en gaat ze terug (eb).',
      beeld: [{ t: 'lucht' }, { t: 'land', punten: [[0, 90], [0, 60], [160, 70], [160, 90]], kleur: '#e8d5a3' }, { t: 'water', x: 0, y: 66, b: 160, h: 24, anim: { y: [74, 62] } }, { t: 'skyline', y: 60, klein: true }] },
    { duur: 8, gids: 'kroniek', zegt: 'De maan trekt aan alles op aarde, ook aan het water. Aan de kant van de maan bolt het water op.', tekst: 'De aantrekkingskracht van de maan trekt het water van de zee een beetje naar zich toe.',
      beeld: [{ t: 'lucht', nacht: 1 }, { t: 'aarde', x: 70, y: 45, r: 18 }, { t: 'getij', x: 70, y: 45, r: 18, hoek: 0 }, { t: 'maan', x: 138, y: 45, r: 6 }, { t: 'pijl', van: [128, 45], naar: [96, 45], tekst: 'aantrekking' }] },
    { duur: 8, gids: 'kroniek', zegt: 'Ook aan de andere kant is er een bult water. Zo zijn er altijd twee keer hoogwater.', tekst: 'Er zijn twee bulten water: aan de kant van de maan en aan de overkant.',
      beeld: [{ t: 'lucht', nacht: 1 }, { t: 'aarde', x: 70, y: 45, r: 18, anim: { draai: [0, 3] } }, { t: 'getij', x: 70, y: 45, r: 18, hoek: 0 }, { t: 'maan', x: 138, y: 45, r: 6 }] },
    { duur: 8, gids: 'kroniek', zegt: 'De aarde draait één keer per dag rond. Zeebrugge draait door de twee bulten: twee keer vloed, twee keer eb.', tekst: 'Tussen twee keer hoogwater zit ongeveer 12 uur en 25 minuten.',
      beeld: [{ t: 'lucht', nacht: 1 }, { t: 'aarde', x: 70, y: 45, r: 18, stip: true, anim: { draai: [0, 6.28] } }, { t: 'getij', x: 70, y: 45, r: 18, hoek: 0 }, { t: 'maan', x: 138, y: 45, r: 6 }] },
    { duur: 8, gids: 'kroniek', zegt: 'Staan zon en maan op één lijn? Dan trekken ze samen: springtij. Staan ze haaks? Dan is het doodtij.', tekst: 'Springtij: extra hoog en extra laag water. Doodtij: kleine verschillen.',
      beeld: [{ t: 'lucht', nacht: 1 }, { t: 'zon', x: 14, y: 45, r: 9 }, { t: 'aarde', x: 76, y: 45, r: 16 }, { t: 'getij', x: 76, y: 45, r: 16, hoek: 0, sterk: 1.6 }, { t: 'maan', x: 138, y: 45, r: 6 }, { t: 'label', x: 76, y: 76, tekst: 'springtij' }] },
  ],
};
const FILM_VOEDSELWEB = {
  titel: 'Wie eet wie in het Minnewater?',
  scenes: [
    { duur: 7, gids: 'atlas', zegt: 'Ik ben onder water geweest met mijn duikbril. Het Minnewater zit vol leven ... als het proper is.', tekst: 'In het water wonen planten, kleine diertjes, vissen en vogels samen.',
      beeld: [{ t: 'water', x: 0, y: 20, b: 160, h: 70 }, { t: 'plant', x: 20, y: 86, s: 1.2 }, { t: 'plant', x: 140, y: 86, s: 1 }, { t: 'vis', x: 60, y: 50, s: 1, anim: { x: [40, 100] } }, { t: 'zwaan', x: 120, y: 20, s: 1 }] },
    { duur: 8, gids: 'atlas', zegt: 'Alles begint bij de zon. Planten en algen maken zelf voedsel met zonlicht.', tekst: 'Planten en algen zijn producenten: ze maken voedsel met het licht van de zon.',
      beeld: [{ t: 'lucht' }, { t: 'zon', x: 20, y: 14, r: 8 }, { t: 'water', x: 0, y: 30, b: 160, h: 60 }, { t: 'alg', x: 70, y: 40, s: 1.4 }, { t: 'plant', x: 110, y: 86, s: 1.4 }, { t: 'pijl', van: [28, 20], naar: [64, 38] }] },
    { duur: 8, gids: 'atlas', zegt: 'Watervlooien eten algen. Kleine visjes eten watervlooien. Een reiger eet de vis.', tekst: 'Een voedselketen: alg, watervlo, vis, reiger. De pijl wijst naar wie eet.',
      beeld: [{ t: 'alg', x: 22, y: 60, s: 1.2 }, { t: 'watervlo', x: 60, y: 60, s: 1.2 }, { t: 'vis', x: 100, y: 60, s: 1 }, { t: 'reiger', x: 140, y: 52, s: 1 }, { t: 'pijl', van: [30, 60], naar: [52, 60] }, { t: 'pijl', van: [68, 60], naar: [90, 60] }, { t: 'pijl', van: [110, 60], naar: [130, 58] }] },
    { duur: 8, gids: 'atlas', zegt: 'Maar dieren eten meer dan één soort. Zo krijg je geen ketting, maar een web!', tekst: 'Veel voedselketens samen vormen een voedselweb.',
      beeld: [{ t: 'alg', x: 20, y: 70, s: 1 }, { t: 'plant', x: 30, y: 88, s: 0.9 }, { t: 'watervlo', x: 56, y: 72, s: 1 }, { t: 'slak', x: 58, y: 86, s: 1 }, { t: 'vis', x: 96, y: 66, s: 1 }, { t: 'kikker', x: 100, y: 84, s: 1 }, { t: 'reiger', x: 140, y: 52, s: 1 }, { t: 'eend', x: 136, y: 80, s: 1 }, { t: 'pijl', van: [26, 70], naar: [48, 72] }, { t: 'pijl', van: [36, 86], naar: [50, 86] }, { t: 'pijl', van: [64, 72], naar: [88, 68] }, { t: 'pijl', van: [104, 66], naar: [130, 56] }, { t: 'pijl', van: [108, 84], naar: [130, 60] }, { t: 'pijl', van: [64, 86], naar: [128, 82] }] },
    { duur: 8, gids: 'atlas', zegt: 'De Slijkkraak smoort de algen en planten. Wat gebeurt er dan met de rest? Bouw het web en ontdek het!', tekst: 'Valt één schakel weg, dan krijgen alle dieren die ervan eten het moeilijk.',
      beeld: [{ t: 'water', x: 0, y: 20, b: 160, h: 70, vuil: 1 }, { t: 'slijk', x: 80, y: 52, s: 1.2 }] },
  ],
};
const FILM_FILTER = {
  titel: 'Van modderwater naar helder water',
  scenes: [
    { duur: 7, gids: 'bram', zegt: 'Op kamp heb ik vaak dorst. Maar dit modderwater uit de reie drink ik niet zomaar!', tekst: 'Vuil water kan je ziek maken. Een filter haalt er vuil uit.',
      beeld: [{ t: 'glas', x: 80, y: 46, vloeistof: 'modder' }] },
    { duur: 8, gids: 'bram', zegt: 'Grind houdt de grote brokken tegen. Zand de kleinere korreltjes.', tekst: 'Een filter bestaat uit lagen: van grof naar fijn.',
      beeld: [{ t: 'filter', x: 80, y: 46, lagen: ['grind', 'zand'] }, { t: 'label', x: 120, y: 30, tekst: 'grind: grote brokken' }, { t: 'label', x: 120, y: 50, tekst: 'zand: kleine korrels' }] },
    { duur: 8, gids: 'bram', zegt: 'Houtskool vangt geurtjes en kleurtjes. En een doek houdt het laatste fijne stof tegen.', tekst: 'Houtskool en een doek maken het water nog helderder.',
      beeld: [{ t: 'filter', x: 80, y: 46, lagen: ['grind', 'zand', 'houtskool', 'doek'] }] },
    { duur: 8, gids: 'bram', zegt: 'Let op: helder water is nog niet altijd veilig. Echt drinkwater wordt ook gezuiverd van bacterien. Samen zorgen we voor proper water!', tekst: 'Een zelfgemaakte filter maakt water helderder, maar niet drinkbaar. Gebruik zuinig water: elke druppel telt.',
      beeld: [{ t: 'glas', x: 50, y: 46, vloeistof: 'modder' }, { t: 'pijl', van: [66, 46], naar: [94, 46] }, { t: 'glas', x: 110, y: 46, vloeistof: 'water' }] },
  ],
};

// ---------- labo's ----------
const LABOS = {
  waterkringloop: {
    naam: 'De waterkringloop', gebouw: 'weerstation', week: 1, dag: 'dinsdag', gids: 'tella', domein: 'Wetenschap',
    uitleg: 'Bekijk het filmpje, lees het echte weer van Brugge af, speel met de zon in de proefopstelling en doe de test.',
    herstel: { zone: 'reie-zuid', tekst: 'Het water aan de Rozenhoedkaai wordt helder en de windvaan op het Belfort draait mee met de echte wind.' },
    beloning: { uitrusting: 'zuidwester' },
    stations: ['filmpje', 'weerdata', 'simulatie', 'test'],
    filmpje: FILM_KRINGLOOP,
    simulatie: {
      type: 'waterkringloop',
      opdrachten: {
        kompas: [
          { id: 'wk-k1', tekst: 'Maak de zon warm genoeg zodat het zeewater verdampt.', doelen: [D.we1], doelwit: 'damp' },
          { id: 'wk-k2', tekst: 'Laat een wolk ontstaan boven de zee.', doelen: [D.we1], doelwit: 'wolk' },
          { id: 'wk-k3', tekst: 'Laat het regenen boven het land.', doelen: [D.we1], doelwit: 'regen' },
          { id: 'wk-k4', tekst: 'Zorg dat de rivier het water terug naar de zee brengt.', doelen: [D.we1], doelwit: 'rivier' },
        ],
        telescoop: [
          { id: 'wk-t1', tekst: 'Zet de temperatuur van de zee boven 20 graden en meet hoeveel water verdampt.', doelen: [D.we1t], doelwit: 'damp', minTemp: 20 },
          { id: 'wk-t2', tekst: 'Laat de wolk condenseren: duw ze met de wind naar de koude berg.', doelen: [D.we1t], doelwit: 'wolk' },
          { id: 'wk-t3', tekst: 'Laat het sneeuwen op de bergtop (koud genoeg).', doelen: [D.we1t], doelwit: 'sneeuw' },
          { id: 'wk-t4', tekst: 'Maak de kringloop rond: minstens 30 druppels terug in de zee.', doelen: [D.we1t, D.oz1t], doelwit: 'rond', aantal: 30 },
        ],
      },
    },
    test: {
      kompas: [
        vo('wkt-k1', 'Zet de reis van de waterdruppel in de juiste volgorde.', ['De zon warmt het zeewater op.', 'Het water verdampt en stijgt op.', 'In de koude lucht ontstaat een wolk.', 'Het regent op het land.', 'De rivier stroomt naar de zee.'], [D.we1]),
        kz('wkt-k2', 'Wat gebeurt er als water verdampt?', ['Het wordt waterdamp en stijgt op.', 'Het wordt ijs.', 'Het zakt in de grond.', 'Het wordt zout.'], 0, [D.we1]),
        kz('wkt-k3', 'Waar komen wolken van?', ['Van waterdamp die afkoelt tot kleine druppeltjes', 'Van rook uit schoorstenen', 'Van zand dat opwaait', 'Van de maan'], 0, [D.we1]),
        ko('wkt-k4', 'Koppel het woord aan de uitleg.', [['verdampen', 'water wordt damp'], ['neerslag', 'regen of sneeuw valt'], ['afstromen', 'water stroomt naar zee']], [D.we1]),
        kz('wkt-k5', 'Waarom regent het vaak aan zee in Brugge?', ['De wind brengt vochtige lucht van de zee', 'Er zijn veel bruggen', 'Het Belfort trekt wolken aan', 'De reien maken regen'], 0, [D.we1, D.ak1]),
        kz('wkt-k6', 'Je zet een plas water in de zon. Wat voorspel je?', ['De plas wordt kleiner: het water verdampt.', 'De plas wordt groter.', 'Er gebeurt niets.', 'De plas bevriest.'], 0, [D.oz1]),
      ],
      telescoop: [
        vo('wkt-t1', 'Zet de stappen van de waterkringloop in de juiste volgorde.', ['verdampen', 'condenseren', 'neerslag', 'afstromen'], [D.we1t]),
        kz('wkt-t2', 'Wat is condenseren?', ['Waterdamp koelt af en wordt weer vloeibaar water', 'Water warmt op en wordt damp', 'IJs smelt', 'Water zakt in de bodem'], 0, [D.we1t]),
        kz('wkt-t3', 'Waarom koelt opstijgende lucht af?', ['Hoog in de lucht is het kouder', 'De zon schijnt er niet', 'Wolken zijn koud gemaakt van ijs', 'De wind blaast warmte weg naar zee'], 0, [D.we1t]),
        kz('wkt-t4', 'Op welke dag verdampt een plas het snelst?', ['Warm, zonnig en winderig', 'Koud en windstil', 'Bewolkt en nat', 'In de nacht bij vorst'], 0, [D.we1t, D.oz1t]),
        so('wkt-t5', 'Sorteer: verdampen of condenseren?', ['verdampen', 'condenseren'], [['Een plas droogt op', 'verdampen'], ['Een koude fles wordt nat', 'condenseren'], ['Wasgoed droogt', 'verdampen'], ['Wasem op de badkamerspiegel', 'condenseren']], [D.we1t]),
        kz('wkt-t6', 'Je wil eerlijk testen of wind verdampen versnelt. Wat moet gelijk blijven?', ['De hoeveelheid water en de temperatuur', 'Enkel de kleur van de schaal', 'Niets, alles mag veranderen', 'Alleen de wind'], 0, [D.oz1t]),
      ],
    },
  },
  drijven: {
    naam: 'Drijven of zinken', gebouw: 'scheepswerf', week: 2, dag: 'dinsdag', gids: 'woordje', domein: 'Wetenschap',
    uitleg: 'Waarom drijft een schip? Voorspel en test met voorwerpen in water, olie en zout water.',
    herstel: { zone: 'reie-noord', tekst: 'De bootjes van de Scheepswerf drijven weer en de rondvaartboten varen door de reien.' },
    beloning: { uitrusting: 'zwemvest' },
    stations: ['filmpje', 'simulatie', 'test'],
    filmpje: FILM_DRIJVEN,
    simulatie: {
      type: 'drijven',
      opdrachten: {
        kompas: [
          { id: 'dz-k1', tekst: 'Voorspel en test 5 voorwerpen in gewoon water.', doelen: [D.we2, D.oz1], vloeistof: 'water', aantal: 5 },
          { id: 'dz-k2', tekst: 'Zoek een voorwerp dat in water zinkt maar in zout water drijft.', doelen: [D.we2], doelwit: 'ei' },
          { id: 'dz-k3', tekst: 'Minstens 4 voorspellingen juist.', doelen: [D.oz1], juist: 4 },
        ],
        telescoop: [
          { id: 'dz-t1', tekst: 'Bereken de massadichtheid van 4 voorwerpen (massa : volume).', doelen: [D.we2t], rekenen: 4 },
          { id: 'dz-t2', tekst: 'Test een voorwerp in olie, water en zout water. Verklaar het verschil.', doelen: [D.we2t], drieVloeistoffen: true },
          { id: 'dz-t3', tekst: 'Minstens 5 voorspellingen juist op basis van de massadichtheid.', doelen: [D.oz1t], juist: 5 },
        ],
      },
    },
    test: {
      kompas: [
        so('dzt-k1', 'Drijft of zinkt het in water?', ['drijft', 'zinkt'], [['kurk', 'drijft'], ['spijker', 'zinkt'], ['stuk hout', 'drijft'], ['knikker', 'zinkt'], ['plastic eendje', 'drijft'], ['sleutel', 'zinkt']], [D.we2]),
        kz('dzt-k2', 'Waarom blijft een groot ijzeren schip drijven?', ['Het is hol: er zit veel lucht in', 'IJzer drijft altijd', 'Het water is daar ondiep', 'Er zitten wielen onder'], 0, [D.te3, D.we2]),
        kz('dzt-k3', 'Een ei zinkt in kraantjeswater. Wat doe je zodat het drijft?', ['Veel zout in het water doen', 'Het water opwarmen', 'Het ei schilderen', 'Minder water gebruiken'], 0, [D.we2]),
        kz('dzt-k4', 'Je voorspelt dat een appel zinkt. Hij drijft. Wat doe je als onderzoeker?', ['Ik noteer het en pas mijn idee aan', 'Ik duw hem onder', 'Ik zeg dat de proef fout was', 'Ik stop met testen'], 0, [D.oz1]),
        kz('dzt-k5', 'In welk water drijf jij het makkelijkst?', ['In de zee (zout water)', 'In een zwembad', 'In de reie', 'Overal even makkelijk'], 0, [D.we2]),
      ],
      telescoop: [
        nr('dzt-t1', 'Een blok heeft een massa van 30 gram en een volume van 60 cm3. Wat is de massadichtheid (g per cm3)?', 0.5, [D.we2t], { eenheid: 'g/cm3', marge: 0.01 }),
        kz('dzt-t2', 'Drijft dat blok in water (1 g per cm3)?', ['Ja, want 0,5 is kleiner dan 1', 'Nee, want 30 is meer dan 1', 'Nee, want het is een blok', 'Dat kan je niet weten'], 0, [D.we2t]),
        nr('dzt-t3', 'Een steen: 75 gram, 30 cm3. Massadichtheid?', 2.5, [D.we2t], { eenheid: 'g/cm3', marge: 0.01 }),
        kz('dzt-t4', 'Olie (0,9 g per cm3) en water (1,0) in een glas. Wat gebeurt er?', ['De olie drijft bovenop het water', 'Het water drijft op de olie', 'Ze mengen tot een nieuwe stof', 'De olie zinkt naar de bodem'], 0, [D.we2t]),
        kz('dzt-t5', 'Een schip laadt te veel. Wat gebeurt er?', ['Het zakt dieper en kan zinken', 'Het gaat hoger drijven', 'Er verandert niets', 'Het wordt sneller'], 0, [D.te3t]),
        kz('dzt-t6', 'Eerlijk testen: je vergelijkt water en zout water. Wat moet je gelijk houden?', ['Hetzelfde voorwerp en evenveel vloeistof', 'Andere voorwerpen in elk glas', 'Een andere temperatuur', 'Niets'], 0, [D.oz1t]),
      ],
    },
  },
  sluis: {
    naam: 'Programmeer de sluis', gebouw: 'sluis', week: 4, dag: 'woensdag', gids: 'byte', domein: 'Techniek',
    uitleg: 'Leer hoe een sluis werkt en programmeer ze zelf met blokken. Loopt het mis? Zoek de fout.',
    herstel: { zone: 'haven', tekst: 'De sluis van Zeebrugge werkt weer: schepen varen de haven in en uit.' },
    beloning: { uitrusting: 'rubberlaarzen' },
    stations: ['filmpje', 'simulatie', 'test'],
    filmpje: FILM_SLUIS,
    simulatie: {
      type: 'sluis',
      opdrachten: {
        kompas: [
          { id: 'sl-k1', tekst: 'Breng de boot van de zee naar het kanaal.', doelen: [D.te1], van: 'zee', naar: 'kanaal' },
          { id: 'sl-k2', tekst: 'Breng de boot van het kanaal naar de zee.', doelen: [D.te1], van: 'kanaal', naar: 'zee' },
          { id: 'sl-k3', tekst: 'Zoek de fout in een programma dat niet werkt.', doelen: [D.te1, D.oz1], debug: true },
        ],
        telescoop: [
          { id: 'sl-t1', tekst: 'Breng de boot van de zee naar het kanaal met zo weinig mogelijk blokken.', doelen: [D.te1t], van: 'zee', naar: 'kanaal', max: 6 },
          { id: 'sl-t2', tekst: 'Debug het programma: er zitten twee fouten in.', doelen: [D.te1t, D.oz1t], debug: true, fouten: 2 },
          { id: 'sl-t3', tekst: 'Breng de boot heen en terug in één programma.', doelen: [D.te1t], heenEnTerug: true },
        ],
      },
    },
    test: {
      kompas: [
        vo('slt-k1', 'Een boot komt van de zee (laag water). Zet de stappen in de juiste volgorde.', ['Open de deur aan de zeekant', 'Vaar de boot in de kolk', 'Sluit de deur aan de zeekant', 'Vul de kolk met water', 'Open de deur aan de kanaalkant', 'Vaar de boot naar het kanaal'], [D.te1]),
        kz('slt-k2', 'Wanneer mag een sluisdeur open?', ['Als het water aan beide kanten even hoog staat', 'Altijd', 'Als de boot toetert', 'Als het eb is'], 0, [D.te1]),
        kz('slt-k3', 'Waarom heeft Zeebrugge een sluis?', ['De zee gaat op en neer, het kanaal moet op dezelfde hoogte blijven', 'Om vissen te vangen', 'Om de boten te wassen', 'Om de zee warm te houden'], 0, [D.te1, D.ak3]),
        kz('slt-k4', 'Wat is een algoritme?', ['Een reeks stappen in een vaste volgorde', 'Een soort boot', 'Een fout in een programma', 'Een getal'], 0, [D.te1]),
        kz('slt-k5', 'Je programma werkt niet. Wat doe je eerst?', ['Stap voor stap nakijken waar het misloopt', 'Alles weggooien', 'Sneller op de knop drukken', 'Iemand anders de schuld geven'], 0, [D.oz1]),
      ],
      telescoop: [
        vo('slt-t1', 'Een boot vaart van het kanaal (hoog) naar de zee (laag). Zet in volgorde.', ['Open de deur aan de kanaalkant', 'Vaar de boot in de kolk', 'Sluit de deur aan de kanaalkant', 'Laat de kolk leeglopen', 'Open de deur aan de zeekant', 'Vaar de boot naar zee'], [D.te1t]),
        kz('slt-t2', 'Wat loopt er mis? 1 open deur zee, 2 vaar in, 3 vul kolk, 4 open deur kanaal ...', ['De deur aan de zeekant werd niet gesloten voor het vullen', 'Er wordt te weinig gevaren', 'De boot moet eerst naar het kanaal', 'Er is niets fout'], 0, [D.te1t, D.oz1t]),
        kz('slt-t3', 'Een herhaling (lus) in een programma is handig als ...', ['je dezelfde stappen vaak moet doen', 'je maar één stap hebt', 'er een fout in zit', 'je wil stoppen'], 0, [D.te1t]),
        kz('slt-t4', 'Waarom werkt een sluis zonder pomp om de boot op te tillen?', ['Het water stroomt vanzelf van hoog naar laag', 'De boot is licht', 'De deuren duwen de boot', 'De maan tilt de boot'], 0, [D.te1t]),
        kz('slt-t5', 'Bij springtij is het verschil tussen eb en vloed groter. Wat betekent dat voor de sluis?', ['Er moet meer water in of uit de kolk', 'De sluis moet dicht blijven', 'Er verandert niets', 'Boten mogen niet varen'], 0, [D.te1t, D.we4t]),
      ],
    },
  },
  getij: {
    naam: 'Eb en vloed', gebouw: 'sluis', week: 4, dag: 'dinsdag', gids: 'kroniek', domein: 'Wetenschap',
    uitleg: 'Waarom komt de zee op en gaat ze terug? Laat de maan rond de aarde draaien en kijk wat er in Zeebrugge gebeurt.',
    herstel: { zone: 'noordrei', tekst: 'De rei naar de haven wordt helder blauw, er zwemmen weer vissen en een reiger staat op de oever.' },
    beloning: { uitrusting: 'verrekijker' },
    stations: ['filmpje', 'simulatie', 'test'],
    filmpje: FILM_GETIJ,
    simulatie: {
      type: 'getij',
      opdrachten: {
        kompas: [
          { id: 'gt-k1', tekst: 'Draai de aarde tot het hoogwater is in Zeebrugge.', doelen: [D.we4, D.ak3], doelwit: 'hoog' },
          { id: 'gt-k2', tekst: 'Draai verder tot het laagwater is in Zeebrugge.', doelen: [D.we4, D.ak3], doelwit: 'laag' },
          { id: 'gt-k3', tekst: 'Laat een hele dag voorbijgaan en tel hoe vaak het hoogwater is.', doelen: [D.ak3], doelwit: 'tel', antwoord: 2 },
        ],
        telescoop: [
          { id: 'gt-t1', tekst: 'Zet de maan zo dat het springtij is (zon, aarde en maan op een lijn).', doelen: [D.we4t], doelwit: 'springtij' },
          { id: 'gt-t2', tekst: 'Zet de maan zo dat het doodtij is.', doelen: [D.we4t], doelwit: 'doodtij' },
          { id: 'gt-t3', tekst: 'Lees de grafiek: om hoe laat is het volgende hoogwater?', doelen: [D.ak3t], doelwit: 'grafiek' },
        ],
      },
    },
    test: {
      kompas: [
        kz('gtt-k1', 'Wat veroorzaakt eb en vloed?', ['De aantrekkingskracht van de maan', 'De wind', 'De boten in de haven', 'De regen'], 0, [D.we4]),
        nr('gtt-k2', 'Hoeveel keer per dag is het ongeveer hoogwater aan de Belgische kust?', 2, [D.ak3]),
        kz('gtt-k3', 'Het is vloed. Wat zie je op het strand?', ['De zee komt tot dicht bij de dijk', 'Het strand is heel breed', 'De zee is weg', 'Het water is bevroren'], 0, [D.ak3]),
        ko('gtt-k4', 'Koppel.', [['eb', 'de zee gaat terug'], ['vloed', 'de zee komt op'], ['hoogwater', 'het hoogste punt van de vloed']], [D.ak3, D.we4]),
        kz('gtt-k5', 'Waarom moet een visser de getijden kennen?', ['Bij laagwater kan zijn boot vastlopen', 'Om te weten of het gaat regenen', 'Om zijn vis te koken', 'Dat hoeft niet'], 0, [D.ak3]),
      ],
      telescoop: [
        kz('gtt-t1', 'Wanneer is het springtij?', ['Bij volle maan en nieuwe maan', 'Alleen in de lente', 'Als het hard waait', 'Bij halve maan'], 0, [D.we4t]),
        kz('gtt-t2', 'Waarom is er ook een bult water aan de kant weg van de maan?', ['De aarde wordt sterker naar de maan getrokken dan het water aan de verre kant', 'Daar regent het meer', 'Daar staat de zon', 'Door de wind'], 0, [D.we4t]),
        nr('gtt-t3', 'Hoogwater om 6.10 uur. Hoe laat is het volgende hoogwater ongeveer (12 uur 25 later)? Typ het uur zonder minuten.', 18, [D.ak3t], { eenheid: 'uur', marge: 0.6 }),
        kz('gtt-t4', 'Bij doodtij staan zon en maan ...', ['haaks op elkaar (een hoek van 90 graden)', 'op een rechte lijn', 'naast elkaar', 'achter de aarde'], 0, [D.we4t]),
        kz('gtt-t5', 'Waarom moest Brugge vroeger een haven verder aan zee bouwen?', ['Het Zwin verzandde: schepen konden de stad niet meer bereiken', 'De zee was te warm', 'De boten waren te klein', 'Er waren geen bruggen'], 0, [D.ak2t, D.ge1t]),
      ],
    },
  },
  voedselweb: {
    naam: 'Leven in het Minnewater', gebouw: 'waterlabo', week: 3, dag: 'dinsdag', gids: 'atlas', domein: 'Wetenschap',
    uitleg: 'Wie eet wie onder water? Bouw het voedselweb van het Minnewater en ontdek wat de Slijkkraak kapotmaakt.',
    herstel: { zone: 'minnewater', tekst: 'Het Minnewater is weer helder. Zwanen, eenden, kikkers en vissen komen terug.' },
    beloning: { uitrusting: 'duikbril' },
    stations: ['filmpje', 'simulatie', 'test'],
    filmpje: FILM_VOEDSELWEB,
    simulatie: {
      type: 'voedselweb',
      opdrachten: {
        kompas: [
          { id: 'vw-k1', tekst: 'Maak een voedselketen van 4 schakels: begin bij een plant of alg.', doelen: [D.we3], keten: 4 },
          { id: 'vw-k2', tekst: 'Leg minstens 6 juiste pijlen (wie wordt gegeten door wie).', doelen: [D.we3], pijlen: 6 },
          { id: 'vw-k3', tekst: 'Zoek de producenten: welke soorten maken zelf voedsel?', doelen: [D.we3], producenten: true },
        ],
        telescoop: [
          { id: 'vw-t1', tekst: 'Leg minstens 10 juiste pijlen in het voedselweb.', doelen: [D.we3t], pijlen: 10 },
          { id: 'vw-t2', tekst: 'Haal de algen weg. Welke dieren krijgen het moeilijk? Duid ze aan.', doelen: [D.we3t, D.oz1t], weg: 'alg' },
          { id: 'vw-t3', tekst: 'Zoek de toppredator: het dier dat door niemand wordt gegeten.', doelen: [D.we3t], top: true },
        ],
      },
    },
    test: {
      kompas: [
        vo('vwt-k1', 'Zet de voedselketen in volgorde (wie wordt gegeten door wie).', ['alg', 'watervlo', 'vis', 'reiger'], [D.we3]),
        kz('vwt-k2', 'Wat zijn producenten?', ['Planten en algen die met zonlicht voedsel maken', 'Dieren die vlees eten', 'Vissen', 'Mensen die eten verkopen'], 0, [D.we3]),
        kz('vwt-k3', 'Wat eet een zwaan vooral?', ['Waterplanten', 'Reigers', 'Stenen', 'Brood is het beste voor zwanen'], 0, [D.we3]),
        kz('vwt-k4', 'Waarom is vuil water slecht voor de vissen?', ['Er is minder zuurstof en minder voedsel', 'Vissen houden niet van kleur', 'Het water is te warm', 'Vissen worden te groot'], 0, [D.we3, D.se2]),
        kz('vwt-k5', 'Hoe help jij het water in je buurt proper te houden?', ['Geen afval in het water gooien', 'Brood voor de eenden gooien', 'Zeep in de reie gieten', 'Niets, dat doet de stad'], 0, [D.se2]),
      ],
      telescoop: [
        kz('vwt-t1', 'Alle watervlooien sterven. Wat gebeurt er waarschijnlijk met de algen?', ['Er komen meer algen', 'Er komen minder algen', 'Er verandert niets', 'De algen worden vissen'], 0, [D.we3t]),
        kz('vwt-t2', 'Wat is een toppredator in het Minnewater?', ['De reiger', 'De watervlo', 'De alg', 'De slak'], 0, [D.we3t]),
        kz('vwt-t3', 'Waarom is een voedselweb sterker dan een voedselketen?', ['Dieren hebben meer dan één voedselbron', 'Er zijn minder dieren', 'Er zijn geen planten', 'Het is korter'], 0, [D.we3t]),
        so('vwt-t4', 'Producent, planteneter of vleeseter?', ['producent', 'planteneter', 'vleeseter'], [['waterlelie', 'producent'], ['alg', 'producent'], ['slak', 'planteneter'], ['watervlo', 'planteneter'], ['snoek', 'vleeseter'], ['reiger', 'vleeseter']], [D.we3t]),
        kz('vwt-t5', 'Welk argument overtuigt je buren het best om geen zeep in de goot te gieten?', ['De goot loopt naar de reie en de zeep schaadt de vissen', 'Omdat ik het zeg', 'Zeep is duur', 'Het ruikt raar'], 0, [D.se2t]),
      ],
    },
  },
  waterfilter: {
    naam: 'Bouw een waterfilter', gebouw: 'werkplaats', week: 5, dag: 'dinsdag', gids: 'bram', domein: 'Techniek',
    uitleg: 'Maak van modderwater helder water. Kies de lagen van je filter en test samen.',
    herstel: { zone: 'fontein', tekst: 'De grote fontein op de Markt springt aan en de waterval van het Minnewater stroomt weer helder.' },
    beloning: { uitrusting: 'veldfles' },
    stations: ['filmpje', 'simulatie', 'test'],
    filmpje: FILM_FILTER,
    simulatie: {
      type: 'waterfilter',
      opdrachten: {
        kompas: [
          { id: 'wf-k1', tekst: 'Bouw een filter met minstens 3 lagen en giet het modderwater erdoor.', doelen: [D.te2], lagen: 3 },
          { id: 'wf-k2', tekst: 'Maak het water helder genoeg (minstens 80 procent).', doelen: [D.te2], helder: 80 },
        ],
        telescoop: [
          { id: 'wf-t1', tekst: 'Maak het water minstens 95 procent helder.', doelen: [D.te2t], helder: 95 },
          { id: 'wf-t2', tekst: 'Vergelijk twee filters: verander telkens maar één laag.', doelen: [D.te2t, D.oz1t], vergelijk: true },
        ],
      },
    },
    test: {
      kompas: [
        vo('wft-k1', 'Leg de lagen van boven naar onder: van grof naar fijn.', ['grind', 'zand', 'houtskool', 'doek'], [D.te2]),
        kz('wft-k2', 'Waarvoor dient het grind?', ['Grote stukken vuil tegenhouden', 'Het water lekker maken', 'Bacterien doden', 'Het water warm maken'], 0, [D.te2]),
        kz('wft-k3', 'Is helder filterwater altijd veilig om te drinken?', ['Nee, er kunnen nog bacterien in zitten', 'Ja, altijd', 'Ja, als het koud is', 'Alleen op zondag'], 0, [D.te2, D.se2]),
        kz('wft-k4', 'Jullie werken in groep aan de filter. Wat helpt het meest?', ['Taken verdelen en naar elkaar luisteren', 'Alles alleen doen', 'Wachten tot iemand anders begint', 'Ruzie maken over wie mag gieten'], 0, [D.se1]),
      ],
      telescoop: [
        kz('wft-t1', 'Waarom komt de fijnste laag onderaan?', ['Anders raakt ze meteen verstopt met grote stukken', 'Ze is het zwaarst', 'Zo is het mooier', 'Dat maakt niet uit'], 0, [D.te2t]),
        kz('wft-t2', 'Wat doet houtskool in een filter?', ['Het vangt geur- en kleurstoffen', 'Het maakt het water zout', 'Het houdt stenen tegen', 'Het verwarmt het water'], 0, [D.te2t]),
        kz('wft-t3', 'Je verandert zand en houtskool tegelijk en het water wordt helderder. Wat weet je nu?', ['Niet welke laag het verschil maakte', 'Dat zand het beste is', 'Dat houtskool het beste is', 'Alles'], 0, [D.oz1t]),
        kz('wft-t4', 'Hoe geef je goede feedback aan je groep?', ['Ik zeg wat goed ging en geef een tip om te verbeteren', 'Ik zeg alleen wat slecht was', 'Ik zeg niets', 'Ik lach met fouten'], 0, [D.se1t]),
      ],
    },
  },
};

// ---------- themagebouwen ----------
const GEBOUWEN = {
  weerstation: { naam: 'Weerstation op het Belfort', kort: 'Weerstation', plek: 'belfort', gids: 'tella', week: 1, labos: ['waterkringloop'], interieur: 'weerstation',
    uitleg: 'Bovenin het Belfort meet Tella het weer: temperatuur, wind en regen, live uit Brugge.' },
  scheepswerf: { naam: 'Scheepswerf aan de haven', kort: 'Scheepswerf', plek: 'scheepswerf', gids: 'woordje', week: 2, labos: ['drijven'], interieur: 'scheepswerf',
    uitleg: 'Hier bouwt Woordje boten. Maar waarom blijft een boot drijven?' },
  waterlabo: { naam: 'Waterlabo bij het Minnewater', kort: 'Waterlabo', plek: 'waterlabo', gids: 'atlas', week: 3, labos: ['voedselweb'], interieur: 'waterlabo',
    uitleg: 'Een glazen paviljoen op palen: hier onderzoeken Atlas en Tella wie er in het water leeft.' },
  sluis: { naam: 'Sluis van Zeebrugge', kort: 'Sluis', plek: 'sluis', gids: 'byte', week: 4, labos: ['getij', 'sluis'], interieur: 'sluis',
    uitleg: 'In de controlekamer van de sluis volgt Byte het getij en programmeert hij de sluisdeuren.' },
  werkplaats: { naam: 'Werkplaats op de Markt', kort: 'Werkplaats', plek: 'hallen', gids: 'bram', week: 5, labos: ['waterfilter'], interieur: 'werkplaats',
    uitleg: 'In de Hallen onder het Belfort ontwerpt de klas oplossingen die de reien proper houden.' },
};

// ---------- missies van de week ----------
const MISSIES = [
  { id: 'ww-1-welkom', week: 1, dag: 'maandag', gids: 'atlas', domein: 'Aardrijkskunde', naam: 'Welkom in Zwinvliet',
    intro: 'Hallo reiziger, ik ben Atlas. Zwinvliet is een stad vol water, net als Brugge. Maar de Slijkkraak heeft de reien dichtgeslibd. Ken jij de stad al?',
    sets: {
      kompas: [
        kz('w1-k1', 'Brugge ligt in welke provincie?', ['West-Vlaanderen', 'Antwerpen', 'Limburg', 'Luik'], 0, [D.ak2]),
        kz('w1-k2', 'Welke zee ligt het dichtst bij Brugge?', ['De Noordzee', 'De Middellandse Zee', 'De Zwarte Zee', 'De Oostzee'], 0, [D.ak2]),
        kz('w1-k3', 'Zeebrugge ligt ... van Brugge.', ['ten noorden', 'ten zuiden', 'ten oosten', 'ten westen'], 0, [D.ak2]),
        kz('w1-k4', 'Hoe noemen de Bruggelingen hun kanalen?', ['reien', 'grachten', 'beken', 'sloten'], 0, [D.ak2, D.ge1]),
        kz('w1-k5', 'Welk gebouw op de Markt is 83 meter hoog?', ['Het Belfort', 'De Hallen', 'Het station', 'De vuurtoren'], 0, [D.ge1]),
      ],
      telescoop: [
        kz('w1-t1', 'Waarom noemt men Brugge het Venetie van het Noorden?', ['Door de vele reien en bruggen', 'Omdat er gondels varen', 'Omdat het in Italie ligt', 'Door het warme weer'], 0, [D.ak2t, D.ge1]),
        kz('w1-t2', 'Via welke zeearm kwamen schepen in de middeleeuwen tot bij Brugge?', ['Het Zwin', 'De Schelde', 'De IJzer', 'De Maas'], 0, [D.ge1t]),
        kz('w1-t3', 'Je staat op het Belfort en kijkt naar de zee. In welke richting kijk je ongeveer?', ['Noorden', 'Zuiden', 'Oosten', 'Westen'], 0, [D.ak2]),
        kz('w1-t4', 'Waarom heeft Brugge vandaag een haven in Zeebrugge en niet meer in de stad?', ['Het Zwin verzandde en grote schepen moeten aan de kust aanmeren', 'De stad was te klein', 'De Belgen hielden niet van boten', 'Er was geen water meer in de reien'], 0, [D.ak2t, D.ge1t]),
        so('w1-t5', 'Natuurlijk of door mensen gemaakt?', ['natuurlijk', 'door mensen gemaakt'], [['de Noordzee', 'natuurlijk'], ['de reien van Brugge', 'door mensen gemaakt'], ['het Zwin', 'natuurlijk'], ['de sluis van Zeebrugge', 'door mensen gemaakt']], [D.ak2t]),
      ],
    } },
  { id: 'ww-1-weerman', week: 1, dag: 'donderdag', gids: 'tella', domein: 'Aardrijkskunde', naam: 'Weerman of weervrouw',
    intro: 'Een goede weervoorspeller kijkt naar de lucht en leest de meters af. Kijk ook eens naar de weerwijzer bovenaan je scherm: dat is het echte weer in Brugge!',
    sets: {
      kompas: [
        ko('w1w-k1', 'Koppel het meettoestel aan wat het meet.', [['thermometer', 'temperatuur'], ['regenmeter', 'neerslag'], ['windmeter', 'windsnelheid'], ['windvaan', 'windrichting']], [D.ak1]),
        kz('w1w-k2', 'De thermometer wijst -3 graden. Wat kan er vallen?', ['Sneeuw', 'Warme regen', 'Niets, het is zomer', 'Zand'], 0, [D.ak1]),
        kz('w1w-k3', 'De windvaan wijst naar het zuiden. Waar komt de wind vandaan?', ['Uit het noorden', 'Uit het zuiden', 'Uit het oosten', 'Uit het westen'], 0, [D.ak1, D.ak2]),
        nr('w1w-k4', 'Maandag 12 graden, dinsdag 15 graden. Hoeveel graden warmer is het dinsdag?', 3, [D.ak1]),
        kz('w1w-k5', 'Wat betekent een zonnetje met een wolk op de weerkaart?', ['Half bewolkt', 'Onweer', 'Mist', 'Sneeuw'], 0, [D.ak1]),
      ],
      telescoop: [
        nr('w1w-t1', 'De wind waait 36 km per uur. Hoeveel meter per seconde is dat? (36 000 m : 3600 s)', 10, [D.ak1t], { eenheid: 'm/s' }),
        nr('w1w-t2', 'Temperaturen deze week: 8, 10, 12, 10, 10. Wat is de gemiddelde temperatuur?', 10, [D.ak1t], { eenheid: 'graden' }),
        kz('w1w-t3', 'Westenwind aan de kust brengt vaak ...', ['vochtige lucht van de zee en dus regen', 'droge woestijnlucht', 'sneeuw uit het zuiden', 'altijd zon'], 0, [D.ak1t]),
        kz('w1w-t4', 'Waarom is het aan zee in de zomer vaak koeler dan in het binnenland?', ['Zeewater warmt trager op dan land', 'De zon schijnt er minder', 'Er waait nooit wind', 'Het zand is koud'], 0, [D.ak1t, D.we1t]),
        nr('w1w-t5', 'In 3 dagen viel 4 mm, 0 mm en 11 mm regen. Hoeveel mm in totaal?', 15, [D.ak1t], { eenheid: 'mm' }),
      ],
    } },
  { id: 'ww-2-handelsstad', week: 2, dag: 'woensdag', gids: 'kroniek', domein: 'Geschiedenis', naam: 'Brugge, rijk door het water',
    intro: 'Oehoe. Lang geleden voeren schepen uit heel Europa tot in Brugge. Wol, kruiden, zijde ... Brugge werd rijk. Wat weet jij daarover?',
    sets: {
      kompas: [
        kz('w2-k1', 'Waarom werd Brugge in de middeleeuwen zo rijk?', ['Door de handel met schepen', 'Door goudmijnen', 'Door de toeristen', 'Door voetbal'], 0, [D.ge1]),
        kz('w2-k2', 'Wat werd er vroeger veel verhandeld in Brugge?', ['Wol en laken', 'Computers', 'Auto\'s', 'Bananen'], 0, [D.ge1]),
        kz('w2-k3', 'Waar stapelden handelaars hun koopwaar op?', ['In pakhuizen aan de reien', 'In de kerk', 'In het station', 'Op het strand'], 0, [D.ge1]),
        kz('w2-k4', 'Wat is de Kraan op de Kraanplaats?', ['Een houten kraan om schepen te lossen', 'Een vogel', 'Een waterkraan', 'Een brug'], 0, [D.ge1, D.te3]),
      ],
      telescoop: [
        kz('w2-t1', 'Wat gebeurde er toen het Zwin verzandde?', ['Schepen konden Brugge niet meer bereiken en de handel verhuisde naar Antwerpen', 'Brugge werd een eiland', 'De reien liepen over', 'Brugge kreeg een nieuwe zee'], 0, [D.ge1t]),
        kz('w2-t2', 'Wat was de Hanze?', ['Een groep handelssteden die samenwerkten', 'Een soort boot', 'Een koning van Brugge', 'Een bier'], 0, [D.ge1t]),
        kz('w2-t3', 'Waarom zijn er zoveel bruggen in Brugge?', ['De stad werd gebouwd rond reien en kanalen', 'Om vissen te vangen', 'Omdat het veel regent', 'Voor de treinen'], 0, [D.ge1t, D.ak2t]),
        kz('w2-t4', 'Oorzaak en gevolg: het Zwin verzandt. Wat is het gevolg voor de stad?', ['Minder handel en minder rijkdom', 'Meer schepen', 'Meer vis', 'Grotere boten'], 0, [D.ge1t]),
      ],
    } },
  { id: 'ww-3-tijdlijn', week: 4, dag: 'woensdag', gids: 'kroniek', domein: 'Geschiedenis', naam: 'De tijdlijn van het water',
    intro: 'Kroniek heeft een rol met jaartallen gevonden, maar de Slijkkraak heeft alles door elkaar gegooid. Leg jij het weer in orde?',
    sets: {
      kompas: [
        vo('w3-k1', 'Zet van vroeger naar nu.', ['Schepen varen via het Zwin tot in Brugge', 'Het Zwin verzandt', 'Brugge wordt een stille stad', 'De haven van Zeebrugge wordt gebouwd', 'Toeristen varen met rondvaartboten'], [D.ge2]),
        kz('w3-k2', 'Wat is ouder?', ['Het Belfort', 'De haven van Zeebrugge', 'De rondvaartboten met motor', 'De sluis van Zeebrugge'], 0, [D.ge2]),
        kz('w3-k3', 'Een eeuw is ...', ['100 jaar', '10 jaar', '1000 jaar', '50 jaar'], 0, [D.ge2]),
      ],
      telescoop: [
        vo('w3-t1', 'Zet in de juiste volgorde.', ['Middeleeuwen: Brugge is een wereldhaven', '15de eeuw: het Zwin verzandt', '1907: de haven van Zeebrugge opent', 'Vandaag: Zeebrugge is een grote zeehaven'], [D.ge2t]),
        kz('w3-t2', 'In welke eeuw ligt het jaar 1907?', ['20ste eeuw', '19de eeuw', '21ste eeuw', '18de eeuw'], 0, [D.ge2t]),
        kz('w3-t3', 'Waarom bouwde men een haven aan de kust in plaats van het Zwin uit te graven?', ['De grote stoomschepen hadden diep water nodig, dichtbij de zee', 'Graven was verboden', 'Het Zwin was te warm', 'Er was geen geld voor schepen'], 0, [D.ge2t, D.ak2t]),
      ],
    } },
  { id: 'ww-3-samen', week: 4, dag: 'donderdag', gids: 'bram', domein: 'Hart', naam: 'Samen aan de sluis',
    intro: 'Een sluis bedien je nooit alleen: de sluiswachter, de kapitein en de havenmeester praten met elkaar. Hoe werk jij samen?',
    sets: {
      kompas: [
        kz('w3s-k1', 'Je groep is het niet eens. Wat doe je?', ['Iedereen mag zijn idee zeggen en we kiezen samen', 'Ik beslis alleen', 'Ik doe niet meer mee', 'De luidste wint'], 0, [D.se1]),
        kz('w3s-k2', 'Een klasgenoot maakt een fout in het programma. Wat zeg je?', ['Geen probleem, zullen we samen zoeken?', 'Jij kan het niet', 'Laat mij maar', 'Niets en lachen'], 0, [D.se1]),
        so('w3s-k3', 'Helpt dit om samen te werken?', ['helpt', 'helpt niet'], [['luisteren', 'helpt'], ['taken verdelen', 'helpt'], ['door elkaar roepen', 'helpt niet'], ['elkaar aanmoedigen', 'helpt'], ['alles zelf willen doen', 'helpt niet']], [D.se1]),
      ],
      telescoop: [
        kz('w3s-t1', 'Wat is opbouwende feedback?', ['Zeggen wat goed is en een tip geven om te verbeteren', 'Alleen zeggen wat fout is', 'Niets zeggen', 'Iemand uitlachen'], 0, [D.se1t]),
        kz('w3s-t2', 'Na het groepswerk denk je na: wat was jouw bijdrage? Welke vraag helpt?', ['Wat deed ik goed en wat doe ik volgende keer anders?', 'Wie was het slechtst?', 'Hoe snel was ik klaar?', 'Welke punten krijg ik?'], 0, [D.se1t]),
        kz('w3s-t3', 'Iemand in je groep zegt nooit iets. Wat doe je?', ['Ik vraag rustig wat hij of zij denkt', 'Ik negeer die persoon', 'Ik doe het werk in zijn plaats', 'Ik zeg het tegen iedereen'], 0, [D.se1t]),
      ],
    } },
  { id: 'ww-4-kust', week: 3, dag: 'woensdag', gids: 'atlas', domein: 'Aardrijkskunde', naam: 'Aan de kust',
    intro: 'Van Knokke tot De Panne: onze kust is 67 kilometer lang. Elke dag komt de zee twee keer op. Ga je mee naar het strand?',
    sets: {
      kompas: [
        nr('w4-k1', 'Hoe lang is de Belgische kust ongeveer (in km)?', 67, [D.ak3], { eenheid: 'km', marge: 3 }),
        kz('w4-k2', 'Wat beschermt de kust tegen de zee bij storm?', ['De duinen en de dijk', 'De bomen in het park', 'De reien', 'De vuurtoren'], 0, [D.ak3]),
        kz('w4-k3', 'Het is laagwater. Wat kan je nu doen?', ['Schelpen zoeken ver op het strand', 'Met een grote boot de haven binnenvaren zonder zorgen', 'Zwemmen bij de dijk', 'Niets'], 0, [D.ak3]),
      ],
      telescoop: [
        kz('w4-t1', 'Wat staat er in een getijdentabel?', ['De uren van hoog- en laagwater', 'De temperatuur van de zee', 'Het aantal schepen', 'De prijzen van vis'], 0, [D.ak3t]),
        nr('w4-t2', 'Laagwater om 9 uur. Ongeveer hoeveel uur later is het hoogwater (de helft van 12,5)? Rond af op een heel uur.', 6, [D.ak3t], { marge: 0.5 }),
        kz('w4-t3', 'Waarom ligt de haven van Zeebrugge achter lange havendammen?', ['Om de golven en het zand tegen te houden', 'Om vissen te vangen', 'Voor de wandelaars', 'Om de zee warm te houden'], 0, [D.ak3t]),
      ],
    } },
  { id: 'ww-5-zuinig', week: 5, dag: 'dinsdag', gids: 'bram', domein: 'Hart', naam: 'Elke druppel telt',
    intro: 'Water uit de kraan lijkt gewoon, maar proper water is kostbaar. Hoe ga jij zuinig om met water?',
    sets: {
      kompas: [
        so('w5-k1', 'Zuinig of niet zuinig?', ['zuinig', 'niet zuinig'], [['kort douchen', 'zuinig'], ['de kraan open laten bij het tandenpoetsen', 'niet zuinig'], ['regenwater opvangen voor de planten', 'zuinig'], ['de vaatwasser half vol aanzetten', 'niet zuinig']], [D.se2]),
        kz('w5-k2', 'Waarom gooi je geen afval in de reie?', ['Het maakt het water vuil en dieren worden ziek', 'Dan zinkt het', 'Dat mag alleen op zondag', 'Het afval wordt dan nat'], 0, [D.se2]),
        nr('w5-k3', 'Een douche van 5 minuten gebruikt ongeveer 40 liter. Hoeveel liter is 10 minuten?', 80, [D.se2], { eenheid: 'liter' }),
      ],
      telescoop: [
        kz('w5-t1', 'Je wil de klas overtuigen om regenwater op te vangen. Welk argument is het sterkst?', ['Het spaart drinkwater en is gratis voor de planten', 'Regen is leuk', 'Iedereen doet het', 'Het is grappig'], 0, [D.se2t]),
        nr('w5-t2', 'Een lekkende kraan verliest 1 liter per uur. Hoeveel liter per dag?', 24, [D.se2t], { eenheid: 'liter' }),
        kz('w5-t3', 'Welke actie helpt het water in je buurt het meest?', ['Afval opruimen bij de reie met de klas', 'Een filmpje bekijken', 'Het water bekijken', 'Klagen'], 0, [D.se2t]),
      ],
    } },
];
// de wekelijkse check (Stadsmissie, vrijdag) uit de handleiding, in het gebouw van de week
const CHECK_GIDS = { 1: 'tella', 2: 'woordje', 3: 'atlas', 4: 'byte' };
const CHECK_GEBOUW = { 1: 'weerstation', 2: 'scheepswerf', 3: 'waterlabo', 4: 'sluis' };
for (const w of [1, 2, 3, 4]) {
  MISSIES.push({ id: `ww-${w}-check`, week: w, dag: 'vrijdag', gids: CHECK_GIDS[w], gebouw: CHECK_GEBOUW[w], check: true, domein: 'Onderzoek',
    naam: 'Stadsmissie: ' + WEKEN_WW[w - 1].titel,
    intro: 'De check van deze week. Elk juist antwoord maakt het water van Zwinvliet een beetje helderder. Verbeter je fouten later met revanche.',
    sets: { kompas: TOETS_WW[w].kompas, telescoop: TOETS_WW[w].telescoop } });
}

// ---------- eindbaas ----------
const EINDBAAS = {
  id: 'slijkkraak', naam: 'De Slijkkraak', week: 5, dag: 'vrijdag', gids: 'atlas',
  verhaal: 'Uit de Noordzee kroop de Slijkkraak, een reusachtig slijkmonster met lange tentakels. Hij slibt de reien dicht en eet alles wat leeft. Met alles wat jullie leerden over water, kunnen jullie hem samen verslaan: elk juist antwoord spuit proper water op het monster!',
  eind: 'De Slijkkraak glibbert terug naar de diepe zee. De reien van Zwinvliet zijn helder, de zwanen zwemmen op het Minnewater en de fontein op de Markt spuit hoog. Proficiat, reizigers!',
  raid: {
    vragen: {
      kompas: [
        kz('rk-k1', 'Water dat opwarmt en opstijgt, noemen we ...', ['verdampen', 'bevriezen', 'smelten', 'zinken'], 0, [D.we1]),
        kz('rk-k2', 'Drijft een kurk in water?', ['ja', 'nee'], 0, [D.we2]),
        kz('rk-k3', 'Wat trekt aan de zee en maakt eb en vloed?', ['de maan', 'de wind', 'de vissen', 'de boten'], 0, [D.we4]),
        kz('rk-k4', 'Wat moet eerst dicht voor je de kolk vult?', ['de deur achter de boot', 'het Belfort', 'de kraan', 'niets'], 0, [D.te1]),
        kz('rk-k5', 'Wie maakt voedsel met zonlicht?', ['algen en planten', 'reigers', 'vissen', 'slakken'], 0, [D.we3]),
        kz('rk-k6', 'Welke laag komt bovenaan in een waterfilter?', ['grind', 'doek', 'houtskool', 'fijn zand'], 0, [D.te2]),
        kz('rk-k7', 'Brugges haven aan zee heet ...', ['Zeebrugge', 'Oostende', 'Antwerpen', 'Gent'], 0, [D.ak2]),
        kz('rk-k8', 'Hoe vaak per dag is het ongeveer hoogwater?', ['2 keer', '1 keer', '4 keer', 'nooit'], 0, [D.ak3]),
        kz('rk-k9', 'Uit wolken valt ...', ['neerslag', 'zand', 'licht', 'wind'], 0, [D.we1]),
        kz('rk-k10', 'Wat gooi je NIET in de reie?', ['afval', 'niets, alles mag', 'regen', 'licht'], 0, [D.se2]),
        kz('rk-k11', 'Een ijzeren spijker in water ...', ['zinkt', 'drijft', 'smelt', 'verdampt'], 0, [D.we2]),
        kz('rk-k12', 'Zeebrugge ligt ten ... van Brugge.', ['noorden', 'zuiden', 'oosten', 'westen'], 0, [D.ak2]),
      ],
      telescoop: [
        kz('rk-t1', 'Damp die afkoelt tot druppels: dat is ...', ['condenseren', 'verdampen', 'smelten', 'stollen'], 0, [D.we1t]),
        kz('rk-t2', 'Massadichtheid 0,8 g per cm3 in water (1,0): drijft of zinkt?', ['drijft', 'zinkt'], 0, [D.we2t]),
        kz('rk-t3', 'Zon, aarde en maan op een lijn geeft ...', ['springtij', 'doodtij', 'eb', 'geen getij'], 0, [D.we4t]),
        kz('rk-t4', 'Debuggen betekent ...', ['fouten zoeken en verbeteren', 'een programma wissen', 'sneller rijden', 'een sluis bouwen'], 0, [D.te1t]),
        kz('rk-t5', 'Alle algen weg. Wie heeft het eerst honger?', ['de watervlooien', 'de reigers', 'de zwanen', 'niemand'], 0, [D.we3t]),
        kz('rk-t6', 'Eerlijk testen = ...', ['één ding tegelijk veranderen', 'alles tegelijk veranderen', 'niets meten', 'raden'], 0, [D.oz1t]),
        kz('rk-t7', '36 km per uur is ... meter per seconde.', ['10', '36', '3,6', '100'], 0, [D.ak1t]),
        kz('rk-t8', 'Waarom verhuisde de haven van Brugge naar de kust?', ['het Zwin verzandde', 'de zee bevroor', 'de reien werden te breed', 'de boten werden kleiner'], 0, [D.ge1t]),
        kz('rk-t9', 'Een steen: 50 g en 20 cm3. Massadichtheid?', ['2,5', '0,4', '70', '30'], 0, [D.we2t]),
        kz('rk-t10', 'Houtskool in een filter vangt ...', ['geur- en kleurstoffen', 'grote stenen', 'vissen', 'zand'], 0, [D.te2t]),
        kz('rk-t11', 'Tussen twee keer hoogwater zit ongeveer ...', ['12,5 uur', '24 uur', '6 uur', '1 week'], 0, [D.ak3t]),
        kz('rk-t12', 'Een goed argument steunt op ...', ['feiten en gevolgen', 'roepen', 'raden', 'lachen'], 0, [D.se2t]),
      ],
    },
  },
  // het digitale eindproefwerk uit de handleiding (week 5, les 6)
  test: { kompas: TOETS_WW[5].kompas, telescoop: TOETS_WW[5].telescoop },
};

// themakledij: labo's geven elk een stuk, de geheime codes uit het Expeditieboek geven de rest
const UITRUSTING = {
  zuidwester: { naam: 'Gele zuidwester', slot: 'hoofd', uitleg: 'Na het labo in het Weerstation.' },
  zwemvest: { naam: 'Oranje zwemvest', slot: 'jas', uitleg: 'Na het labo op de Scheepswerf.' },
  duikbril: { naam: 'Duikbril met snorkel', slot: 'gezicht', uitleg: 'Na het labo in het Waterlabo.' },
  verrekijker: { naam: 'Verrekijker', slot: 'nek', uitleg: 'Na het labo over eb en vloed.' },
  rubberlaarzen: { naam: 'Rubberlaarzen', slot: 'voeten', uitleg: 'Na het labo aan de Sluis.' },
  veldfles: { naam: 'Veldfles', slot: 'hand', uitleg: 'Na het labo in de Werkplaats.' },
  regenjas: { naam: 'Gele regenjas', slot: 'jas', uitleg: 'Geheime code van week 1.' },
  kapiteinspet: { naam: 'Kapiteinspet', slot: 'hoofd', uitleg: 'Geheime code van week 2.' },
  schepnet: { naam: 'Schepnet met loep', slot: 'hand', uitleg: 'Geheime code van week 3.' },
  maankompas: { naam: 'Maankompas', slot: 'nek', uitleg: 'Geheime code van week 4.' },
  goudnet: { naam: 'Gouden schepnet', slot: 'hand', uitleg: 'Geheime code van week 5.' },
  'kleur-speurneus': { naam: 'Paarse speurneusjas', slot: 'kleur', uitleg: 'Voor wie de drie geheimen van Zwinvliet vond.' },
};

// de geheime codes staan in het Expeditieboek (een per week)
const CODE_BELONING = { REGENBOOG: 'regenjas', ZEILBOOT: 'kapiteinspet', KIKKER: 'schepnet', GETIJDEN: 'maankompas', HELDER: 'goudnet' };
const CODES = Object.fromEntries(Object.entries(CODES_WW).map(([c, v]) => [c, { week: v.week, beloning: CODE_BELONING[c], waar: `Expeditieboek week ${v.week}`, geeft: v.geeft }]));

export const WATERWERELD = {
  id: 'waterwereld', nr: 1, naam: 'Waterwereld', stad: 'Zwinvliet', ondertitel: 'Een Venetie van het Noorden', kleur: '#2f8fd6', gids: 'atlas',
  verhaal: {
    intro: 'Welkom in Zwinvliet, reiziger! Net als Brugge is Zwinvliet een stad vol reien, bruggen en kaaien. Maar uit de Noordzee kroop de Slijkkraak: een reusachtig slijkmonster. Hij slibde de reien dicht, de fontein op de Markt staat stil, de sluis zit vast en de zwanen zijn gevlucht. In vijf weken leren we alles over water. Elk labo dat de klas haalt, maakt een stuk van de stad weer proper. En op het einde verslaan we samen de Slijkkraak!',
    eind: EINDBAAS.eind,
  },
  weken: WEKEN_WW,
  doelen: DOELEN,
  gebouwen: GEBOUWEN,
  labos: LABOS,
  missies: MISSIES,
  eindbaas: EINDBAAS,
  uitrusting: UITRUSTING,
  codes: CODES,
  // hoe de stad het thema toont: welke waterzones er zijn (zie js/city/water.js) en hun naam
  zones: {
    'reie-zuid': 'de reien aan de Rozenhoedkaai', 'reie-noord': 'de reien bij de Scheepswerf', minnewater: 'het Minnewater',
    noordrei: 'de rei naar de haven', haven: 'de haven en de sluis', fontein: 'de fontein en de waterval',
  },
};
