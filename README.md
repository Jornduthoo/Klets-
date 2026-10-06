# Klets! - webapp (versie 1)

De klasapp van **Klets!**, de methode voor een 6de leerjaar met gewezen anderstalige nieuwkomers.
Het schooljaar is een reis door een 2D-wereld naar **De Poort** (de middelbare school).
Deze versie bevat **Queste 1: Aankomst** - de Reizigers komen 's nachts aan in **Station Klets**,
waar de **Grijze Mist** de kaart van de wereld heeft uitgewist.

- Geen build-stap, geen installatie, geen externe bibliotheken of lettertypes: gewone HTML, CSS en ES-modules.
- Werkt op elke statische server (ook GitHub Pages) en offline zodra de pagina geladen is.
- Alle tekst in het Vlaams-Nederlands.

## Snel starten (lokaal)

ES-modules werken niet via `file://`. Start daarom een kleine webserver in deze map:

```bash
cd webapp
python3 -m http.server 8000
```

Open daarna:

| Pagina | Voor wie | Adres |
|---|---|---|
| `index.html` | leerlingen (de wereld van Station Klets) | http://localhost:8000/ |
| `leerkracht.html` | leerkrachtendashboard | http://localhost:8000/leerkracht.html |
| `digibord.html` | raid op het digibord | http://localhost:8000/digibord.html |

**Standaard-PIN van de leerkracht: `1234`.** Verander hem meteen bij *Dashboard > Instellingen > PIN*.

Tip om alles te verkennen: open het dashboard, ga naar *Instellingen > Demodata maken* (8 voorbeeldleerlingen met resultaten),
en klik bovenaan op *Open de wereld als leerkracht*.

### Een raid uitproberen op één computer

1. Open `digibord.html` in een venster (PIN 1234), kies de levenspunten en klik op *Open de raid*.
2. Open `index.html` in een ander tabblad van **dezelfde browser** en meld je aan als leerling.
3. Op de laptop verschijnt een knop *Doe mee*. Klik op het digibord op *Start*.
4. Elk juist antwoord doet 1 schade. Het digibord toont alleen het aantal juiste antwoorden van de klas, nooit wie fout antwoordde.

## Publiceren via GitHub Pages

De map is al een git-repository met een eerste commit. Om te publiceren op `github.com/meesterJorn/Klets-`:

```bash
cd webapp
git remote add origin https://github.com/meesterJorn/Klets-.git
git branch -M main
git push -u origin main
```

Daarna op GitHub: *Settings > Pages > Build and deployment > Source: Deploy from a branch*, kies `main` en map `/ (root)`.
Na een minuutje staat de app op `https://meesterjorn.github.io/Klets-/`.
Alle paden zijn relatief, dus de app werkt ook in een submap. Het bestand `.nojekyll` zorgt dat GitHub de bestanden ongewijzigd serveert.

## Wat zit erin

### Voor leerlingen (`index.html`)
- **Aanmelden** met een voornaam of bijnaam en een zelfgemaakte pixel-avatar (huid, haar of hoofddoek, kleuren). Geen e-mail, geen wachtwoord.
- **Station Klets**: een pixel-art wereld in canvas (top-down). Wandelen met pijltjes, WASD (of ZQSD) of door te klikken (pad zoeken).
  Tegels, gebouwen, gidsen en reizigers worden volledig in code getekend. Levende details: lantaarns die flakkeren, een kampvuur met vonken,
  stoom uit de nachttrein, bloemen in de wind, vuurvliegjes, een stationsklok met de echte tijd, andere reizigers (de klasgenoten) die rondwandelen en praten.
- **Dag en nacht**: het station begint 's nachts. Hoe meer XP de klas verzamelt, hoe dunner de **mist** (deeltjes) en hoe meer het dag wordt. De leerkracht kan ook vast dag of nacht kiezen.
  De mist ligt nooit over iets wat je moet bereiken: gidsen worden altijd boven de mist getekend.
