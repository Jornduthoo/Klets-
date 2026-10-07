# Klets! - webapp (versie 1)

De klasapp van **Klets!**, de methode voor een 6de leerjaar met gewezen anderstalige nieuwkomers.
Het schooljaar is een reis naar **De Poort** (de middelbare school). De Reizigers komen aan in **Station Klets**,
waar de **Grijze Mist** de wereld heeft uitgewist. Samen bouwen ze een **3D-klasstad** in een dal tussen de bergen:
elk doel dat de klas haalt, wordt een gebouw, en hoe meer de klas leert, hoe verder de mist wegtrekt.
Deze versie bevat **Queste 1: Aankomst**.

- Geen build-stap, geen installatie: gewone HTML, CSS en ES-modules. Eén meegeleverde bibliotheek: **three.js** (3D), lokaal in `vendor/` (zie *Licenties*).
- Geen externe lettertypes, geen CDN, geen netwerkverzoeken: werkt offline en op een afgeschermde server.
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
| `index.html` | leerlingen (de 3D-klasstad van Station Klets) | http://localhost:8000/ |
| `leerkracht.html` | leerkrachtendashboard | http://localhost:8000/leerkracht.html |
| `digibord.html` | raid op het digibord | http://localhost:8000/digibord.html |

**Standaard-PIN van de leerkracht: `1234`.** Verander hem meteen bij *Dashboard > Instellingen > PIN*.

Tip om alles te verkennen: open het dashboard, ga naar *Instellingen > Demodata maken* (8 voorbeeldleerlingen met resultaten),
en klik bovenaan op *Open de stad als leerkracht*.

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
- **De klasstad Klets** (3D): een low-poly stad in een dal, schuin van bovenaf bekeken zoals in een stadsbouwspel.
  Slepen = schuiven, scrollen of knijpen = zoomen, rechtermuisknop (of Shift + slepen, of de pijlknoppen rechtsonder) = draaien.
  Met het toetsenbord: pijltjes of WASD/ZQSD schuiven, Q en E draaien, + en - zoomen.
  Levende details: auto's op de ringwegen, voetgangers op het plein, een trein die stopt in Station Klets en in de tunnels verdwijnt,
  wuivende bomen, wolken boven de bergen, kranen op bouwplaatsen, een kampvuur bij Bram, een tilt-shift-look (wazig boven- en onderaan).
- **De stad is de voortgang van de klas.** Elk doel dat minstens één leerling haalt, wordt een gebouw in de wijk van zijn macht:
  Woordenwijk (Taal, bibliotheken), Getallenwijk (Getal, rekentorens), Kaartenwijk (Wereld, kaartenhuizen en een sterrenwacht),
  Hartenwijk (Hart, tuinen en serres), Makerswijk (Maker, werkplaatsen), Breinwijk (Brein, uitkijktorens).
  Hoe meer leerlingen het doel halen, hoe groter (4 niveaus). Een doel dat geoefend wordt maar nog niet gehaald is, is een **bouwplaats** met een kraan.
  Nieuwe gebouwen verschijnen met een bouwanimatie (steiger, stofwolk, pop) en de camera vliegt erheen. De ringwegen groeien mee met de stad.
- **Grijze Mist**: ligt aan de rand van het dal en trekt terug naarmate de klas-XP groeit. Ze ligt nooit over iets wat je nodig hebt:
  het plein, de huizen, de zes gebouwen van de gidsen en elk gebouwd doel liggen altijd binnen de vrije cirkel.
- **Dag en nacht**: een rustige dag-en-nachtcyclus met verlichte ramen en straatlantaarns 's nachts. De zonknop rechtsboven wisselt
  tussen cyclus, dag, avond en nacht. De leerkracht kan ook vast dag of nacht kiezen.
- **Werkbalk** (onderaan, ronde knoppen): Missies, Adviseurs, Kaartlagen, Mijn huis, Codekluis, Klasstad, De Poort, Nachttrein.
  Bovenaan: eigen rang en XP, en de stad met reizigers, gebouwen, klas-XP, mist en de klasmeter.
- **Adviseurs**: de zes gidsen (Atlas, Woordje, Tella, Kroniek, Bram, Byte) staan links en spreken je aan in een ballon
  ("in de Woordenwijk wachten 3 nieuwe missies"). Een oranje cijfer = nieuwe missies deze week. Klik op een gids of op zijn gebouw
  (Kaartenkamer, Wachtzaal, Rekenkiosk, Seinhuis, Kampvuur, Werkplaats): je ziet zijn missies met *Start*.
