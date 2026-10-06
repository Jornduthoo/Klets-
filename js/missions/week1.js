// Oefeningen van Queste 1, week 1 ("Wie ben ik?").
// Sleutel = les-id uit data/queste1.js. Per route een lijst items; elk item heeft doelcodes (goals).
// Ontbreekt een route, dan valt de app terug op de dichtstbijzijnde route (zie model.kiesSet).
import { raidSet } from './raidbank.js';

const kz = (id, vraag, opties, juist, goals, x = {}) => ({ id, type: 'keuze', vraag, opties, juist, goals, ...x });
const nr = (id, vraag, antwoord, goals, x = {}) => ({ id, type: 'getal', vraag, antwoord, goals, ...x });
const ty = (id, vraag, antwoorden, goals, x = {}) => ({ id, type: 'typ', vraag, antwoorden, goals, ...x });
const vo = (id, vraag, items, goals, x = {}) => ({ id, type: 'volgorde', vraag, items, goals, ...x });
const ko = (id, vraag, paren, goals, x = {}) => ({ id, type: 'koppel', vraag, paren, goals, ...x });
const so = (id, vraag, bakken, kaarten, goals, x = {}) => ({ id, type: 'sorteer', vraag, bakken, kaarten: kaarten.map(([t, bak]) => ({ t, bak })), goals, ...x });
const sp = (id, woord, juist, goals, x = {}) => ({ id, type: 'splits', vraag: `Splits het woord in delen: ${woord}`, woord, juist, goals, ...x });
const zi = (id, vraag, tegels, goals, x = {}) => ({ id, type: 'zin', vraag, tegels, goals, ...x });
const ka = (id, vraag, kaart, goals, x = {}) => ({ id, type: 'kaart', vraag, kaart, goals, ...x });

// ---------- gedeelde teksten ----------
const NADIA = [
  'Mijn naam - een column van Nadia (12)',
  'Op elke eerste schooldag zeggen leerkrachten mijn naam verkeerd. Nadja. Nadie. Nadine. Mijn naam is Nadia. Mijn oma koos hem.',
  'Soms vind ik dat lastig. Dan moet ik mijn naam drie keer zeggen en word ik een beetje boos.',
  'Maar mijn naam is een cadeau van mijn oma. Ik ben er fier op. Nadia klinkt zacht en sterk tegelijk. Ik vind hem mooi.',
  'Zeg mijn naam maar drie keer fout. De vierde keer lukt het wel. En ik blijf Nadia.',
];
const NAMEN = [
  'Namen met een betekenis',
  'Veel namen hebben een betekenis. Noor betekent licht in het Arabisch. Sofia betekent wijsheid in het Grieks. Bogdan betekent geschenk van God in het Oekraiens.',
  'Ouders kiezen een naam soms omdat ze hopen dat hun kind zo wordt. Soms krijg je de naam van een oma of opa. Zo draag je een stukje van je familie mee.',
  'In Station Klets wonen namen uit veel talen naast elkaar. Elke naam is een verhaal.',
];
const BOEKJE = ['Ik ben Lin.', 'Ik ben nieuw.', 'De haai is nieuw.', 'De kraai is moe.', 'De koe zit in de sneeuw.', 'Wij zijn hier. Wij horen erbij.'];
const W = { // korte weergave van doelcodes
  g41: '2.1.GL4.1', g47: '2.1.GL4.7', s61: '2.1.GL6.1', s613: '2.1.GL6.13', g48: '2.1.GL4.8', g412: '2.1.GL4.12', s619: '2.1.GL6.19',
  g417: '2.1.GL4.17', s66: '2.1.GL6.6', g430: '2.1.GL4.30', s626: '2.1.GL6.26', s632: '2.1.GL6.32', s633: '2.1.GL6.33',
};