- **Gidsen**: Atlas (Kaartenkamer), Woordje (Wachtzaal), Tella (Rekenkiosk), Kroniek (Seinhuis), Bram (Kampvuur), Byte (Werkplaats).
  Loop tegen een gids of klik erop: je ziet zijn missies van de week. Een oranje cijfer boven een gids = nieuwe missies.
- **Missiebord** (in de stationshal of via de knop *Missies*): alle missies van de week per dag, met *Start*.
- **Codekluis**: geheime codes uit het papieren Logboek geven extraatjes (kleding, sporen, stukken van de wereldkaart, +25 XP). Nooit kerninhoud.
- **Klasstad**: elk doel dat iemand behaalt, wordt een gebouw (Bibliotheek, Rekentoren, Kaartenhuis, Vredestuin, Werkhuis, Uitkijktoren); hoe meer leerlingen het doel halen, hoe hoger. Met klasmeter en galerij.
- **De Poort** toont de reis (6 questes) en de rangen; **de nachttrein** vertelt het weekverhaal (met voorleesknop).
- **Raid**: als de leerkracht een raid opent, verschijnt *Doe mee*. Elke leerling krijgt vragen op zijn eigen route.

### Missies en oefentypes
Alle week 1-missies met een digitale opdracht zijn uitgewerkt voor de routes waar de handleiding doelen voor geeft
(39 oefenreeksen, ongeveer 250 items). Elk item draagt doelcodes; elk resultaat wordt per doelcode bewaard.

| type | wat | gescoord |
|---|---|---|
| `keuze` | meerkeuze (ook meerdere juist, met luisterknop of muziekfragment) | 1 punt |
| `volgorde` | slepen in de juiste volgorde (ook als treinwagons), met pijltjes als alternatief | 1 punt |
| `koppel` | paren koppelen | 1 punt per paar |
| `typ` | antwoord typen, tolerant (hoofdletters, spaties, accenten, aanhalingstekens); "bijna" bij 1 letter verschil | 1 punt |
| `getal` | getal typen: `10 000`, `10.000`, `3,5`, `-7`, en breuken (`3/4`, optioneel kleinste vorm) | 1 punt |
| `kaart` | klikken op een kaart: getallenas, positiekaart, taart (stukken kleuren), vrije regio's (bv. een venster met instellingen of mappen) | 1 punt |
| `zin` | zinnenbouwer met woord- of lettertegels (met afleiders) | 1 punt |
| `sorteer` | kaartjes in bakken sorteren (klikken of slepen) | 1 punt per kaartje |
| `splits` | woordensplitser: klik tussen letters | 1 punt |
| `typen` | typetraining met nauwkeurigheid (en tempo in woorden per minuut) | 1 punt |
| `upload` | foto opladen naar de klasgalerij (verkleind) | niet gescoord |
| `tekst` | leestekst, optioneel met leestimer | niet gescoord |

Elk item heeft een knop *Lees voor* (spraak van de browser, Nederlands/Vlaams als die stem op het toestel staat). Dictee-items (`zeg`) spreken een woord of getal uit.
Muziekfragmenten (solo/groep, stijlen) worden met WebAudio gemaakt: geen geluidsbestanden nodig.

Feedback is altijd vriendelijk: groen voor juist, oranje voor "nog niet" (nooit rood), met het juiste antwoord erbij.
Een doel is **behaald** vanaf 70 % juist in een poging (`BEHAALD_GRENS` in `js/config.js`). Lager = **Revanche**.

XP: 10 per juist antwoord, +20 de eerste keer; bij opnieuw spelen enkel XP voor verbetering. Code +25, raid 10 per juist antwoord en +50 bij winst.
Rangen: Reiziger 0, Verkenner 500, Spoorzoeker 1500, Kaartmaker 3000, Gids 5000, Wereldwijze 8000.