- **Gebouw aanklikken**: een infokaart met het doel uit de handleiding, hoeveel reizigers meebouwden (enkel een aantal, nooit namen),
  de grootte, de sterkte van de klas en de missies die dit doel oefenen.
- **Kaartlagen** (zoals de datakaarten van een stadsbouwspel): *Doelen: sterk en zwak* (gloed per doel), *Wijken* (gloed per wijk)
  en *Mijn bijdrage* (gebouwen waaraan jij meebouwde en je huis). De stad wordt dan wit, de gegevens gloeien op de grond.
  Groen = sterk, oranje = hier oefenen we samen verder. Nooit namen, nooit een rangschikking.
- **Mijn huis**: elke leerling heeft een eigen huis in de Reizigerswijk rond het plein (dak in de kleur van zijn jas).
  Extraatjes uit de codekluis worden versiering: luifel, vogelhuisje, bloementuin, zonnepanelen, sterrendak, tuinlantaarn, lichtpad ...
- **Missiebord** (op het plein of via de knop *Missies*): alle missies van de week per dag, met *Start*.
- **Codekluis**: geheime codes uit het papieren Logboek geven extraatjes (kleding, sporen, stukken van de wereldkaart, +25 XP). Nooit kerninhoud.
- **Klasstad-overzicht** (knop *Klasstad*): klasmeter, gebouwen per wijk, lijst van alle gebouwen (met *Toon* in de stad) en de galerij.
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
- **Niets zit op slot voor de leerkracht**: *Alles open* zet ook latere weken open voor leerlingen, en *Open de stad als leerkracht* toont alles (met routekeuze per missie). Leerlingen zien bij latere weken een duidelijke uitleg in plaats van een slot.

### Digibord (`digibord.html`, PIN)
Twee weergaven (knop *Toon de stad* / *Toon de Mist-golem*, of rechtstreeks `digibord.html?view=stad`):
- **Stad**: de klasstad op groot scherm, langzaam draaiend, met klascijfers, gebouwen per wijk, kaartlagen (*Sterk en zwak*, *Wijken*)
  en dag/avond/nacht. Klik op een gebouw voor het doel en het aantal reizigers dat meebouwde.
  Tijdens een raid hangt de Grijze Mist als een vriendelijke storm (met gele ogen) boven de stad; elke treffer doet hem oplichten en krimpen.
- **Mist-golem**: een grote pixel-Grijze Mist (vriendelijk, niet eng) met HP-balk. HP automatisch (8 per deelnemer) of zelf gekozen.
Bij elke treffer schudt de mist en wordt de lucht lichter; bij 0 HP trekt de mist op. Er worden geen namen getoond en foute antwoorden worden niet eens doorgestuurd.

## Architectuur