export const WEEK1 = {
  // ===================== MAANDAG =====================
  'w1-ma2': {
    naam: "Tella's dagenteller", intro: 'Ik ben Tella. Ik tel alles: dagen, sterren, reizigers. Luister goed en schrijf de getallen in cijfers.',
    sets: {
      kompas: [
        nr('dt-k1', 'Luister en typ het getal in cijfers.', 6428, [W.g47], { zeg: 'zesduizend vierhonderd achtentwintig' }),
        nr('dt-k2', 'Luister en typ het getal in cijfers.', 9075, [W.g47], { zeg: 'negenduizend vijfenzeventig' }),
        nr('dt-k3', 'Luister en typ het getal in cijfers.', 3604, [W.g47], { zeg: 'drieduizend zeshonderd vier' }),
        ty('dt-k4', 'Schrijf 2 805 in woorden.', ['tweeduizend achthonderd vijf', 'tweeduizend achthonderdvijf', 'tweeduizendachthonderdvijf'], [W.g47]),
        kz('dt-k5', 'Wat betekent TD in de positiekaart?', ['tienduizendtal', 'tiental', 'duizendtal', 'honderdtal'], 0, [W.g41]),
        nr('dt-k6', 'Eén tienduizendtal (1 TD) is hoeveel eenheden?', 10000, [W.g41]),
        ka('dt-k7', 'Klik de kolom waar de 7 staat in 47 382.', { soort: 'positiekaart', kolommen: ['TD', 'D', 'H', 'T', 'E'], juist: 'D' }, [W.g41]),
        ka('dt-k8', 'Klik de kolom waar de 4 staat in 47 382.', { soort: 'positiekaart', kolommen: ['TD', 'D', 'H', 'T', 'E'], juist: 'TD' }, [W.g41]),
        nr('dt-k9', 'Welk getal staat in de positiekaart?', 30518, [W.g41, W.g47], { context: 'TD = 3, D = 0, H = 5, T = 1, E = 8' }),
      ],
      telescoop: [
        nr('dt-t1', 'Luister en typ het getal in cijfers.', 3400000000, [W.s61], { zeg: 'drie miljard vierhonderd miljoen' }),
        nr('dt-t2', 'Luister en typ het getal in cijfers.', 47200000, [W.s61], { zeg: 'zevenenveertig miljoen tweehonderdduizend' }),
        nr('dt-t3', 'Luister en typ het getal in cijfers.', 908000000, [W.s61], { zeg: 'negenhonderd acht miljoen' }),
        ka('dt-t4', 'Klik de kolom waar de 6 staat in 6 205 000 000.', { soort: 'positiekaart', kolommen: ['Md', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E'], juist: 'Md' }, [W.s61]),
        ka('dt-t5', 'Klik de kolom waar de 8 staat in 380 000 000.', { soort: 'positiekaart', kolommen: ['Md', 'HM', 'TM', 'M', 'HD', 'TD', 'D', 'H', 'T', 'E'], juist: 'TM' }, [W.s61]),
        kz('dt-t6', '1 miljard is ...', ['duizend miljoen', 'honderd miljoen', 'tien miljoen', 'een miljoen miljoen'], 0, [W.s613]),
        nr('dt-t7', 'Hoeveel miljoen is 2,5 miljard?', 2500, [W.s613], { eenheid: 'miljoen' }),
        kz('dt-t8', 'In Belgie wonen 11 900 000 mensen. Dat is ongeveer ...', ['12 miljoen', '1,2 miljoen', '120 miljoen', '12 miljard'], 0, [W.s613]),
        ty('dt-t9', 'Vul aan met een woord: 4 000 000 000 = 4 ...', ['miljard'], [W.s613]),
      ],
    },
  },
  'w1-ma3': {
    naam: 'Woorden zijn sleutels', intro: 'Hallo, ik ben Woordje! Woorden zijn sleutels. Vandaag zoeken we klanken, leenwoorden en lange woorden.',
    sets: {
      taalsleutels: [
        kz('kt-1', 'Klankentrein: welke klank hoor je in de naam?', ['aa', 'ou', 'ij', 'ie'], 0, ['1.2.AAN.2'], { zeg: 'Saar', groot: true, vast: true }),
        kz('kt-2', 'Klankentrein: welke klank hoor je in de naam?', ['aa', 'ou', 'ij', 'ie'], 1, ['1.2.AAN.2'], { zeg: 'Lou', groot: true, vast: true }),
        kz('kt-3', 'Klankentrein: welke klank hoor je in de naam?', ['ch', 'ij', 'oe', 'aa'], 1, ['1.2.AAN.2'], { zeg: 'Bijan', groot: true, vast: true }),
        kz('kt-4', 'Klankentrein: welke klank hoor je in de naam?', ['ch', 'ie', 'ou', 'ij'], 0, ['1.2.AAN.2'], { zeg: 'Chadi', groot: true, vast: true }),
        kz('kt-5', 'Klankentrein: welke klank hoor je in de naam?', ['aa', 'oe', 'ie', 'ou'], 2, ['1.2.AAN.2'], { zeg: 'Ilias', groot: true, vast: true }),
        kz('kt-6', 'Waar begin je te lezen op een bladzijde?', ['Bovenaan, links', 'Onderaan, rechts', 'In het midden', 'Bovenaan, rechts'], 0, ['1.2.AAN.1']),
        kz('kt-7', 'De regel is op. Waar lees je verder?', ['Op de volgende regel, links', 'Op dezelfde regel, rechts', 'Bovenaan de bladzijde', 'Onderaan, rechts'], 0, ['1.2.AAN.1']),
        zi('kt-8', 'Leg de zin van links naar rechts.', ['Ik', 'ben', 'nieuw', 'in', 'Station', 'Klets.'], ['1.2.AAN.1'], { zeg: 'Ik ben nieuw in Station Klets.' }),
      ],
      kompas: [
        kz('lw-1', "Leenwoordenjacht: hoe zeg je 'laptop'?", ['lep-top', 'laap-top', 'lap-toop'], 0, ['1.2.GL4.7'], { vast: true }),
        kz('lw-2', "Hoe zeg je 'game'?", ['geem', 'ga-me', 'gam'], 0, ['1.2.GL4.7'], { vast: true }),
        kz('lw-3', "Hoe zeg je 'team'?", ['tee-am', 'tiem', 'taam'], 1, ['1.2.GL4.7'], { vast: true }),
        kz('lw-4', "Hoe zeg je 'coach'?", ['ko-ach', 'kootsj', 'kos'], 1, ['1.2.GL4.7'], { vast: true }),
        kz('lw-5', "Hoe zeg je 'weekend'?", ['wee-kent', 'wiekent', 'wekkend'], 1, ['1.2.GL4.7'], { vast: true }),
        kz('lw-6', "Hoe zeg je 'sorry'?", ['so-rie', 'sorrie', 'sor-ry'], 1, ['1.2.GL4.7'], { vast: true }),
        kz('lw-7', "Welke zin lees je met een Engels leenwoord?", ['In het weekend speel ik een game op mijn laptop.', 'Ik eet een appel.', 'De trein rijdt snel.'], 0, ['1.2.GL4.7']),
      ],
      telescoop: [
        sp('ws-1', 'nachttrein', 'nacht-trein', ['1.2.GL6.1']),
        sp('ws-2', 'stationsklok', 'stations-klok', ['1.2.GL6.1']),
        sp('ws-3', 'wereldkaart', 'wereld-kaart', ['1.2.GL6.1']),
        sp('ws-4', 'laptoptas', 'laptop-tas', ['1.2.GL6.1']),
        sp('ws-5', 'voetbaltraining', 'voetbal-training', ['1.2.GL6.1']),
        sp('ws-6', 'reizigerspas', 'reizigers-pas', ['1.2.GL6.1']),
        kz('ws-7', 'Welk deel van het woord komt uit het Engels?', ['laptop in laptoptas', 'tas in laptoptas', 'geen enkel deel'], 0, ['1.2.GL6.1']),
      ],
    },
  },
  'w1-ma4': {
    naam: "Byte's typetraining", intro: 'Biep! Ik ben Byte. Ik maak je laptop wakker. Typ precies wat je ziet. Kijk naar het scherm, niet naar je handen.',
    sets: {
      kompas: [
        { id: 'tt-k1', type: 'typen', vraag: 'Level 1: de thuisrij (AZERTY). Typ de letters over.', tekst: 'qsdf jklm qsdf jklm', minNauwkeurigheid: 90, goals: ['8.2.GL4.1'] },
        { id: 'tt-k2', type: 'typen', vraag: 'Level 2: hoofdletters. Houd Shift ingedrukt.', tekst: 'Station Klets en Tella', minNauwkeurigheid: 90, goals: ['8.2.GL4.1'] },
        { id: 'tt-k3', type: 'typen', vraag: 'Level 3: cijfers en tekens.', tekst: 'Perron 3, trein 12!', minNauwkeurigheid: 90, goals: ['8.2.GL4.1'] },
        kz('tt-k4', 'Met welke toets maak je een hoofdletter?', ['Shift', 'Enter', 'Spatiebalk', 'Backspace'], 0, ['8.2.GL4.1']),
        so('tt-k5', 'Invoer of uitvoer? Sorteer.', ['Invoer (iets in de computer brengen)', 'Uitvoer (iets uit de computer halen)'],
          [['toetsenbord', 0], ['muis', 0], ['microfoon', 0], ['webcam', 0], ['scherm', 1], ['printer', 1], ['luidspreker', 1], ['koptelefoon', 1]], ['8.2.GL4.1']),
      ],
      telescoop: [
        { id: 'tt-t1', type: 'typen', vraag: 'Level 1: de thuisrij. Minstens 90 % juist.', tekst: 'qsdf jklm sdf lkj qsdf jklm', minNauwkeurigheid: 90, goals: ['8.2.GL6.1'] },
        { id: 'tt-t2', type: 'typen', vraag: 'Level 2: tempo. Minstens 90 % juist en 15 woorden per minuut.', tekst: 'De nachttrein rijdt Station Klets binnen.', minNauwkeurigheid: 90, minWpm: 15, goals: ['8.2.GL6.1'] },
        { id: 'tt-t3', type: 'typen', vraag: 'Level 3: cijfers en tekens.', tekst: 'Om 23.15 uur: perron 3 (wagon 12)!', minNauwkeurigheid: 90, goals: ['8.2.GL6.1'] },
        ka('tt-t4', 'Klik op de instelling waar je de taal van het toetsenbord kiest.', {
          soort: 'regio', viewBox: '0 0 600 260',
          achtergrond: [{ tag: 'rect', attrs: { x: 0, y: 0, width: 600, height: 260, rx: 10, fill: 'var(--kaart-bg)' } }, { tag: 'text', attrs: { x: 20, y: 30, class: 'rg-titel' }, tekst: 'Instellingen' }],
          regios: [
            { id: 'sys', label: 'Systeem', x: 20, y: 50, w: 180, h: 80 }, { id: 'bt', label: 'Bluetooth', x: 210, y: 50, w: 180, h: 80 },
            { id: 'pers', label: 'Personalisatie', x: 400, y: 50, w: 180, h: 80 }, { id: 'taal', label: 'Tijd en taal', x: 20, y: 150, w: 180, h: 80 },
            { id: 'toeg', label: 'Toegankelijkheid', x: 210, y: 150, w: 180, h: 80 }, { id: 'priv', label: 'Privacy', x: 400, y: 150, w: 180, h: 80 },
          ], juist: 'taal',
        }, ['8.2.GL6.4']),
        vo('tt-t5', 'Zet de klikweg in de juiste volgorde: je wil het geluid luider zetten.', ['Klik op Start', 'Klik op Instellingen', 'Kies Systeem', 'Kies Geluid', 'Schuif het volume naar rechts'], ['8.2.GL6.4']),
        kz('tt-t6', 'Je scherm is te donker. Welke instelling pas je aan?', ['Helderheid', 'Bluetooth', 'Muisknoppen', 'Achtergrond'], 0, ['8.2.GL6.4']),
      ],
    },
  },
  'w1-ma5': {
    naam: 'Mijn Reizigersembleem', intro: 'Neem een foto van je embleem en zet hem in de klasgalerij. Iedereen in Station Klets kan hem dan bewonderen.',
    sets: { alle: [{ id: 'em-1', type: 'upload', vraag: 'Kies de foto van je embleem.', map: 'Klasgalerij', titel: 'Mijn embleem', goals: [] }] },
  },
  'w1-ma7': { soort: 'klasmeter', naam: 'De klasmeter', intro: 'Bekijk hoeveel XP de klas samen verzamelde.' },

  // ===================== DINSDAG =====================
  'w1-di2': {
    naam: 'De nachttrein telt', intro: 'De nachttrein heeft wagons met nummers. Help mij ze in de goede volgorde te zetten!',
    sets: {
      kompas: [
        vo('nt-k1', 'Sleep de getallen in de wagons, van klein naar groot.', ['1 099', '1 909', '1 990', '9 019', '9 109'], [W.g412], { trein: true }),
        vo('nt-k2', 'Van klein naar groot.', ['4 056', '4 065', '4 506', '4 560'], [W.g412], { trein: true }),
        nr('nt-k3', 'Tel verder per 100: 3 850, 3 950, 4 050, ...', 4150, [W.g48]),
        nr('nt-k4', 'Tel terug per 1 000: 9 200, 8 200, 7 200, ...', 6200, [W.g48]),
        nr('nt-k5', 'Tel verder per 5: 2 985, 2 990, 2 995, ...', 3000, [W.g48]),
        nr('nt-k6', 'Tel verder per 2: 7 994, 7 996, 7 998, ...', 8000, [W.g48]),
        ka('nt-k7', 'Klik op de getallenas waar 750 ligt.', { soort: 'getallenas', min: 0, max: 1000, stap: 100, waarde: 750, marge: 25, snap: 5 }, [W.g412]),
        ka('nt-k8', 'Klik op de getallenas waar 3 500 ligt.', { soort: 'getallenas', min: 0, max: 10000, stap: 1000, waarde: 3500, marge: 250, snap: 50 }, [W.g412]),
        kz('nt-k9', 'Welk getal ligt het dichtst bij 5 000?', ['4 990', '5 100', '4 900', '5 050'], 0, [W.g412]),
      ],
      telescoop: [
        kz('go-1', 'Een volle nachttrein met 8 wagons. Hoeveel reizigers zitten erin?', ['ongeveer 50', 'ongeveer 500', 'ongeveer 5 000', 'ongeveer 50 000'], 1, [W.s619], { vast: true }),
        kz('go-2', 'Hoeveel mensen wonen er in een grote stad zoals Antwerpen?', ['5 000', '50 000', '500 000', '5 000 000'], 2, [W.s619], { vast: true }),
        kz('go-3', 'Hoeveel mensen wonen er op de wereld?', ['8 miljoen', '80 miljoen', '800 miljoen', '8 miljard'], 3, [W.s619], { vast: true }),
        kz('go-4', 'Hoeveel bladzijden heeft een dik leesboek?', ['3', '30', '300', '3 000'], 2, [W.s619], { vast: true }),
        kz('go-5', 'Hoeveel seconden duurt een schooldag van 6 uur?', ['ongeveer 2 000', 'ongeveer 20 000', 'ongeveer 200 000', 'ongeveer 2 000 000'], 1, [W.s619], { vast: true, uitleg: '6 x 60 x 60 = 21 600 seconden.' }),
        kz('go-6', 'Hoeveel haren heeft een mens ongeveer op zijn hoofd?', ['1 000', '100 000', '10 000 000', '1 miljard'], 1, [W.s619], { vast: true }),
        ka('go-7', 'Klik op de getallenas waar 3 miljard ligt.', { soort: 'getallenas', min: 0, max: 10000000000, stap: 1000000000, waarde: 3000000000, marge: 300000000, snap: 100000000, labelElke: 5 }, [W.s619]),
        vo('go-8', 'Zet van klein naar groot.', ['tienduizend', 'honderdduizend', 'een miljoen', 'een miljard'], [W.s619]),
      ],
    },
  },
  'w1-di3': {
    naam: 'Korte woorden en slimme teksten', intro: 'Woordje hier! Vandaag bouwen we korte woorden, zoeken we doffe klanken en ontmaskeren we tekstdoelen.',
    sets: {
      taalsleutels: [
        zi('kb-1', 'Klankenbrug: luister en leg het woord.', ['k', 'a', 't'], ['1.2.AAN.3'], { zeg: 'kat', aaneen: true, extra: ['aa', 'p'] }),
        zi('kb-2', 'Luister en leg het woord.', ['b', 'e', 'l'], ['1.2.AAN.3'], { zeg: 'bel', aaneen: true, extra: ['ee', 'd'] }),
        zi('kb-3', 'Luister en leg het woord.', ['v', 'i', 's'], ['1.2.AAN.3'], { zeg: 'vis', aaneen: true, extra: ['ie', 'z'] }),
        zi('kb-4', 'Luister en leg het woord.', ['i', 'k'], ['1.2.AAN.3'], { zeg: 'ik', aaneen: true, extra: ['ie'] }),
        zi('kb-5', 'Luister en leg het woord.', ['b', 'u', 's'], ['1.2.AAN.3'], { zeg: 'bus', aaneen: true, extra: ['uu', 'p'] }),
        zi('kb-6', 'Luister en leg het woord.', ['d', 'a', 'k'], ['1.2.AAN.3'], { zeg: 'dak', aaneen: true, extra: ['aa', 'g'] }),
        zi('kb-7', 'Leg de zin.', ['Ik', 'zit', 'op', 'de', 'bus.'], ['1.2.AAN.3'], { zeg: 'Ik zit op de bus.' }),
      ],
      kompas: [
        { id: 'dk-0', type: 'tekst', vraag: 'Lees de tekst.', tekst: ['De haviken van het station', 'Op het dak van Station Klets wonen twee haviken. Ze eten geen perziken. De monniken van het klooster naast het station voeren de leeuweriken.'], goals: [] },
        kz('dk-1', "Hoe klinkt het einde van 'perziken'?", ['per-zu-ken (doffe klank)', 'per-zie-ken'], 0, ['1.2.GL4.1'], { zeg: 'perziken', vast: true }),
        kz('dk-2', "Hoe klinkt het einde van 'monniken'?", ['mon-nie-ken', 'mon-nu-ken (doffe klank)'], 1, ['1.2.GL4.1'], { zeg: 'monniken', vast: true }),
        kz('dk-3', "Hoe klinkt het einde van 'haviken'?", ['ha-vu-ken (doffe klank)', 'ha-vie-ken'], 0, ['1.2.GL4.1'], { zeg: 'haviken', vast: true }),
        kz('dk-4', "Hoe klinkt het einde van 'leeuweriken'?", ['lee-we-rie-ken', 'lee-we-ru-ken (doffe klank)'], 1, ['1.2.GL4.1'], { zeg: 'leeuweriken', vast: true }),
        kz('dk-5', 'In welk woord hoor je de doffe klank -uken?', ['perziken', 'kiezen', 'piepen', 'pieken'], 0, ['1.2.GL4.1']),
        kz('dk-6', 'Welk woord is het meervoud van havik?', ['haviken', 'havikken', 'haviks', 'havieken'], 0, ['1.2.GL4.1']),
      ],
      telescoop: [
        kz('td-1', 'Tekstdetective: wat wil de schrijver?', ['informeren', 'overtuigen', 'instrueren', 'vertellen'], 2, ['1.2.GL6.14'], { vast: true, context: 'Trek de rode hendel naar beneden. Wacht drie tellen. Duw dan de deur open.' }),
        kz('td-2', 'Wat wil de schrijver?', ['informeren', 'overtuigen', 'instrueren', 'vertellen'], 1, ['1.2.GL6.14'], { vast: true, context: 'Kom naar het Leesfeest! Het wordt de leukste middag van het jaar. Dit wil je echt niet missen.' }),
        kz('td-3', 'Wat wil de schrijver?', ['informeren', 'overtuigen', 'instrueren', 'vertellen'], 0, ['1.2.GL6.14'], { vast: true, context: 'De nachttrein rijdt elke dag om 23.15 uur. Hij stopt in vijf stations en heeft acht wagons.' }),
        kz('td-4', 'Wat wil de schrijver?', ['informeren', 'overtuigen', 'instrueren', 'vertellen'], 3, ['1.2.GL6.14'], { vast: true, context: 'Er was eens een uil die nooit sliep. Op een nacht hoorde ze een vreemd geluid op het perron ...' }),
        ko('td-5', 'Koppel elk tekstdoel aan een kenmerk.', [['informeren', 'feiten, uren en getallen'], ['overtuigen', "uitroeptekens en 'dit wil je niet missen'"], ['instrueren', 'stappen en zinnen die beginnen met een werkwoord'], ['vertellen', "personages en 'er was eens'"]], ['1.2.GL6.14']),
        kz('td-6', "Aan welk kenmerk zie je dat 'Trek de rode hendel naar beneden' een instructie is?", ['De zin begint met een werkwoord.', 'Er staat een getal in.', 'Er is een personage.', 'Er staat een uitroepteken.'], 0, ['1.2.GL6.14']),
      ],
    },
  },
  'w1-di4': {
    naam: 'Wie is wie?', intro: 'Ik ben Bram. De Grijze Mist ziet maar een laag van mensen. Wij zien meer. Kijk goed naar deze reizigers.',
    sets: {
      kompas: [
        so('ui-k1', 'Klopt de uitspraak, zegt ze te weinig of klopt ze niet?', ['klopt', 'te weinig', 'klopt niet'], [
          ['Amira is gewoon een meisje met een hoofddoek.', 1], ['Amira is doelvrouw, tekenaar en grote zus.', 0], ['Amira spreekt alleen Arabisch.', 2],
          ['Dani is de nieuwe.', 1], ['Dani speelt gitaar en helpt zijn oma.', 0], ['Dani houdt niet van muziek.', 2],
          ['Mei is gewoon de stille van de klas.', 1], ['Mei is een schaker en een goede vriendin.', 0],
        ], ['9-3.4.GL4.4'], { context: [
          'Amira (12): draagt een hoofddoek, is doelvrouw in de voetbalploeg, spreekt Arabisch, Nederlands en wat Engels, is grote zus van twee broers en tekent graag.',
          'Dani (11): was vorig jaar nieuw in de klas, speelt gitaar, is fan van dinosaurussen en helpt zijn oma met boodschappen.',
          'Mei (12): praat niet veel in de klas, wint vaak met schaken en is een trouwe vriendin.'] }),
        kz('ui-k2', 'Ilyas was vorig jaar stil en verlegen. Nu is hij klasverantwoordelijke. Wat leer je daaruit?', ['Wie je bent, kan veranderen.', 'Ilyas doet alsof.', 'Mensen veranderen nooit.'], 0, ['9-3.4.GL4.5']),
        kz('ui-k3', 'Een ui heeft veel lagen. Wat betekent dat voor mensen?', ['Een mens heeft veel kanten tegelijk.', 'Mensen zijn moeilijk.', 'Je ziet meteen alles van iemand.'], 0, ['9-3.4.GL4.5']),
        kz('ui-k4', 'Wat zit in de binnenste ring van jouw ui?', ['Wat niemand ziet, zoals wat ik droom', 'Hoe ik eruitzie', 'Mijn hobby', 'Mijn adres'], 0, ['9-3.4.GL4.5'], { uitleg: 'De binnenste ring mag geheim blijven.' }),
        kz('ui-k5', "Iemand zegt: 'Jij bent gewoon de nieuwe.' Wat kan je antwoorden?", ['Ik ben ook een voetballer, een broer en een tekenaar.', 'Ja, meer ben ik niet.', 'Niets, het klopt.'], 0, ['9-3.4.GL4.4']),
      ],
      telescoop: [
        so('ui-t1', 'Hoor ik bij deze groep door mijn leeftijd, mijn ervaring of waar ik nu woon?', ['leeftijd', 'ervaring', 'waar ik nu woon'], [
          ['de leerlingen van het 6de leerjaar', 0], ['de tieners', 0], ['kinderen die een nieuwe taal leerden', 1], ['wie al eens verhuisde', 1],
          ['de jeugdbeweging in mijn gemeente', 2], ['de supporters van de club van mijn stad', 2],
        ], ['9-3.4.GL6.1']),
        kz('ui-t2', 'Sara hoorde vorig jaar bij de jongste groep op de speelplaats. Nu hoort ze bij de oudsten. Juist of fout: ze hoort bij een andere groep door haar leeftijd.', ['juist', 'fout'], 0, ['9-3.4.GL6.1'], { vast: true }),
        kz('ui-t3', 'Juist of fout: een groep, zoals onze klas, verandert nooit.', ['juist', 'fout'], 1, ['9-3.4.GL6.8'], { vast: true, uitleg: 'Er komen nieuwe leerlingen bij, mensen groeien en de klas krijgt nieuwe gewoontes.' }),
        kz('ui-t4', 'Vandaag wonen in Vlaanderen mensen die meer dan 100 talen spreken. Wat toont dat?', ['Ook een groep heeft lagen en verandert.', 'Vlaanderen is altijd hetzelfde gebleven.', 'Er is maar een soort Vlaming.'], 0, ['9-3.4.GL6.8']),
        kz('ui-t5', 'Welke uitleg past het best? Een voetbalploeg krijgt drie nieuwe spelers.', ['De ploeg blijft een ploeg, maar ze verandert ook.', 'Het is nu geen ploeg meer.', 'De nieuwe spelers horen er nooit bij.'], 0, ['9-3.4.GL6.8']),
      ],
    },
  },

  // ===================== WOENSDAG =====================
  'w1-wo2': {
    naam: 'Wagons vullen', intro: 'Reizigers stappen in. Elke wagon krijgt evenveel reizigers. Hoe verdelen we ze eerlijk?',
    sets: {
      kompas: [
        kz('wv-1', '24 reizigers gaan in gelijke groepjes. Welke groepsgroottes kunnen? (meer antwoorden)', ['3', '4', '5', '6', '7', '8'], [0, 1, 3, 5], [W.g417], { vast: true }),
        nr('wv-2', 'Hoeveel delers heeft 18?', 6, [W.g417], { uitleg: '1, 2, 3, 6, 9 en 18.' }),
        kz('wv-3', 'Welke getallen zijn veelvouden van 6? (meer antwoorden)', ['12', '16', '30', '34', '42', '45'], [0, 2, 4], [W.g417], { vast: true }),
        nr('wv-4', 'Welk veelvoud van 8 ligt tussen 50 en 60?', 56, [W.g417]),
        so('wv-5', 'Is het een deler van 36?', ['deler van 36', 'geen deler van 36'], [['4', 0], ['9', 0], ['12', 0], ['18', 0], ['6', 0], ['5', 1], ['7', 1], ['8', 1]], [W.g417]),
        nr('wv-6', '36 reizigers. Een wagon heeft 9 plaatsen. Hoeveel wagons zijn helemaal vol?', 4, [W.g417]),
      ],
      telescoop: [
        so('pw-1', 'Poortwachter 3 en 9: sorteer de getallen.', ['deelbaar door 9 (en door 3)', 'alleen deelbaar door 3', 'niet deelbaar door 3'],
          [['81', 0], ['405', 0], ['2 718', 0], ['999', 0], ['3 141', 0], ['123', 1], ['5 556', 1], ['1 001', 2], ['734', 2], ['20', 2]], [W.s66]),
        kz('pw-2', 'Hoe weet je snel of een getal deelbaar is door 3?', ['De som van de cijfers is deelbaar door 3.', 'Het laatste cijfer is een 3.', 'Het getal is oneven.', 'Het getal heeft 3 cijfers.'], 0, [W.s66]),
        nr('pw-3', 'Welk cijfer moet op de plaats van ? staan zodat 4?2 deelbaar is door 9?', 3, [W.s66], { uitleg: '4 + 3 + 2 = 9.' }),
        kz('pw-4', 'Juist of fout: elk getal dat deelbaar is door 9, is ook deelbaar door 3.', ['juist', 'fout'], 0, [W.s66], { vast: true }),
        kz('pw-5', 'Is 7 512 deelbaar door 9?', ['ja', 'nee, wel door 3', 'nee, ook niet door 3'], 1, [W.s66], { vast: true, uitleg: '7 + 5 + 1 + 2 = 15: deelbaar door 3, niet door 9.' }),
      ],
    },
  },
  'w1-wo3': {
    naam: 'Leeskamp in de wachtzaal', intro: 'De trein naar Leesland vertrekt zo. Zoek een fijne plek en lees mee.',
    sets: {
      taalsleutels: [
        kz('kz-1', 'Klankenzoo: welk woord hoor je?', ['kooi', 'koe', 'kraai'], 0, ['1.2.AAN.4'], { zeg: 'kooi', groot: true }),
        kz('kz-2', 'Welk woord hoor je?', ['haai', 'hooi', 'hoe'], 1, ['1.2.AAN.4'], { zeg: 'hooi', groot: true }),
        kz('kz-3', 'Welk woord hoor je?', ['nieuw', 'nu', 'duw'], 0, ['1.2.AAN.4'], { zeg: 'nieuw', groot: true }),
        kz('kz-4', 'Welk woord hoor je?', ['mooi', 'moe', 'maai'], 1, ['1.2.AAN.4'], { zeg: 'moe', groot: true }),
        kz('kz-5', 'Welk woord hoor je?', ['leeuw', 'lui', 'luw'], 0, ['1.2.AAN.4'], { zeg: 'leeuw', groot: true }),
        kz('kz-6', 'Welk woord hoor je?', ['haai', 'hooi', 'hei'], 0, ['1.2.AAN.4'], { zeg: 'haai', groot: true }),
        kz('kz-7', 'Welk woord hoor je?', ['duw', 'dauw', 'dooi'], 0, ['1.2.AAN.4'], { zeg: 'duw', groot: true }),
        so('kz-8', 'Woordtrein: in welke wagon past het woord?', ['aai', 'ooi', 'oe', 'eeuw / ieuw'], [['kraai', 0], ['haai', 0], ['mooi', 1], ['kooi', 1], ['koe', 2], ['moe', 2], ['leeuw', 3], ['nieuw', 3]], ['1.2.AAN.4']),
      ],
      kompas: [
        { id: 'lt-0', type: 'tekst', vraag: 'Leestimer: lees 20 minuten in je eigen boek.', timer: 20, goals: [] },
        kz('lt-1', 'Je bent afgeleid tijdens het lezen. Wat doe je?', ['Ik neem een leesbladwijzer-pauze: 10 tellen ademen en dan verder.', 'Ik stop met lezen.', 'Ik begin te praten met mijn buur.'], 0, ['1.2.GL4.13']),
        kz('lt-2', 'Om de hoeveel minuten kleur je een vakje op je leeskaart?', ['elke 5 minuten', 'elke minuut', 'na 20 minuten'], 0, ['1.2.GL4.13'], { vast: true }),
        kz('lt-3', 'Wat noteer je bij elk vakje?', ['Een woord of zin die ik onthoud', 'Niets', 'Het aantal letters'], 0, ['1.2.GL4.13']),
      ],
      telescoop: [
        { id: 'vz-0', type: 'tekst', vraag: 'Lees de tekst.', tekst: NAMEN, goals: [] },
        kz('vz-1', 'Wat betekent Sofia?', ['wijsheid', 'licht', 'geschenk', 'moed'], 0, ['1.2.GL6.7'], { context: NAMEN.slice(1, 2) }),
        kz('vz-2', 'Welke naam past bij een klas die de mist verjaagt met licht?', ['Noor', 'Sofia', 'Bogdan'], 0, ['1.2.GL6.7'], { context: NAMEN.slice(1, 2) }),
        kz('vz-3', 'Waarom kiezen ouders soms een naam met een betekenis?', ['Ze hopen dat hun kind zo wordt.', 'Omdat het moet van de wet.', 'Omdat korte namen beter zijn.'], 0, ['1.2.GL6.7'], { context: NAMEN.slice(2, 3) }),
        kz('vz-4', 'Je krijgt de naam van je oma. Wat zegt de tekst daarover?', ['Je draagt een stukje van je familie mee.', 'Dat mag niet.', 'Dan heb je geen eigen naam.'], 0, ['1.2.GL6.7'], { context: NAMEN.slice(2, 3) }),
        kz('vz-5', 'Welk verband leg je met Station Klets?', ['Hier wonen namen uit veel talen naast elkaar.', 'In Station Klets heeft niemand een naam.', 'Alle namen in Station Klets zijn Grieks.'], 0, ['1.2.GL6.7']),
      ],
    },
  },
  'w1-wo4': {
    naam: "Byte's rugzak", intro: 'Biep. Je laptop is een rugzak met vakjes: mappen. Vind de juiste weg en open de Kluis.',
    sets: {
      kompas: [
        ka('rz-k1', 'Je reizigerspas is een tekstdocument. In welke map hoort hij?', {
          soort: 'regio', viewBox: '0 0 600 220',
          achtergrond: [{ tag: 'rect', attrs: { x: 0, y: 0, width: 600, height: 220, rx: 10, fill: 'var(--kaart-bg)' } }, { tag: 'text', attrs: { x: 20, y: 30, class: 'rg-titel' }, tekst: 'Verkenner' }],
          regios: [
            { id: 'doc', label: 'Documenten', x: 20, y: 50, w: 130, h: 140 }, { id: 'afb', label: 'Afbeeldingen', x: 165, y: 50, w: 130, h: 140 },
            { id: 'muz', label: 'Muziek', x: 310, y: 50, w: 130, h: 140 }, { id: 'vid', label: "Video's", x: 455, y: 50, w: 125, h: 140 },
          ], juist: 'doc',
        }, ['8.2.GL4.2']),
        vo('rz-k2', 'Zet de weg naar je reizigerspas in de juiste volgorde.', ['Verkenner', 'Documenten', 'Klets', 'reizigerspas.docx'], ['8.2.GL4.2']),
        kz('rz-k3', 'Waar bewaar je de foto van je embleem het best?', ['in de map Afbeeldingen', 'in de map Muziek', 'in de prullenbak', 'op het bureaublad tussen alles'], 0, ['8.2.GL4.2']),
        ty('rz-k4', 'Open de map Kluis. Typ de geheime code die op het briefje staat.', ['KLUIS-OPEN', 'kluis open', 'kluisopen'], ['8.2.GL4.2'], { context: 'Documenten > Klets > Kluis > briefje.txt: "De code is KLUIS-OPEN"' }),
      ],
      telescoop: [
        kz('rz-t1', "De afspraak in de klas is: embleem_voornaam.jpg. Welke bestandsnaam is juist voor Amira?", ['embleem_amira.jpg', 'IMG_20261006.jpg', 'foto.jpg', 'embleem amira nieuw2.jpg'], 0, ['8.2.GL6.3']),
        vo('rz-t2', 'Hoe maak je een nieuwe map? Zet de stappen in volgorde.', ['Rechtsklik in de lege ruimte', 'Kies Nieuw', 'Kies Map', 'Typ de naam', 'Druk op Enter'], ['8.2.GL6.3']),
        kz('rz-t3', 'Je hebt een bestand per ongeluk verwijderd. Waar haal je het terug?', ['Prullenbak', 'Downloads', 'Instellingen', 'Bureaublad'], 0, ['8.2.GL6.3']),
        ko('rz-t4', 'Koppel de actie aan wat ze betekent.', [['hernoemen', 'een andere naam geven'], ['verplaatsen', 'naar een andere map brengen'], ['verwijderen', 'in de prullenbak zetten'], ['terugzetten', 'uit de prullenbak terughalen']], ['8.2.GL6.3']),
        kz('rz-t5', 'Wat is uploaden?', ['Een bestand van jouw computer naar het internet sturen', 'Een bestand van het internet op jouw computer zetten', 'Een bestand verwijderen'], 0, ['8.2.GL6.2']),
        kz('rz-t6', 'Je haalt een werkblad van de klaswebsite op je laptop. Dat is ...', ['downloaden', 'uploaden', 'hernoemen'], 0, ['8.2.GL6.2']),
        ty('rz-t7', 'Open de map Kluis. Typ de geheime code die op het briefje staat.', ['KLUIS-OPEN', 'kluis open', 'kluisopen'], ['8.2.GL6.3'], { context: 'Documenten > Klets > Kluis > briefje.txt: "De code is KLUIS-OPEN"' }),
      ],
    },
  },

  // ===================== DONDERDAG =====================
  'w1-do2': {
    naam: "Tella's taartenbakkerij", intro: 'Mijn dag is een taart. Een stuk slapen, een stuk school, een stuk spelen. Kleur en reken mee!',
    sets: {
      kompas: [
        ka('tb-1', 'Kleur 3/8 van de taart.', { soort: 'taart', delen: 8, kleur: 3 }, [W.g430]),
        ka('tb-2', 'Kleur 2/3 van de taart.', { soort: 'taart', delen: 6, kleur: 4 }, [W.g430], { uitleg: '2/3 = 4/6.' }),
        nr('tb-3', 'Hoeveel is 1/3 van 24?', 8, [W.g430]),
        nr('tb-4', '3/4 van de 20 reizigers slaapt. Hoeveel reizigers slapen?', 15, [W.g430]),
        kz('tb-5', 'Je dag heeft 24 uur. Je slaapt 8 uur. Welk deel van je dag slaap je?', ['1/3', '1/4', '1/8', '8/12'], 0, [W.g430], { vast: true }),
        nr('tb-6', 'Een taart weegt 2 kg. Hoeveel gram weegt 1/4 van de taart?', 500, [W.g430], { eenheid: 'gram' }),
      ],
      telescoop: [
        ko('pp-1', 'Procentpoort: koppel de breuk aan het procent.', [['1/2', '50 %'], ['1/4', '25 %'], ['3/4', '75 %'], ['1/10', '10 %'], ['1/5', '20 %']], [W.s633]),
        ko('pp-2', 'Koppel het decimaal getal aan het procent.', [['0,5', '50 %'], ['0,05', '5 %'], ['0,75', '75 %'], ['0,2', '20 %'], ['1', '100 %']], [W.s633]),
        nr('pp-3', 'Schrijf 7 % als breuk.', '7/100', [W.s632], { breuk: true }),
        nr('pp-4', '0,6 = ... %', 60, [W.s633], { eenheid: '%' }),
        kz('pp-5', 'In onze klas spreken 15 van de 20 leerlingen 3 talen of meer. Hoeveel procent is dat?', ['75 %', '15 %', '20 %', '35 %'], 0, [W.s626], { vast: true }),
        nr('pp-6', 'Op 1 van elke 4 plaatsen in de trein zit iemand. Schrijf als breuk.', '1/4', [W.s626], { breuk: true }),
        nr('pp-7', '45 % = ?/100. Vul de teller in.', 45, [W.s632]),
      ],
    },
  },
  'w1-do3': {
    naam: 'Wat denkt de schrijver?', intro: 'Woordje leest graag columns. Een column is een korte tekst waarin de schrijver zegt wat hij denkt.',
    sets: {
      taalsleutels: [
        kz('wt-1', 'Woordtrein: welk woord hoor je?', ['huis', 'hees', 'hoos'], 0, ['1.2.AAN.2'], { zeg: 'huis', groot: true }),
        kz('wt-2', 'Welk woord hoor je?', ['pet', 'piet', 'poot'], 0, ['1.2.AAN.3'], { zeg: 'pet', groot: true }),
        kz('wt-3', 'Welk woord hoor je?', ['mooi', 'moe', 'mei'], 0, ['1.2.AAN.4'], { zeg: 'mooi', groot: true }),
        kz('wt-4', 'Welk woord hoor je?', ['kam', 'kaam', 'kom'], 0, ['1.2.AAN.3'], { zeg: 'kam', groot: true }),
        kz('wt-5', 'Welk woord hoor je?', ['leeuw', 'lui', 'lauw'], 0, ['1.2.AAN.4'], { zeg: 'leeuw', groot: true }),
        zi('wt-6', 'Leg de zin.', ['Ik', 'ben', 'Lin.', 'Mijn', 'naam', 'is', 'mooi.'], ['1.2.AAN.2'], { zeg: 'Ik ben Lin. Mijn naam is mooi.' }),
      ],
      kompas: [
        { id: 'nc-0', type: 'tekst', vraag: 'Lees de column van Nadia.', tekst: NADIA, goals: [] },
        kz('nc-1', 'Waarover gaat de column?', ['over de naam van Nadia', 'over de eerste schooldag', 'over het huis van oma'], 0, ['1.2.GL4.19'], { context: NADIA.slice(1) }),
        kz('nc-2', 'Wat denkt Nadia over haar naam?', ['Ze vindt hem alleen lastig.', 'Ze is er alleen fier op.', 'Allebei, maar vooral fier.'], 2, ['1.2.GL4.19'], { vast: true, context: NADIA.slice(1) }),
        kz('nc-3', 'Klik het citaat dat toont dat Nadia fier is op haar naam.', ["'En ik blijf Nadia.'", "'Mijn oma koos hem.'", "'Nadja. Nadie. Nadine.'", "'Soms vind ik dat lastig.'"], 0, ['1.2.GL4.19'], { context: NADIA.slice(1) }),
        so('nc-4', 'Positief of negatief? Sorteer de woorden uit de tekst.', ['positief (groen)', 'negatief (rood)'], [['fier', 0], ['cadeau', 0], ['mooi', 0], ['verkeerd', 1], ['lastig', 1], ['boos', 1]], ['1.2.GL4.19']),
        kz('nc-5', 'Waarom is de laatste zin belangrijk?', ['Hij toont dat Nadia trots blijft op haar naam.', 'Hij vertelt hoe oud Nadia is.', 'Hij toont dat Nadia haar naam wil veranderen.'], 0, ['1.2.GL4.19'], { context: NADIA.slice(4) }),
      ],
      telescoop: [
        ko('tm-1', 'Tekstdoel-match: koppel het fragment aan het doel.', [
          ['Noor betekent licht in het Arabisch.', 'informeren'], ["Geef iedereen een naamkaartje: zo leert de hele klas elkaars naam!", 'overtuigen'],
          ['Schrijf je naam. Versier een letter. Hang het kaartje op.', 'instrueren'], ['Op een ochtend vond Bogdan een oude brief van zijn opa ...', 'vertellen']], ['1.2.GL6.14']),
        ko('tm-2', 'Nog vier fragmenten.', [
          ['In onze school worden 23 talen gesproken.', 'informeren'], ['Zeg een naam altijd zoals de persoon zelf hem zegt. Dat is respect!', 'overtuigen'],
          ['Vraag: hoe spreek je je naam uit? Luister. Zeg hem na.', 'instrueren'], ['Nadia stond op het perron en hoorde haar naam roepen ...', 'vertellen']], ['1.2.GL6.14']),
        kz('tm-3', 'Je kent de betekenis van je eigen naam. Bij welke tekst kan je die kennis gebruiken?', ['een tekst over namen en betekenissen', 'een tekst over treinen', 'een recept'], 0, ['1.2.GL6.7']),
        kz('tm-4', "Tekst A zegt: 'Sofia betekent wijsheid.' Je weet dat 'filosofie' liefde voor wijsheid betekent. Welk verband leg je?", ['Beide woorden hebben een deel dat wijsheid betekent.', 'Er is geen verband.', 'Sofia is een filosoof.'], 0, ['1.2.GL6.7']),
      ],
    },
  },
  'w1-do4': {
    naam: 'De fluisteringen', intro: "Atlas en Bram fluisteren: 'De Mist probeert ons te verdelen. Open de sloten en ontmasker zijn fluisteringen.'",
    sets: {
      kompas: [
        ko('fl-k0', 'Begrippenkaarten: koppel het begrip aan de uitleg.', [['diversiteit', 'er zijn veel verschillen tussen mensen, en dat is normaal'], ['discriminatie', 'iemand slechter behandelen omdat hij anders is'], ['racisme', 'iemand slechter behandelen omdat hij een andere huidskleur of afkomst heeft']], ['9-3.4.GL4.2']),
        so('fl-k1', 'Slot 1: sorteer de situaties.', ['diversiteit', 'discriminatie', 'racisme'], [
          ['In onze klas worden 11 talen gesproken.', 0], ['Sami eet halal en Lotte eet vegetarisch.', 0],
          ['Een meisje mag niet bij de voetbalploeg omdat ze een meisje is.', 1], ['Een huisbaas verhuurt niet aan mensen met een buitenlandse naam.', 1],
          ['Een cafe laat iemand niet binnen omdat hij zwart is.', 2], ["Op de speelplaats roept iemand: 'Ga terug naar je land.'", 2],
        ], ['9-3.4.GL4.1']),
        kz('fl-k2', 'Slot 2: Malik wordt elke dag uitgelachen om zijn naam. Wat doet dat met hem? (meer antwoorden)', ['Hij voelt zich alleen.', 'Hij durft niet meer te spreken.', 'Hij wil niet meer naar school.', 'Hij gaat minder goed leren.', 'Hij vindt het grappig.', 'Het doet hem niets.'], [0, 1, 2, 3], ['9-3.4.GL4.7'], { vast: true }),
        kz('fl-k3', 'Iemand wordt uitgelachen om zijn huidskleur. Hoe heet dat?', ['racisme', 'diversiteit', 'een grap'], 0, ['9-3.4.GL4.2', '9-3.4.GL4.1']),
        ty('fl-k4', "Laatste slot: vul de tegenfluistering aan. 'Anders is ...'", ['rijk'], [], { uitleg: 'Anders is rijk. Iedereen hoort erbij.' }),
      ],
      telescoop: [
        vo('fl-t1', 'Slot 3: hoe ontstaat discriminatie? Zet de stappen in volgorde.', ["Een vooroordeel: 'Nieuwkomers zijn niet slim.'", 'Woorden: iemand zegt het of zet het online.', 'Daden: iemand wordt niet gekozen voor de groep.', 'Schade: die persoon voelt zich buitengesloten.'], ['9-3.4.GL6.6']),
        kz('fl-t2', 'Juf denkt dat Yara het rekenwerk niet zal snappen omdat ze nog maar een jaar Nederlands leert. Wat doet dat vooroordeel?', ['Yara krijgt minder kansen om te tonen wat ze kan.', 'Yara leert er sneller door.', 'Het heeft geen gevolgen.'], 0, ['9-3.4.GL6.5']),
        kz('fl-t3', "In een groepje zegt iemand: 'Laat hem niet meedoen, hij spreekt raar.' Wat gebeurt er in de groep?", ['Iemand wordt buitengesloten door een vooroordeel.', 'De groep werkt beter samen.', 'Er gebeurt niets.'], 0, ['9-3.4.GL6.5']),
        kz('fl-t4', "Slot 4: onder een filmpje schrijft iemand: 'Die mensen horen hier niet.' Wat is dat?", ['discriminatie online', 'een gewone mening zonder probleem', 'een grap'], 0, ['9-3.4.GL6.7']),
        kz('fl-t5', 'Wat kan je doen als je online haatberichten ziet? (meer antwoorden)', ['het bericht melden', 'het niet doorsturen', 'een volwassene vertellen', 'een even gemene reactie schrijven'], [0, 1, 2], ['9-3.4.GL6.7'], { vast: true }),
        kz('fl-t6', 'Een foto wordt online zo geknipt dat een groep mensen er eng uitziet. Wat doet dat?', ['Het versterkt vooroordelen.', 'Het is gewoon nieuws.', 'Het maakt mensen gelijkwaardig.'], 0, ['9-3.4.GL6.7', '9-3.4.GL6.6']),
        ty('fl-t7', "Laatste slot: vul de tegenfluistering aan. 'Anders is ...'", ['rijk'], [], { uitleg: 'Anders is rijk. Iedereen hoort erbij.' }),
      ],
    },
  },
  'w1-do5': {
    naam: 'Muziekperron', intro: 'Biep, biep, bliep! Byte speelt muziek op het perron. Luister met je koptelefoon.',
    sets: {
      kompas: [
        kz('mp-k1', 'Luister. Speelt er een stem (solo) of spelen er veel stemmen samen (groep)?', ['solo', 'groep'], 0, ['6.2.GL4.3'], { vast: true, geluid: { soort: 'solo', stijl: 'rustig', seed: 3 } }),
        kz('mp-k2', 'Luister. Solo of groep?', ['solo', 'groep'], 1, ['6.2.GL4.3'], { vast: true, geluid: { soort: 'groep', stijl: 'rustig', seed: 7 } }),
        kz('mp-k3', 'Luister. Solo of groep?', ['solo', 'groep'], 1, ['6.2.GL4.3'], { vast: true, geluid: { soort: 'groep', stijl: 'wals', seed: 11 } }),
        kz('mp-k4', 'Luister. Solo of groep?', ['solo', 'groep'], 0, ['6.2.GL4.3'], { vast: true, geluid: { soort: 'solo', stijl: 'dans', seed: 5 } }),
        kz('mp-k5', 'Luister. Solo of groep?', ['solo', 'groep'], 0, ['6.2.GL4.3'], { vast: true, geluid: { soort: 'solo', stijl: 'mars', seed: 9 } }),
        kz('mp-k6', 'Luister. Solo of groep?', ['solo', 'groep'], 1, ['6.2.GL4.3'], { vast: true, geluid: { soort: 'groep', stijl: 'dans', seed: 2 } }),
        kz('mp-k7', 'Wat is een solo?', ['Een persoon zingt of speelt alleen.', 'Iedereen zingt samen.', 'Een lied zonder melodie.'], 0, ['6.2.GL4.3']),
      ],
      telescoop: [
        ko('mp-t1', 'Koppel de muziekstijl aan het kenmerk.', [['wals', 'telt in drie: 1-2-3, 1-2-3'], ['mars', 'stevig ritme in twee: links-rechts'], ['slaaplied', 'zacht en traag'], ['jazz', 'swingend ritme en improviseren'], ['dansmuziek', 'snel, met een sterke beat']], ['6.2.GL6.2']),
        kz('mp-t2', 'Luister. Welke stijl past het best?', ['wals', 'slaaplied', 'dansmuziek', 'mars'], 0, ['6.2.GL6.2'], { vast: true, geluid: { soort: 'groep', stijl: 'wals', seed: 4 } }),
        kz('mp-t3', 'Luister. Welke stijl past het best?', ['wals', 'slaaplied', 'dansmuziek', 'mars'], 2, ['6.2.GL6.2'], { vast: true, geluid: { soort: 'groep', stijl: 'dans', seed: 8 } }),
        kz('mp-t4', 'Luister. Welke stijl past het best?', ['wals', 'slaaplied', 'dansmuziek', 'mars'], 1, ['6.2.GL6.2'], { vast: true, geluid: { soort: 'solo', stijl: 'rustig', seed: 6 } }),
        kz('mp-t5', 'Luister. Welke stijl past het best?', ['wals', 'slaaplied', 'dansmuziek', 'mars'], 3, ['6.2.GL6.2'], { vast: true, geluid: { soort: 'groep', stijl: 'mars', seed: 12 } }),
        kz('mp-t6', 'Welke stijl hoort bij improviseren?', ['jazz', 'wals', 'slaaplied'], 0, ['6.2.GL6.2']),
      ],
    },
  },

  // ===================== VRIJDAG =====================
  'w1-vr2': {
    soort: 'raid', naam: 'Raid: de Mist-golem', intro: 'De Mist-golem komt eraan! Oefen hier alleen, of doe mee aan de klasraid op het digibord.',
    sets: { kompas: raidSet('kompas', 'oefen-k', 8), telescoop: raidSet('telescoop', 'oefen-t', 8) },
  },
  'w1-vr3': {
    naam: 'Leesfeest', intro: 'Feest in de wachtzaal! Vandaag lezen we ons eerste Klets!-boekje.',
    sets: {
      taalsleutels: [
        { id: 'lf-0', type: 'tekst', vraag: 'Lees met Woordje: mijn eerste Klets!-boekje.', tekst: BOEKJE, goals: [] },
        vo('lf-1', 'Zet de zinnen in de volgorde van het boekje.', ['Ik ben Lin.', 'Ik ben nieuw.', 'De haai is nieuw.'], ['1.2.AAN.1']),
        kz('lf-2', 'Wie is moe?', ['de kraai', 'de haai', 'de koe'], 0, ['1.2.AAN.4'], { context: BOEKJE.slice(2, 5) }),
        kz('lf-3', 'Waar zit de koe?', ['in de sneeuw', 'in de kooi', 'in de bus'], 0, ['1.2.AAN.4'], { context: BOEKJE.slice(4, 5) }),
        kz('lf-4', 'Welk woord hoor je?', ['sneeuw', 'snee', 'snauw'], 0, ['1.2.AAN.4'], { zeg: 'sneeuw', groot: true }),
        kz('lf-5', 'Welk woord hoor je?', ['nieuw', 'nu', 'neef'], 0, ['1.2.AAN.2'], { zeg: 'nieuw', groot: true }),
        zi('lf-6', 'Leg de zin.', ['Ik', 'ben', 'nieuw.'], ['1.2.AAN.3'], { zeg: 'Ik ben nieuw.' }),
      ],
      kompas: [
        { id: 'lk-0', type: 'tekst', vraag: 'Leestimer: lees 20 minuten in je boek.', timer: 20, goals: [] },
        kz('lk-1', 'Je leest 20 minuten. Na 12 minuten wil je stoppen. Wat helpt?', ['Een leesbladwijzer-pauze en dan verder lezen', 'Een ander boek pakken', 'Stoppen en tekenen'], 0, ['1.2.GL4.13']),
        kz('lk-2', "Hoe lees je 'smartphone'?", ['smaart-foon', 'smart-pho-ne', 'sm-ar-tfo-ne'], 0, ['1.2.GL4.7'], { vast: true }),
        kz('lk-3', "Hoe lees je 'computer'?", ['kom-pjoe-ter', 'kom-pu-ter', 'kom-poe-ter'], 0, ['1.2.GL4.7'], { vast: true }),
        kz('lk-4', "Hoe lees je 'cool'?", ['koel', 'kool', 'ko-ol'], 0, ['1.2.GL4.7'], { vast: true }),
      ],
      telescoop: [
        sp('w2-1', 'leesfeest', 'lees-feest', ['1.2.GL6.1']), sp('w2-2', 'boekenkast', 'boeken-kast', ['1.2.GL6.1']),
        sp('w2-3', 'treinkaartje', 'trein-kaartje', ['1.2.GL6.1']), sp('w2-4', 'voorleesboek', 'voor-lees-boek', ['1.2.GL6.1']),
        sp('w2-5', 'computerspel', 'computer-spel', ['1.2.GL6.1']), sp('w2-6', 'zonnebril', 'zonne-bril', ['1.2.GL6.1']),
        sp('w2-7', 'stationsplein', 'stations-plein', ['1.2.GL6.1']), sp('w2-8', 'vriendengroep', 'vrienden-groep', ['1.2.GL6.1']),
        sp('w2-9', 'sneeuwpop', 'sneeuw-pop', ['1.2.GL6.1']), sp('w2-10', 'smartphonehoesje', 'smartphone-hoesje', ['1.2.GL6.1']),
      ],
    },
  },
  'w1-vr4': {
    naam: 'De eerste bladzijde van de welkomstgids', intro: 'Atlas hier. De volgende nieuwkomer weet nog niets. Wij weten al veel. Samen maken we een gids.',
    sets: {
      kompas: [
        so('wg-k1', 'Welke laag van de ui is het?', ['wat je ziet', 'wat ik doe', 'wat ik spreek'], [['lange krullen', 0], ['draagt een bril', 0], ['speelt basketbal', 1], ['zingt in een koor', 1], ['spreekt Turks en Nederlands', 2], ['kent gebarentaal', 2]], ['9-3.4.GL4.3']),
        kz('wg-k2', 'Welke zin past het best in de welkomstgids?', ['Wij zijn niet alleen nieuwkomers. Wij zijn ook voetballers, tekenaars, grote zussen en taalkampioenen.', 'Wij zijn de nieuwkomers.', 'Iedereen in onze klas is hetzelfde.'], 0, ['9-3.4.GL4.4']),
        kz('wg-k3', 'Kan een persoon tegelijk zus, voetballer en taalkampioen zijn?', ['ja', 'nee'], 0, ['9-3.4.GL4.3'], { vast: true }),
        { id: 'wg-k4', type: 'upload', vraag: 'Upload een foto van jullie groepspagina.', map: 'Welkomstgids', titel: 'Groepspagina welkomstgids', optioneel: true, goals: [] },
      ],
      telescoop: [
        ko('vs-1', 'Vlaamse symbolen: koppel het symbool aan de uitleg.', [['vlag', 'een zwarte leeuw op een gele achtergrond'], ['feestdag', '11 juli'], ['volkslied', 'De Vlaamse Leeuw'], ['wapenschild', 'een schild met een leeuw met rode tong en klauwen'], ['memoriaal', 'de IJzertoren: een plek om te herdenken']], ['9-3.4.GL6.2']),
        kz('vs-2', 'Welke dag is de feestdag van de Vlaamse Gemeenschap?', ['11 juli', '21 juli', '1 mei', '15 augustus'], 0, ['9-3.4.GL6.2'], { vast: true }),
        kz('vs-3', "Wat is een memoriaal?", ['een plek om samen te herdenken', 'een feestzaal', 'een museum voor kunst'], 0, ['9-3.4.GL6.2']),
        kz('vs-4', 'Vandaag spreken mensen in Vlaanderen meer dan 100 talen. Wat zegt dat over de Vlaamse identiteit?', ['Ze heeft lagen en verandert.', 'Ze is altijd dezelfde gebleven.', 'Ze hoort maar bij een taal.'], 0, ['9-3.4.GL6.8']),
        kz('vs-5', 'Kan je Vlaming zijn en ook een andere taal of cultuur meedragen?', ['ja, dat kan tegelijk', 'nee, je moet kiezen'], 0, ['9-3.4.GL6.8'], { vast: true }),
        { id: 'vs-6', type: 'upload', vraag: 'Upload een foto van jullie groepspagina.', map: 'Welkomstgids', titel: 'Groepspagina welkomstgids', optioneel: true, goals: [] },
      ],
    },
  },
  'w1-vr5': {
    naam: 'Vredesbouwers', intro: 'Bram steekt een kaars aan. Mensen bouwen bruggen van vrede. Waarom doen ze dat?',
    sets: {
      kompas: [
        ko('vb-1', 'Koppel de getuige aan wat hij of zij deed voor vrede.', [['Martin Luther King', 'kwam op voor gelijke rechten voor zwarte en witte mensen'], ['Franciscus', "bad: 'Waar haat is, laat mij liefde brengen'"], ['Damiaan', 'zorgde voor zieken die alleen waren'], ['de buurvrouw', 'bracht de buren in haar straat samen']], ['11.5.GL4.2']),
        kz('vb-2', 'Waarom deed Martin Luther King het? Kies de beweegreden.', ['verontwaardiging over oneerlijke regels en hoop op een droom', 'verveling', 'hij moest van iemand'], 0, ['11.5.GL4.2']),
        kz('vb-3', 'Waarom zorgde Damiaan voor de zieken?', ['verlangen: niemand mocht alleen ziek zijn', 'hij wou beroemd worden', 'het was zijn hobby'], 0, ['11.5.GL4.2']),
        kz('vb-4', 'Wat betekent hoop?', ['geloven dat het beter kan', 'heel boos zijn', 'niets doen'], 0, ['11.5.GL4.2']),
        kz('vb-5', 'De herders van Abraham en Lot maken ruzie. Wat doet Abraham?', ['Hij laat Lot eerst kiezen waar hij wil wonen.', 'Hij jaagt Lot weg.', 'Hij doet alsof er niets is.'], 0, ['11.5.GL4.3']),
        kz('vb-6', 'Welke stappen helpen bij ruzie op de speelplaats? (meer antwoorden)', ['even weggaan en ademen', 'zeggen wat je voelt', 'luisteren naar de ander', 'een volwassene vragen', 'terugduwen', 'hard roepen'], [0, 1, 2, 3], ['11.5.GL4.3'], { vast: true }),
      ],
    },
  },
  'w1-vr7': { soort: 'overzicht', naam: 'Mijn week', intro: 'Kroniek kijkt met je terug op de week.' },
};