### Voor de leerkracht (`leerkracht.html`, PIN)
- **Overzicht**: klas-XP, mist, aantal behaalde doelen en Revanche, *Alles open*-schakelaar, raid starten, CSV-export.
- **Leerlingen en routes**: per leerling en per macht (Taal, Getal, Wereld, Hart, Maker, Brein) de route kiezen: Taalsleutels, Kompas of Telescoop. Leerlingen toevoegen of verwijderen.
- **Doelen**: matrix doelcode x leerling (beste poging in %), filter per week en route, met de doelomschrijving.
- **Revanche**: per doel wie het nog niet behaalde en wie het nog niet oefende; exporteerbaar.
- **Weekoverzicht**: alle lessen per dag uit de handleiding met doelen per route, webapp-opdracht en Logboekcode. Per missie knoppen *TS / K / T* om ze te bekijken zoals een leerling op die route (voorbeeldmodus, er wordt niets bewaard).
- **Geheime codes**: alle codes uit het Logboek, de beloning en hoeveel leerlingen ze vonden.
- **Instellingen**: huidige week, alles open, dag/nacht, mistdoel, klasnaam, PIN, export CSV en JSON, import (samenvoegen), demodata, alles wissen.
- **Niets zit op slot voor de leerkracht**: *Alles open* zet ook latere weken open voor leerlingen, en *Open de wereld als leerkracht* toont alles (met routekeuze per missie). Leerlingen zien bij latere weken een duidelijke uitleg in plaats van een slot.

### Digibord (`digibord.html`, PIN)
Een grote pixel-Grijze Mist (vriendelijk, niet eng) met HP-balk. HP automatisch (8 per deelnemer) of zelf gekozen.
Bij elke treffer schudt de mist en wordt de lucht lichter; bij 0 HP trekt de mist op. Er worden geen namen getoond en foute antwoorden worden niet eens doorgestuurd.

## Architectuur

```
webapp/
  index.html, leerkracht.html, digibord.html
  css/klets.css, css/leerkracht.css
  data/queste1.js            afgeleid uit de handleiding (187 lessen, doelen, Logboekcodes)
  js/config.js               machten, routes, gidsen, rangen, XP, keuze van de backend
  js/core/util.js            DOM-helper, normalisatie, getallen lezen, spraak, klank
  js/core/store.js           opslaglaag: LocalStore (localStorage) + SupabaseStore (stub)
  js/core/sync.js            live-laag: LocalSync (BroadcastChannel) + SupabaseSync (stub)
  js/core/model.js           missiecatalogus, routes, XP/rangen, doelen per leerling, klasstad, codes
  js/game/pixel.js           pixel-lettertype, gidsen, avatars, tegels
  js/game/map.js             de kaart van Station Klets (in code)
  js/game/world.js           canvas-engine: beweging, pad zoeken, deeltjes, mist, licht
  js/game/klasstad.js        tekening van de Klasstad
  js/missions/types.js       de 12 oefentypes (data -> UI -> score)
  js/missions/engine.js      missievenster, verbetering, bewaren per doelcode, XP
  js/missions/week1.js       de oefeningen van week 1 (per les-id en per route)
  js/missions/raidbank.js    vraaggenerator voor de raid
  js/pupil/app.js            leerlingenapp
  js/teacher/dashboard.js    dashboard
  js/teacher/digibord.js     raid-scherm
  tools/afleiden_queste1.py  maakt data/queste1.js opnieuw uit week1.json ... week6.json
```

**Twee verwisselbare lagen.** Alle schermen praten met een *store* en een *sync*, nooit rechtstreeks met localStorage of BroadcastChannel:

- `store` (async): `getSettings/saveSettings`, `listPupils/getPupil/savePupil/deletePupil`, `addAttempt/listAttempts`, `addGallery/listGallery`, `addEvent/listEvents`, `exportAll/importAll/reset`, `onChange`.
- `sync`: `connect()`, `publish(type, payload)`, `subscribe(type, handler)`, `close()`.

`BACKEND` in `js/config.js` kiest de implementatie (`'local'` nu, `'supabase'` later). De Supabase-klassen bestaan al met dezelfde interface en TODO's.