```
webapp/
  index.html, leerkracht.html, digibord.html
  css/klets.css              basisstijl (aanmelden, panelen, oefeningen)
  css/stad.css               de stad: werkbalk, bovenbalk, adviseurs, infokaart, markers, telefoonweergave
  css/leerkracht.css         dashboard en digibord
  vendor/three.module.min.js three.js r170 (MIT), 3D-weergave, lokaal meegeleverd
  vendor/three-LICENSE.txt   licentie van three.js
  data/queste1.js            afgeleid uit de handleiding (187 lessen, doelen, Logboekcodes)
  js/config.js               machten, routes, gidsen, rangen, XP, keuze van de backend
  js/core/util.js            DOM-helper, normalisatie, getallen lezen, spraak, klank
  js/core/store.js           opslaglaag: LocalStore (localStorage) + SupabaseStore (stub)
  js/core/sync.js            live-laag: LocalSync (BroadcastChannel) + SupabaseSync (stub)
  js/core/model.js           missiecatalogus, routes, XP/rangen, doelen per leerling, codes
  js/city/layout.js          plattegrond: ringwegen, wijken, kavels, huizen, plein (gedeeld door 3D en 2D)
  js/city/stadmodel.js       van pogingen naar een stad: gebouwen, niveaus, bouwplaatsen, mist, huizen, sterkte
  js/city/modellen.js        low-poly modellen in code (gebouwen per wijk en niveau, gidsgebouwen, huizen, station, trein ...)
  js/city/stad3d.js          de 3D-stad (three.js): licht, dag/nacht, mist, verkeer, bouwanimaties, kaartlagen, camera, tilt-shift
  js/city/stad2d.js          terugvalkaart zonder WebGL (isometrisch canvas, zelfde methodes)
  js/city/stad.js            kiest 3D of 2D, bewaart de kwaliteitskeuze
  js/game/sprites.js         pixel-lettertype, portretten van de gidsen, avatars (aanmelden, panelen, dashboard)
  js/missions/types.js       de 12 oefentypes (data -> UI -> score)
  js/missions/engine.js      missievenster, verbetering, bewaren per doelcode, XP
  js/missions/week1.js       de oefeningen van week 1 (per les-id en per route)
  js/missions/raidbank.js    vraaggenerator voor de raid
  js/pupil/app.js            leerlingenapp (stad, adviseurs, werkbalk, infokaart, missies, codekluis, huis, raid)
  js/pupil/iconen.js         lijn-iconen (SVG) voor de werkbalk
  js/teacher/dashboard.js    dashboard
  js/teacher/digibord.js     digibord: stad en raid
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

### De stad: hoe ze rekent
- `js/city/stadmodel.js` berekent alles uit de pogingen (zoals het dashboard): per doelcode hoeveel leerlingen het behaalden en hoeveel het oefenen.
- Een doel krijgt de eerstvolgende vrije kavel in de wijk van zijn macht (`machtVanCode`), in de volgorde waarin de klas het voor het eerst oefende.
  Zo verspringen gebouwen nooit. Niveau 0 tot 3 hangt af van het aandeel leerlingen dat het doel haalde (25, 50, 75 %).
- Mist: de vrije straal groeit van 23 naar 54 eenheden met de klas-XP (`mistDoel` per leerling) en is altijd minstens zo groot als het verste gebouw.
- Wat een leerling al zag, staat per toestel in `localStorage` (`klets:stad:gezien:<id>`), zodat nieuwe gebouwen sinds het vorige bezoek bij het openen worden opgebouwd.

### Prestaties en kwaliteit
- Gemaakt voor gewone schoollaptops met ingebouwde grafische chip: alle herhaalde dingen (gebouwen, bomen, auto's, lantaarns, mistwolkjes) zijn
  *instanced meshes*; één tekenopdracht per soort. Ongeveer 80 tekenopdrachten per beeld.
- Twee standen: **mooi** (schaduwen 2048, tilt-shift en kleurcorrectie, pixelverhouding hoogstens 1,5) en **licht** (schaduwen 1024, geen nabewerking,
  pixelverhouding 1, minder bomen bij een nieuwe start, hoogstens 30 beelden per seconde). Standaard *automatisch*: zakt de beeldsnelheid onder 24,
  dan schakelt de stad zelf naar licht. De knop met de schuifjes rechtsboven wisselt met de hand (wordt per toestel onthouden).
  Ook via de adresbalk: `?kwaliteit=hoog`, `?kwaliteit=laag` of `?kwaliteit=auto`.
- Zonder WebGL (of met `?webgl=0`) toont de app een eenvoudige isometrische 2D-kaart met dezelfde gebouwen, mist, kaartlagen en knoppen.
- Achter een open venster (missie, codekluis ...) tekent de stad maar één beeld per seconde; in een verborgen tabblad niets.

## Licenties
- **three.js** r170 (`vendor/three.module.min.js`, ongewijzigd uit het npm-pakket `three@0.170.0`, bestand `build/three.module.min.js`),
  MIT-licentie, Copyright 2010-2024 three.js authors. Volledige tekst: `vendor/three-LICENSE.txt`.
  SHA-256: `08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7`.
- Alle andere code, modellen, iconen en beelden zijn in deze repository zelf gemaakt (in code).

## Privacy en gevoeligheid
- Enkel een voornaam of bijnaam. Geen e-mail, achternaam, geboortedatum of herkomst. De app vraagt nooit waar iemand vandaan komt.
- In versie 1 blijft alles in de browser van het toestel (localStorage). Er gaat niets naar een server, er worden geen externe lettertypes of scripts geladen.
- Beeldtaal zonder boten, vliegtuigen, grenzen, paspoorten of oorlog. De Grijze Mist is een vriendelijke wolk, geen monster. De vijver in de stad heeft geen boten; de trein rijdt door tunnels, niet over een grens.
- De stad toont alleen aantallen ("5 reizigers bouwden mee"). Wie een doel nog niet haalde, wordt nergens getoond of gerangschikt.

## Wat werkt en wat nog niet (v1)
Werkt: alles hierboven, getest met Playwright in headless Chromium (WebGL via SwiftShader): aanmelden, de stad, adviseur en gebouw aanklikken,
missie maken en scoren, nieuw gebouw met bouwanimatie, kaartlagen, huis versieren, raid over twee pagina's met storm boven de stad,
dashboard, digibord (stad en golem), telefoonbreedte en de 2D-terugval zonder WebGL.

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
