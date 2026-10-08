# Vagant - webapp (versie 3)

De klasapp van **Vagant**, de methode wereldoriëntatie voor een 6de leerjaar met gewezen anderstalige nieuwkomers.
*Vaganten* waren middeleeuwse rondtrekkende studenten die van stad tot stad reisden om te leren.
De leerlingen heten **Reizigers**: ze reizen door zeven thema's, en elk thema heeft zijn eigen **3D-stad** die ze samen weer opbouwen.

| Thema | Stad | Inhoud |
|---|---|---|
| 1. Waterwereld | **Zwinvliet** | volledig uitgewerkt (vijf weken, labo's, eindbaas) |
| 2. Energie en Machines | Raderburg | binnenkort |
| 3. Reizen en Grenzen | Windroos | binnenkort |
| 4. Het Brein en het Beest | Hartwoud | binnenkort |
| 5. De Bouwplaats | Torenwerf | binnenkort |
| 6. Signalen en Schermen | Echostad | binnenkort |
| 7. De Stemmenparade | Vrijmarkt | binnenkort |

**Zwinvliet** is een Venetië van het Noorden met Brugse elementen: reien met kaaien en bruggen, het Minnewater met zwanen,
de Markt met het Belfort, trapgevels, een haven met vuurtoren en de sluis van Zeebrugge, en een waterval aan de stadsrand.
Het water is in het begin vol slijk van de eindbaas **De Slijkkraak**; elk labo dat de klas haalt, maakt één zone weer helder.

- Geen build-stap, geen installatie: gewone HTML, CSS en ES-modules. Eén meegeleverde bibliotheek: **three.js** (3D), lokaal in `vendor/` (zie *Licenties*).
- Geen externe lettertypes, geen CDN. Eén netwerkverzoek: het **echte weer van Brugge** bij Open-Meteo. Zonder internet valt de app terug op rustig seizoensweer.
- Werkt op elke statische server (ook GitHub Pages).
- Alle tekst in het Vlaams-Nederlands.

## Snel starten (lokaal)

ES-modules werken niet via `file://`. Start daarom een kleine webserver in deze map:

```bash
python3 -m http.server 8000
```

Open daarna:

| Pagina | Voor wie | Adres |
|---|---|---|
| `index.html` | leerlingen (de 3D-themastad) | http://localhost:8000/ |
| `leerkracht.html` | leerkrachtendashboard | http://localhost:8000/leerkracht.html |
| `digibord.html` | de stad en de eindbaas op het digibord | http://localhost:8000/digibord.html |

**Standaard-PIN van de leerkracht: `1234`.** Verander hem meteen bij *Dashboard > Instellingen > PIN*.

Tip om alles te verkennen: open het dashboard, ga naar *Instellingen > Demodata maken* (8 voorbeeldreizigers met resultaten en labo's),
en klik bovenaan op *Open de stad als leerkracht*.

### Handige adressen (demonstreren en testen)

| Adres | Wat |
|---|---|
| `?weer=regen` | ook `sneeuw`, `zon`, `mist`, `storm`, `bewolkt`, `fout` (doet alsof er geen internet is) |
| `?datum=2026-12-18` | doet alsof het die dag is: seizoen, kerstmarkt, dag of nacht (standaard 12:00 in Brugge) |
| `?uur=22:30` | doet alsof het dat uur is in Brugge (nacht, schemering, dag); te combineren met `?datum=` |
| `?verhaal=w3start` | toont een stap van het verhaal in de stad zonder de echte voortgang te wijzigen: `w1start`, `w1labo1`, `w1labo2`, `w1raid`, ... `w4raid`, `w5start`, `w5labo1`, `w5labo2`, `eindbaas`, `gewonnen` (ook `start`, `week3`, `raid`, `einde`) |
| `?voortgang=0.5` | hetzelfde als een getal van 0 (begin) tot 1 (gewonnen) |
| `?webgl=0` | de 2D-terugvalkaart |
| `?kwaliteit=hoog\|laag\|auto` | grafische kwaliteit |
| `?leerkracht=1` | de stad als leerkracht (alles open) |
| `index.html?preview=labo:waterkringloop` | één labo of missie bekijken zonder te bewaren (`&route=telescoop`) |

### De eindbaas uitproberen op één computer

1. Open `digibord.html` (PIN 1234) en klik op *Toon De Slijkkraak*, daarna op *Open de eindbaas*.
2. Open `index.html` in een ander tabblad van **dezelfde browser** en meld je aan als reiziger.
3. Op de laptop verschijnt een balk *De eindbaas komt* met de knop *Doe mee*. Klik op het digibord op *Start*.
4. Elk juist antwoord spuit een straal proper water op het monster. Het digibord toont alleen het aantal treffers van de klas, nooit wie fout antwoordde.
5. Na de overwinning wordt al het water helder en zwemmen de zwanen terug.

## Publiceren via GitHub Pages

```bash
git remote add origin https://github.com/meesterJorn/Klets-.git
git push -u origin main
```

Daarna op GitHub: *Settings > Pages > Source: Deploy from a branch*, `main` en map `/ (root)`.
Alle paden zijn relatief, dus de app werkt ook in een submap. `.nojekyll` zorgt dat GitHub de bestanden ongewijzigd serveert.

## Wat zit erin

### Voor de reizigers (`index.html`)
- **Aanmelden** met een voornaam of bijnaam en een zelfgemaakte 3D-reiziger. De creator heeft vier tabbladen:
  *Gezicht* (huidkleur, vorm van het gezicht, ogen, wenkbrauwen, mond), *Haar* (kapsels en hoofddoeken met voorbeeldje, haar- of stofkleur),
  *Kleren* (jas, broek, schoenen en hun kleuren) en *Extra* (wat je in de codekluis en in de labo's vrijspeelde).
  Met *Verras me* krijg je in één klik een willekeurige reiziger; het voorbeeld draait mee en je kan het rondslepen. Geen e-mail, geen wachtwoord.
- **De themastad in 3D**: een low-poly stad schuin van bovenaf, zoals in een stadsbouwspel.
  Slepen = schuiven, scrollen of knijpen = zoomen, rechtermuisknop (of Shift + slepen, of de pijlknoppen) = draaien.
  Met het toetsenbord: pijltjes of WASD/ZQSD schuiven, Q en E draaien, + en - zoomen.
  Levend: paardenkarren, koetsen, ruiters, handkarren en wandelaars op de kasseien, een stoomtrein die aan de stadsrand tussen twee tunnels door het oude station rijdt,
  rondvaartboten, koggen, slijkschuiten en zwanen op de reien, de zes gidsen met elk hun eigen manier van wachten (Atlas tuurt rond, Woordje zwaait veel, Byte staat te wiebelen),
  wuivende bomen, wolken, meeuwen en een tilt-shift-look.
- **Middeleeuws Brugge**: kasseiwegen met lantaarns en fakkels, een stadsmuur met de Gentpoort, Smedenpoort, Ezelpoort en Kruispoort,
  standerdmolens op de wallen, trapgevels, vakwerk, steile daken met schouwen en luiken, kerken met torenspitsen en een hoog Belfort.
- **Brugge in de stad**: een Venetië van het Noorden. Een ringvaart (de vesten) met vier binnenreien, het Minnewater en
  via de sluis een verbinding met de haven en de zee; bakstenen kaaimuren met kaaitrappen, trapgevelhuizen pal aan het water
  (de Rozenhoedkaai), kleine stenen boogbruggen waar een weg over het water gaat, rondvaartboten, zwanen en eenden.
  De Markt is een open plein met het Belfort, een fontein, terrassen en een kring trapgevels. Het station ligt aan de zuidrand.
  Verder de haven met kranen en vuurtoren, de sluis van Zeebrugge, een getrapte stenen waterval met een watermolen
  (het rad draait, het water is een shader: bruin-groen als het vuil is, blauw als de klas het proper kreeg) en in december een kerstmarkt met schaatsbaan.
- **Drie geheimen** (enkel in de 3D-stad van de reizigers): een zwarte kat op een dak aan de westkant van de Markt, een gouden kikker
  op een waterlelie bij de brug over de noordelijke rei, en Rat Remi die vist aan de binnenkant van de stadsmuur vlak bij de Ezelpoort.
  Ze fonkelen af en toe. Wie er een aanklikt, speelt een kort spelletje (Klokkenluider van het Belfort, Reienrace, Rat Remi vist).
  Geen XP: de knop "Geheimen n/3" houdt bij wat je vond en je beste score; wie alle drie vindt, krijgt een paarse jas in de Codekluis.
- **Het echte weer van Brugge** (Open-Meteo, 51.21 N 3.22 O, elk kwartier vernieuwd en lokaal bewaard): regen, motregen, sneeuw met sneeuwdek,
  mist, onweer, wind die de bomen, de vlaggen en de windvaan op het Belfort meeneemt, en zon of wolken die het licht kleuren.
  Het weerknopje rechtsboven toont de temperatuur en de windstreek. Zonder internet (of achter een schoolfirewall) komt er één waarschuwing in de console
  en gebruikt de stad rustig weer dat bij het seizoen past.
- **Het echte seizoen**: lente (bloesem), zomer, herfst (kleuren en vallende blaadjes) en winter (kale bomen, sneeuwdek, kerstmarkt in december).
- **Proper water**: de bovenbalk toont hoeveel procent van het water helder is. De zes waterzones (Rozenhoedkaai, Scheepswerf, Minnewater,
  de rei naar de haven, de haven en de sluis, de fontein en de waterval) worden één voor één blauw terwijl de klas de labo's haalt.
- **Gebouwen binnengaan**: elk themagebouw (Weerstation op het Belfort, Scheepswerf, Waterlabo, Sluis van Zeebrugge, Werkplaats, Proefkeuken)
  heeft een interieur met werkbanken. Per labo:
  - **filmpje**: een korte getekende animatie met de gids erbij (play, pauze, hoofdstukken, voorleesknop);
  - **simulatie**: zelf doen (waterkringloop, drijven of zinken, het voedselweb, eb en vloed, de sluis programmeren, een waterfilter bouwen),
    met opdrachten per route;
  - **weerdata** (in het Weerstation): tabellen en grafieken met het echte weer van vandaag;
  - **test**: een automatisch verbeterde toets. Vanaf 70 % juist is het labo geslaagd; haalt de helft van de klas dat, dan wordt de waterzone helder.
- **Missiebord**: alle missies van de week per dag, plus "wanneer je wil". Latere weken staan op slot tot de leerkracht ze openzet (met een vriendelijke uitleg, geen slot).
- **Gidsen**: de zes gidsen (Atlas, Kroniek, Tella, Byte, Bram, Woordje) staan links en spreken je aan in een ballon; een oranje cijfer = nieuwe missies.
- **Kaartlagen**: *Doelen: sterk en zwak*, *Wijken*, *Mijn bijdrage*, en *Proper water*. Nooit namen, nooit een rangschikking.
- **Mijn huis**, **Codekluis** (geheime codes uit het papieren Logboek), **Klasstad-overzicht**, **De Poort** (de zeven thema's en de rangen) en het **weekverhaal** met voorleesknop.
- **De eindbaas**: als de leerkracht hem opent, verschijnt *Doe mee*. Elke reiziger krijgt vragen op zijn eigen route.

### Missies, labo's en oefentypes
Elk item draagt doelcodes; elk resultaat wordt per doelcode bewaard.

| type | wat | gescoord |
|---|---|---|
| `keuze` | meerkeuze (ook meerdere juist, met luisterknop) | 1 punt |
| `volgorde` | slepen in de juiste volgorde, met pijltjes als alternatief | 1 punt |
| `koppel` | paren koppelen | 1 punt per paar |
| `typ` | antwoord typen, tolerant (hoofdletters, accenten); "bijna" bij 1 letter verschil | 1 punt |
| `getal` | getal typen: `10 000`, `3,5`, `-7`, breuken | 1 punt |
| `kaart` | klikken op een kaart: getallenas, wereldkaart (continenten, oceanen, evenaar), vrije regio's | 1 punt |
| `zin` | zinnenbouwer met woord- of lettertegels | 1 punt |
| `sorteer` | kaartjes in bakken sorteren | 1 punt per kaartje |
| `splits` | woordensplitser | 1 punt |
| `typen` | typetraining met nauwkeurigheid en tempo | 1 punt |
| `upload` | foto opladen naar de klasgalerij | niet gescoord |
| `tekst` | leestekst, optioneel met leestimer | niet gescoord |

Elk item heeft een knop *Lees voor* (spraak van de browser). Feedback is altijd vriendelijk: groen voor juist, oranje voor "nog niet" (nooit rood), met het juiste antwoord erbij.
Een doel is **behaald** vanaf 70 % juist in een poging (`BEHAALD_GRENS` in `js/config.js`). Lager = **Revanche**.

XP: 10 per juist antwoord, +20 de eerste keer; bij opnieuw spelen enkel XP voor verbetering. Code +25, eindbaas 10 per juist antwoord en +50 bij winst.
Rangen: Reiziger 0, Verkenner 500, Spoorzoeker 1500, Kaartmaker 3000, Gids 5000, Vagant 8000.

### Voor de leerkracht (`leerkracht.html`, PIN)
Bovenaan kiest de leerkracht het **thema** en de **week**; alle tabbladen volgen die keuze.
- **Overzicht**: klascijfers, proper water, *Alles open*, de eindbaas starten, CSV-export.
- **Reizigers en routes**: per reiziger en per domein (Aardrijkskunde, Geschiedenis, Wetenschap, Techniek en ICT, Hart, Onderzoek) de route kiezen: **Kompas** (doelen 4de leerjaar) of **Telescoop** (doelen 6de leerjaar).
- **Doelen**: matrix doelcode x reiziger (beste poging in %), per week en per route, met de doelomschrijving uit de handleiding.
- **Revanche**: per doel wie het nog niet behaalde en wie het nog niet oefende, met een knop *Oefen opnieuw* die de oefening meteen opent.
- **Weekoverzicht**: alle lessen per dag met doelen per route, de webapp-opdracht en de Logboekcode. Per missie knoppen om ze te bekijken zoals een reiziger op die route (voorbeeldmodus, er wordt niets bewaard).
- **Labo's en water**: de zes waterzones met hun percentage, een tabel met alle labo's (gebouw, gids, werkbanken, hoeveel reizigers geslaagd zijn, wat er hersteld wordt) en de themakledij.
- **Eindbaas**: De Slijkkraak, zijn verhaal, de raidvragen en de individuele toets, met voorbeeldknoppen per route.
- **Geheime codes**: alle codes uit het Logboek, de beloning en hoeveel reizigers ze vonden.
- **Instellingen**: thema, week, alles open, dag/nacht, mistdoel, naam van de stad, PIN, export CSV en JSON, import (samenvoegen), demodata, alles wissen.

### Digibord (`digibord.html`, PIN)
Twee weergaven (knop *Toon de stad* / *Toon De Slijkkraak*, of rechtstreeks `digibord.html?view=stad`):
- **Stad**: de themastad op groot scherm, langzaam draaiend, met het weer van vandaag in woorden, het percentage proper water,
  de zes zones, de wijken en de gebouwen. Klik op een plek voor het kaartje.
- **De Slijkkraak**: een grote inktvis van slijk met tentakels boven de Brugse skyline, met HP-balk. HP automatisch (8 per deelnemer) of zelf gekozen.
  Bij elke treffer spuit een straal proper water en krimpt het monster; bij 0 HP klaart het water op en vliegen de zwanen terug ("Het water is helder!").
  Er worden geen namen getoond en foute antwoorden worden niet eens doorgestuurd.

## Architectuur

```
  index.html, leerkracht.html, digibord.html
  css/klets.css              basisstijl (aanmelden, creator, panelen, oefeningen)
  css/stad.css               de stad: werkbalk, bovenbalk, gidsen, infokaart, markers, labo's, telefoonweergave
  css/leerkracht.css         dashboard en digibord
  vendor/three.module.min.js three.js r170 (MIT), lokaal meegeleverd
  vendor/three-LICENSE.txt   licentie van three.js
  data/themas.js             de zeven thema's en hun steden; themaVoor(settings)
  data/thema-waterwereld.js  thema 1: verhaal, weken, doelen, gebouwen, labo's (filmpje, simulatie, test), eindbaas, uitrusting, codes
  data/waterwereld-inhoud.js doelen, weekverhalen, codes en toetsvragen uit de handleiding (gemaakt door het script hieronder)
  tools/afleiden_waterwereld.py  zet de lesbestanden (week1.json ...) om naar data/waterwereld-inhoud.js
  tools/valideer-stad.mjs    controleert de plattegrond met node (wegen, kavels, water, bruggen, spoor): node tools/valideer-stad.mjs
  js/config.js               domeinen, routes, gidsen, rangen, XP, keuze van de backend
  js/core/util.js            DOM-helper, normalisatie, getallen lezen, spraak, klank
  js/core/store.js           opslaglaag: LocalStore (localStorage) + SupabaseStore (stub)
  js/core/sync.js            live-laag: LocalSync (BroadcastChannel) + SupabaseSync (stub)
  js/core/model.js           themacatalogus, routes, XP/rangen, doelen per reiziger, codes, uitrusting
  js/city/layout.js          plattegrond: ringen, lanen, spoor, wijken, kavels, plein, het waternet (vesten, reien, Minnewater, haven), huizen aan het water
  js/city/brugge.js          de Brugse plekken: Markt en Belfort, Rozenhoedkaai, Minnewater, haven, sluis, kerstmarkt
  js/city/water.js           van pogingen naar proper water: zones, drempels, waterTekst
  js/city/weer.js            het echte weer van Brugge (Open-Meteo), seizoen, kerstmarkt, terugval en cache
  js/city/wegen.js           wegennet als graaf (knopen, takken, overwegen), de bruggen en valideerStad()
  js/city/markers.js         labels en markers boven de stad: schuift ze uit elkaar zodat ze niet overlappen
  js/city/stadmodel.js       van pogingen naar een stad: gebouwen, niveaus, bouwplaatsen, mist, huizen, themagebouwen
  js/city/modellen.js        low-poly modellen in code (gebouwen, gidsgebouwen, huizen, station, stoomtrein, Belfort, middeleeuwse huizen met trapgevel of vakwerk ...)
  js/city/stad3d.js          de 3D-stad: licht, dag/nacht, mist, verkeer, bouwanimaties, kaartlagen, camera, tilt-shift
  js/city/wegen3d.js         kasseiwegen, kruispunten, overwegen, lantaarns, paardenkarren, koetsen, ruiters, handkarren en wandelaars
  js/city/water3d.js         de reien, kaaien, bruggen, de waterval met watermolen, boten, zwanen en de slijklaag (shader)
  js/city/geheimen3d.js      de drie verstopte geheimen in de stad (kat, kikker, rat) en hun fonkeling
  js/spelletjes/             de spelletjes achter de geheimen: spelkader.js (venster, start- en eindscherm), teken.js, klokken.js, reienrace.js, visser.js
  js/city/weer3d.js          regen, sneeuw met sneeuwdek, mist, onweer, wind, seizoenskleuren en vallende blaadjes
  js/city/figuren3d.js       gidsen, reizigers en inwoners (één geometrie; elke gids wacht op zijn eigen manier)
  js/city/stad2d.js          terugvalkaart zonder WebGL (isometrisch canvas, zelfde methodes, met water, weer, hoogwater en De Slijkkraak)
  js/city/verhaal.js         het verhaal in de stad als zuivere logica: van labo's, week, codes en eindbaas naar hoogwater, slijkarmen en wat er per week verandert; ?verhaal-voorbeelden
  js/city/verhaal3d.js       het verhaal in 3D: hoogwater (shader met masker), afval, zandzakjes, roeiboten en de weekdingen (weerstation, masten, riet, sluis, bouwplaatsen, feest)
  js/city/slijkkraak3d.js    De Slijkkraak: kop met ogen die knipperen, ademen, wiegen, armen over bruggen en sluis, druppels en bellen; raid en verslaan
  js/core/stem.js            voorlezen: opnames uit audio/stem, anders de beste Vlaamse browserstem; knoppen, zinnen, altijd/op vraag/uit
  js/city/vaart.js           vaarroutes, bootmaten en de boog van de bruggen; controleerVaart(): geen boot door een brug of een kaaimuur
  js/city/tijd.js            de echte tijd in Brugge (Europe/Brussels) en de stand van de zon en de maan; ?uur= en ?datum=
  js/city/stad.js            kiest 3D of 2D, bewaart de kwaliteitskeuze
  js/figuren/uiterlijk.js    keuzes voor het uiterlijk (vier tabbladen), kleuren, willekeurigeLook()
  js/figuren/modellen.js     low-poly 3D-reizigers (kapsels, hoofddoeken, kosmetiek) en de zes gidsen
  js/figuren/portret.js      portretten uit de 3D-modellen en het draaiende voorbeeld
  js/figuren/figuren2d.js    getekende portretten als terugval zonder WebGL
  js/labo/labo.js            het labo: interieur, werkbanken, voortgang, test en beloning
  js/labo/interieur.js       de binnenkant van een themagebouw (3D-achtige tekening met werkbanken)
  js/labo/filmpje.js         de filmpjesspeler (scenes uit data, met gids, tekst en voorleesknop)
  js/labo/tekenen.js         de tekenelementen voor filmpjes en simulaties (zee, wolk, boot, sluis, vis ...)
  js/labo/weerdata.js        werkbank met het echte weer: tabel, grafiek en vragen
  js/labo/sims/*.js          de simulaties: waterkringloop, drijven, voedselweb, getij, sluis, waterfilter
  js/missions/types.js       de 12 oefentypes (data -> UI -> score), met de wereldkaart
  js/missions/engine.js      missievenster, verbetering, bewaren per doelcode, XP
  js/missions/raidbank.js    de vragen van de eindbaas (uit het thema, elke ronde in een andere volgorde)
  js/pupil/app.js            reizigersapp (stad, gidsen, werkbalk, infokaart, missies, labo's, codekluis, huis, eindbaas)
  js/pupil/iconen.js         lijn-iconen (SVG) voor de werkbalk
  js/teacher/dashboard.js    dashboard
  js/teacher/digibord.js     digibord: de stad en De Slijkkraak
```

**Twee verwisselbare lagen.** Alle schermen praten met een *store* en een *sync*, nooit rechtstreeks met localStorage of BroadcastChannel:

- `store` (async): `getSettings/saveSettings`, `listPupils/getPupil/savePupil/deletePupil`, `addAttempt/listAttempts`, `addGallery/listGallery`, `addEvent/listEvents`, `exportAll/importAll/reset`, `onChange`.
- `sync`: `connect()`, `publish(type, payload)`, `subscribe(type, handler)`, `close()`.

`BACKEND` in `js/config.js` kiest de implementatie (`'local'` nu, `'supabase'` later).

**Gegevens.**
- reiziger: `{ id, naam, look, routes: {Wetenschap: 'kompas', ...}, xp, codes[], kosmetiek[], uitrusting{} }`
- poging: `{ id, pid, missie, week, route, items: [{ id, goals[], goed, totaal }], goed, totaal, xp, ts, bron: 'missie'|'labo'|'raid' }`
  - een labotoets bewaart `missie: 'labo:<id>'` met `bron: 'missie'`; een werkbank bewaart `missie: 'labo:<id>:<station>'` met `bron: 'labo'`.
- gebeurtenis van de eindbaas: `{ soort: 'eindbaas', thema, baas, gewonnen: true }` - daarna is al het water helder.
- Doelstatus en proper water worden altijd berekend uit de pogingen (`model.doelStats`, `water.waterStand`), dus niets raakt uit sync.

**Protocol van de eindbaas** (via `sync`): digibord -> `raid:state {raidId, naam, status, hp, maxHp, deelnemers}` (elke 2 s);
laptop -> `raid:join {raidId, pid}`, `raid:hit {raidId, hid, pid}` (enkel bij een juist antwoord); `raid:vraag` vraagt de huidige toestand op.

## Het themaformaat

Een thema is één bestand `data/thema-<id>.js` dat één object exporteert, en één regel in `data/themas.js`.
Zo ziet dat object eruit (de volledige uitwerking staat in `data/thema-waterwereld.js`):

```js
export const WATERWERELD = {
  id: 'waterwereld', nr: 1, naam: 'Waterwereld', stad: 'Zwinvliet',
  ondertitel: 'Een Venetie van het Noorden', kleur: '#2f8fd6', gids: 'atlas',
  verhaal: { intro: '...', eind: '...' },
  weken: [ { week: 1, titel: 'De stad loopt onder', verhaal: '...' }, ... ],   // vijf weken

  doelen: { '4.2.GL4.1': { domein: 'Wetenschap', route: 'kompas', doel: 'De waterkringloop uitleggen.' }, ... },
  zones:  { 'reie-zuid': 'de reien aan de Rozenhoedkaai', minnewater: 'het Minnewater', ... },   // de stukken water

  gebouwen: {
    weerstation: { naam: 'Weerstation op het Belfort', kort: 'Weerstation', plek: 'belfort', gids: 'tella',
                   week: 1, labos: ['waterkringloop'], interieur: 'weerstation', uitleg: '...' }, ...
    // plek = een vaste plek in de stad (js/city/layout.js en js/city/brugge.js)
  },

  labos: {
    waterkringloop: {
      naam: 'De waterkringloop', gebouw: 'weerstation', week: 1, dag: 'dinsdag', gids: 'tella',
      domein: 'Wetenschap', uitleg: '...',
      stations: ['filmpje', 'weerdata', 'simulatie', 'test'],   // de werkbanken in het gebouw
      filmpje:   { titel: '...', scenes: [ { duur: 6, tekst: '...', gids: 'tella', zegt: '...',
                                             beeld: [ { t: 'zee' }, { t: 'wolk', x: 40, anim: { x: [40, 70] } } ] } ] },
      simulatie: { type: 'waterkringloop', opdrachten: { kompas: [ { id: 's1', tekst: '...', doelen: ['4.2.GL4.1'] } ],
                                                         telescoop: [ ... ] } },
      test:      { kompas: [ /* items zoals in js/missions/types.js */ ], telescoop: [ ... ] },
      herstel:   { zone: 'reie-zuid', tekst: 'Het water aan de Rozenhoedkaai wordt helder ...' },
      beloning:  { uitrusting: 'zuidwester' },
    }, ...
  },

  missies: [ { id: 'ww-1-welkom', week: 1, dag: 'maandag', naam: '...', gids: 'atlas',
               domein: 'Aardrijkskunde', intro: '...',
               sets: { kompas: [ items ], telescoop: [ items ] } }, ... ],

  eindbaas: { id: 'slijkkraak', naam: 'De Slijkkraak', week: 5, dag: 'vrijdag', gids: 'atlas',
              verhaal: '...', eind: 'Het water is helder!',
              raid: { vragen: { kompas: [ items ], telescoop: [ items ] } },   // digibord, elke ronde in een andere volgorde
              test: { kompas: [ items ], telescoop: [ items ] } },             // de individuele toets

  uitrusting: { zuidwester: { naam: 'Gele zuidwester', slot: 'hoofd', uitleg: '...' }, ... },
  codes: { 'WATERRAT': { week: 1, beloning: { xp: 25, uitrusting: 'zuidwester' }, waar: 'Expeditieboek week 1' }, ... },
};
```

Een item in `sets`, `test` of `raid.vragen` is een gewoon oefenitem uit `js/missions/types.js`, bijvoorbeeld:
`{ id: 'wk-1', type: 'keuze', vraag: '...', opties: ['...'], juist: 0, goals: ['4.2.GL4.1'] }`.
Ontbreekt een route, dan krijgt de reiziger de andere route. Een nieuw thema heeft verder niets nodig: de stad, de werkbalk,
het dashboard, het digibord en de eindbaas lezen alles uit dit object.

### De stad: hoe ze rekent
- `js/city/stadmodel.js` berekent alles uit de pogingen: per doelcode hoeveel reizigers het behaalden en hoeveel het oefenen.
  Een doel krijgt de eerstvolgende vrije kavel in de wijk van zijn domein, in de volgorde waarin de klas het voor het eerst oefende, dus gebouwen verspringen nooit.
  Niveau 0 tot 3 hangt af van het aandeel reizigers dat het doel haalde (25, 50, 75 %).
- `js/city/water.js` berekent het proper water: een zone wordt helder als de helft van de klas (naar boven afgerond) de test van het bijbehorende labo haalt (>= 70 %).
  Na de overwinning op de eindbaas is alles helder.
- Mist: de vrije straal groeit met de klas-XP (`mistDoel` per reiziger) en ligt nooit over iets wat je nodig hebt.
- `js/city/verhaal.js` maakt van dezelfde voortgang het verhaal in de stad. Week 1 begint met hoogwater en De Slijkkraak in de reien;
  elk labo laat het water zakken (labo 1, labo 2, de Stadsmissie van de week), elke heldere zone trekt de slijkarmen daar terug, en elke week heeft
  zijn eigen tekens (weerstation en windvaan, gezonken masten, stil Minnewater, vastgeslibde sluis, droge fontein) die verdwijnen als de klas ze oplost.
  Wat in een eerdere week moest gebeuren, telt als gedaan zodra de leerkracht een week verder zet. Tijdens de eindbaas rijst de kop bij de Markt; na de overwinning zakt hij weg en is er feest.
- Wat een reiziger al zag, staat per toestel in `localStorage` (`klets:stad:gezien:<id>`), zodat nieuwe gebouwen bij het openen worden opgebouwd.

### Prestaties en kwaliteit
- Gemaakt voor gewone schoollaptops met ingebouwde grafische chip: alle herhaalde dingen (gebouwen, bomen, karren, lantaarns, regendruppels, mistwolkjes) zijn
  *instanced meshes*; één tekenopdracht per soort. Alle figuren samen zijn één tekenopdracht. Ongeveer 100 tekenopdrachten per beeld.
- Twee standen: **mooi** (schaduwen 2048, tilt-shift en kleurcorrectie, pixelverhouding hoogstens 1,5) en **licht** (schaduwen 1024, geen nabewerking,
  pixelverhouding 1, minder bomen en deeltjes, hoogstens 30 beelden per seconde). Standaard *automatisch*: zakt de beeldsnelheid onder 24, dan schakelt de stad zelf naar licht.
- Zonder WebGL (of met `?webgl=0`) toont de app een isometrische 2D-kaart met hetzelfde wegennet, dezelfde gebouwen, het water, het weer en de seizoenen.
- Portretten worden één keer uit het 3D-model getekend en als beeld bewaard. Achter een open venster tekent de stad maar één beeld per seconde; in een verborgen tabblad niets.

## Het weer van Brugge
- Bron: `https://api.open-meteo.com/v1/forecast?latitude=51.2093&longitude=3.2247&current=...` (gratis, geen sleutel, geen persoonsgegevens).
- Het antwoord wordt 15 minuten bewaard in `localStorage` (`vagant:weer:brugge`), zodat een klas vol laptops de dienst niet overbelast.
- Mislukt het verzoek (geen internet, firewall), dan komt er **één** waarschuwing in de console en gebruikt de app `terugval()`: rustig weer dat bij het seizoen en het uur past.
- Alles is te overschrijven met `?weer=`, `?datum=` en `?uur=` (zie de tabel hierboven), ook voor de tests.
- Eerlijk: lukt het ophalen niet, dan staat er in de weerchip **Geen live weer** (de stad toont dan rustig weer van het seizoen) en probeert de app het om de 15 minuten opnieuw.
  Wat buiten zo is, is ook in de stad zo: regen (met natte grond en plassen), motregen, sneeuw (met een sneeuwdek als er sneeuw ligt: `snow_depth`), zon met schaduwen, bewolkt zonder schaduwen, mist, onweer met bliksem, wind in bomen, vlaggen en windvaan.
- Dag en nacht volgen standaard de echte klok van Brugge en de stand van de zon (zonsopgang en -ondergang per seizoen, schemering, maan en sterren, verlichte ramen en lantaarns).
  De leerkracht kan dat in het dashboard of op het digibord vastzetten op dag, avond of nacht.
- Wordt de app ingebed met een strenge Content-Security-Policy, zet dan `connect-src https://api.open-meteo.com` erbij, anders is er geen live weer.

## Voorlezen met een Vlaamse stem
- Elke tekst die een reiziger leest, heeft een luidspreker: de gidsen en hun ballon, de verhaalbalk en het weekverhaal, het Missiebord,
  elke missie (vraag en antwoorden, en de kop leest het hele scherm), de labo's (kop, filmpje, proefopstelling, check), de Codekluis,
  het weer, de infokaartjes in de stad, de spelletjes van de geheimen (feestje en uitleg), het aanmelden en de reizigermaker.
- Per reiziger in te stellen (luidspreker rechtsboven): **altijd** (filmpjes, gidsen en het verhaal lezen vanzelf voor), **op vraag** of **uit**.
  Standaard: *altijd* voor de Kompasroute, anders *op vraag*. Een dictee (`Luister`) spreekt altijd. Sluiten of weggaan stopt de stem.
- Alles loopt via `js/core/stem.js`. Eerst een opname: `audio/stem/manifest.json` noemt de clips (`{ "clips": { "<sleutel>": "<sleutel>.mp3" } }`),
  de sleutel is FNV-1a (32 bit, hex) van de tekst met samengevoegde spaties. `node tools/stemteksten.mjs` geeft alle vaste teksten als JSON
  `[{ key, text, bron }]`, om ze vooraf in te spreken met een Vlaamse stem. Geen opname: de stem van de browser, de beste eerst
  (Edge Arnaud of Dena Natural, dan elke nl-BE-stem, dan nl-NL), rustig (tempo 0,85, toon 0,95), zin per zin met een korte pauze.
- Het dashboard (Instellingen) toont welke stem klinkt; het digibord heeft een *Lees voor* bij het verhaal en het weekverhaal (Vonk).

## Licenties
- **three.js** r170 (`vendor/three.module.min.js`, ongewijzigd uit `three@0.170.0`, bestand `build/three.module.min.js`),
  MIT-licentie, Copyright 2010-2024 three.js authors. Volledige tekst: `vendor/three-LICENSE.txt`.
  SHA-256: `08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7`.
- Alle andere code, modellen, iconen, filmpjes en simulaties zijn in deze repository zelf gemaakt (in code).

## Privacy en gevoeligheid
- Enkel een voornaam of bijnaam. Geen e-mail, achternaam, geboortedatum of herkomst. De app vraagt nooit waar iemand vandaan komt.
- Alles blijft in de browser van het toestel (localStorage). Het enige netwerkverzoek is het weerbericht van Brugge; daar gaat geen enkel gegeven van een leerling naartoe.
- Beeldtaal zonder grenzen, paspoorten of oorlog. De Slijkkraak is een grappig slijkmonster, geen eng beest; hij wordt verslagen met proper water, niet met wapens.
- De stad toont alleen aantallen ("5 reizigers bouwden mee"). Wie een doel nog niet haalde, wordt nergens getoond of gerangschikt.

## Wat werkt en wat nog niet
Getest met Playwright in headless Chromium (WebGL via SwiftShader), met een nagebootste Open-Meteo (regen, sneeuw, zon, mist, storm en een mislukte verbinding):
aanmelden en de creator, de stad met water, bruggen en weer, de labo's (filmpje, simulatie, weerdata, test), het missiebord, de codekluis,
het dashboard met al zijn tabbladen, het digibord (stad en eindbaas), de eindbaas over twee pagina's, de seizoenen en de 2D-terugval.

Beperkingen:
- **Alleen thema 1 heeft inhoud.** De andere zes staan in de lijst en in De Poort, maar zijn nog niet uitgewerkt (het dashboard zet ze op "binnenkort").
- **Opslag per toestel.** Elke laptop heeft zijn eigen gegevens. Tot de Supabase-koppeling er is: *Exporteer alles (JSON)* op elke laptop en *Importeer en voeg samen* op de computer van de leerkracht.
- **De eindbaas** werkt enkel tussen tabbladen van dezelfde browser (BroadcastChannel). Voor echte laptops in de klas: `SupabaseSync`.
- `SupabaseStore` en `SupabaseSync` zijn stubs met TODO's: project in de EU-regio, Row Level Security per klas, enkel bijnamen.
- Spraakopnames zijn nog niet gebouwd; die onderdelen zijn luister- en keuzevragen.
- De galerij bewaart verkleinde foto's in localStorage (enkele MB per browser).
- Voorlezen gebruikt de stemmen van het besturingssysteem; zonder Nederlandse stem leest de browser met een andere stem.

## Supabase later (stappen)
1. Supabase-project aanmaken in **EU-regio**. Tabellen `klassen`, `leerlingen`, `pogingen`, `galerij`, `gebeurtenissen` (zie TODO in `js/core/store.js`).
2. Row Level Security: elke klas ziet alleen haar eigen rijen; leerlingen enkel met bijnaam.
3. `SupabaseStore` en `SupabaseSync` invullen (Realtime Broadcast voor de eindbaas), `BACKEND` in `js/config.js` op `'supabase'` zetten.
4. De PIN van de leerkracht vervangen door een echte aanmelding voor de leerkracht.