**Gegevens.**
- leerling: `{ id, naam, look, routes: {Taal: 'kompas', ...}, xp, codes[], kosmetiek[], kaartstukken[] }`
- poging: `{ id, pid, missie, week, route, items: [{ id, goals[], goed, totaal }], goed, totaal, xp, ts, bron: 'missie'|'raid' }`
- Doelstatus wordt altijd berekend uit de pogingen (`model.doelStats`), dus niets raakt uit sync.

**Raidprotocol** (via `sync`): digibord -> `raid:state {raidId, naam, status, hp, maxHp, deelnemers}` (elke 2 s);
laptop -> `raid:join {raidId, pid}`, `raid:hit {raidId, hid, pid}` (enkel bij een juist antwoord); `raid:vraag` vraagt de huidige toestand op.

### Oefeningen toevoegen
Voeg in een bestand zoals `js/missions/week1.js` een sleutel toe met het les-id uit `data/queste1.js` (bv. `w2-ma4`):

```js
'w2-ma4': {
  naam: 'Sleep de oceaan', intro: 'Atlas hier ...',
  sets: {
    kompas:    [ { id: 'oc-1', type: 'keuze', vraag: '...', opties: ['...', '...'], juist: 0, goals: ['...'] } ],
    telescoop: [ ... ],
  },
},
```

Ontbreekt een route, dan krijgt de leerling de dichtstbijzijnde route (Taalsleutels -> Kompas -> Telescoop). Koppel het nieuwe bestand in `js/pupil/app.js` en `js/teacher/dashboard.js` (`buildCatalog(QUESTE1, {...WEEK1, ...WEEK2})`).

## Privacy en gevoeligheid
- Enkel een voornaam of bijnaam. Geen e-mail, achternaam, geboortedatum of herkomst. De app vraagt nooit waar iemand vandaan komt.
- In versie 1 blijft alles in de browser van het toestel (localStorage). Er gaat niets naar een server, er worden geen externe lettertypes of scripts geladen.
- Beeldtaal zonder boten, vliegtuigen, grenzen, paspoorten of oorlog. De Grijze Mist is een vriendelijke wolk, geen monster.

## Wat werkt en wat nog niet (v1)
Werkt: alles hierboven, getest met Playwright (aanmelden, wandelen, missie maken en scoren, geheime code, raid over twee pagina's, dashboard, CSV).

Beperkingen en stubs:
- **Opslag per toestel.** Elke laptop heeft zijn eigen gegevens. Tot de Supabase-koppeling er is: *Exporteer alles (JSON)* op elke laptop en *Importeer en voeg samen* op de computer van de leerkracht.
- **Raid** werkt in v1 enkel tussen tabbladen van dezelfde browser (BroadcastChannel). Voor echte laptops in de klas: `SupabaseSync`.
- `SupabaseStore` en `SupabaseSync` zijn stubs met TODO's: project in de EU-regio (Frankfurt of Ierland), Row Level Security per klas, enkel bijnamen.
- Spraakopnames (Leesrace, Leenwoordenjacht hardop) zijn nog niet gebouwd; die onderdelen zijn vervangen door luister- en keuzevragen.
- Weken 2 tot 6 staan volledig in het weekoverzicht en het missiebord, maar hebben nog geen digitale oefeningen (de leerling ziet "Deze opdracht doe je in de klas").
- De galerij bewaart verkleinde foto's in localStorage (enkele MB per browser).
- Voorlezen gebruikt de stemmen van het besturingssysteem; zonder Nederlandse stem leest de browser met een andere stem.

## Supabase later (stappen)
1. Supabase-project aanmaken in **EU-regio**. Tabellen `klassen`, `leerlingen`, `pogingen`, `galerij`, `gebeurtenissen` (zie TODO in `js/core/store.js`).
2. Row Level Security: elke klas ziet alleen haar eigen rijen; leerlingen enkel met bijnaam.
3. `SupabaseStore` en `SupabaseSync` invullen (Realtime Broadcast voor de raid), `BACKEND` in `js/config.js` op `'supabase'` zetten.
4. De PIN van de leerkracht vervangen door een echte aanmelding voor de leerkracht.
