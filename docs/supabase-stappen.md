# Vagant: de klas online zetten (Supabase) - stap voor stap

Met de klasdatabank delen alle toestellen dezelfde gegevens: het dashboard en het digibord zien meteen wat elke
reiziger doet, een reiziger speelt verder op elke Chromebook, en de eindbaas werkt tussen het digibord en de laptops.
Zonder klasdatabank blijft alles werken zoals vroeger (elk toestel apart, PIN 1234).

**Wat staat waar?**

| Waar | Wat |
|---|---|
| Supabase (EU, Ierland `eu-west-1` of Frankfurt `eu-central-1`) | de klas, de reizigers (bijnaam + pincode), resultaten, galerij, instellingen |
| Supabase Auth | enkel jouw account als leerkracht (e-mail + wachtwoord). Reizigers krijgen een **anonieme** sessie per toestel: geen e-mail, geen wachtwoord |
| De Chromebook | een kopie om offline verder te werken, en wat nog moet doorgestuurd worden |

> **Nooit de secret key delen.** In Supabase staan twee soorten sleutels: de *publishable key* (`sb_publishable_...`)
> is publiek bedoeld en staat in de app en in de klaslink. De *secret key* (`sb_secret_...`, vroeger `service_role`)
> geeft volledige toegang tot alles: die zet je nergens in, mail je niet en plak je niet in de app. Is ze ooit uitgelekt?
> Maak in Supabase meteen een nieuwe aan (*Project Settings > API Keys*) en verwijder de oude.

## 1. Het project (eenmalig)

Het project bestaat al: `https://kkqzstqsczcooutdjypt.supabase.co` (EU, Ierland). Een nieuw project maak je op
[supabase.com](https://supabase.com) > *New project* en kies een **EU-regio** (Ierland of Frankfurt). Kies een sterk
databasewachtwoord en bewaar het in je wachtwoordbeheerder.

## 2. Aanmelden instellen (Authentication)

1. *Authentication > Sign In / Providers*
   - **Allow anonymous sign-ins: AAN** (zo melden reizigers zich aan zonder e-mail).
   - **Email: AAN** (voor jou als leerkracht). *Confirm email* mag aan blijven: je krijgt dan eenmalig een bevestigingsmail.
   - Wil je niet dat iemand anders een leerkrachtaccount maakt? Zet na het maken van jouw account *Allow new users to sign up* uit.
     (Let op: dat blokkeert ook nieuwe anonieme reizigers. Laat het dus aan tijdens het schooljaar; een vreemd account ziet je klas toch niet.)
2. *Authentication > URL Configuration*
   - **Site URL**: het adres van de app, bv. `https://vagant-klas.netlify.app` (of je GitHub Pages-adres).
   - **Redirect URLs**: voeg `https://vagant-klas.netlify.app/**` toe (en `http://localhost:8000/**` als je lokaal test).
3. *Authentication > Rate Limits*: alle Chromebooks van de school delen hetzelfde internetadres. Zet
   **anonymous sign-ins per hour** op **100** (standaard 30), anders lukt het aanmelden van de hele klas in één uur misschien niet.

## 3. De tabellen en de regels (SQL)

1. *SQL Editor > New query*.
2. Plak de volledige inhoud van [`sql/vagant-supabase.sql`](../sql/vagant-supabase.sql) en klik **Run**.
   Het script mag je later opnieuw draaien (bv. na een update): het maakt niets dubbel en wist geen gegevens.
3. Controle - plak en draai:

   ```sql
   select n.nspname as schema, c.relname as tabel, c.relrowsecurity as rls_aan,
          (select count(*) from pg_policies p where p.schemaname = n.nspname and p.tablename = c.relname) as regels
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public', 'vagant_priv') and c.relkind = 'r'
   order by 1, 2;
   ```

   Verwacht: 5 tabellen (`klassen`, `klasdata`, `leden`, `reizigers`, `pogingen`) en **overal `rls_aan = true`**.
   (`pogingen` heeft bewust 0 regels: niemand mag ze lezen.)
4. Optioneel: *Realtime > Settings*: zet **Allow public access** uit. Vagant gebruikt enkel privékanalen per klas.

## 4. De app online zetten (Netlify)

Sleep de map van de app naar [app.netlify.com/drop](https://app.netlify.com/drop) (of koppel de GitHub-repository).
Er is geen build-stap. De Project URL en de publishable key staan al in `js/config.js`; je hoeft geen code te veranderen.

## 5. Klas online zetten in het dashboard

1. Open `https://<jouw-site>/leerkracht.html` en meld je aan met de PIN (1234).
2. *Instellingen > Klas online (Supabase)*: klik **Test verbinding**. Alles moet "In orde" zijn. Staat er "Nog niet",
   dan zegt de regel wat er ontbreekt (SQL-script, anonieme aanmeldingen, ...).
   (Een ander project? Open *Project URL en publishable key*, vul ze in en klik opnieuw *Test verbinding*.)
3. Vink **Klas online (Supabase) op dit toestel** aan. De pagina laadt opnieuw.
4. **Eerste keer? Maak een account** (je e-mailadres + een wachtwoord van minstens 8 tekens). Bevestig de mail als
   Supabase erom vraagt en meld je daarna aan.
5. **Maak je klas** (bv. "6A"). Je krijgt een **klascode** van 6 tekens.
6. Het digibord (`digibord.html`) op dezelfde computer gebruikt dezelfde aanmelding.

## 6. De reizigers

1. *Instellingen*: de **klaslink** en de **QR-code**. Toon de QR-code op het digibord of deel de link via Smartschool/Classroom.
   De link zet de klas meteen online op die Chromebook en vult de klascode in.
2. Elke reiziger kiest **Ik ben een nieuwe reiziger**, typt een voornaam of bijnaam en maakt zijn figuur.
   Daarna verschijnt een **pincode van 4 cijfers**: laat die in het Expeditieboek schrijven.
3. Op een andere Chromebook: klaslink openen, **Ik speelde al op een ander toestel**, naam + pincode.
4. *Reizigers en routes* toont elke reiziger met zijn pincode. **Nieuw** geeft een nieuwe pincode (ook als iemand
   geblokkeerd is na 5 foute pogingen). **Verwijder** wist de reiziger, al zijn resultaten en koppelt zijn toestellen los.
5. Reizigers die je zelf toevoegt in het dashboard krijgen ook meteen een pincode.

**Geen wifi?** De reiziger speelt verder. Onderaan staat "Geen verbinding met de klasdatabank": zijn resultaten blijven
op de Chromebook bewaard en gaan vanzelf door zodra de wifi terug is. (Een nieuwe reiziger maken of de klascode
invullen kan niet zonder verbinding.)

**Oude gegevens van de toestellen meenemen?** Op elk toestel (nog in de lokale modus): *Exporteer alles (JSON)*.
Daarna in het online dashboard: *Importeer en voeg samen (JSON)*.

## 7. Privacy (AVG) - waar je zelf voor zorgt

- Reizigers: enkel een voornaam of bijnaam (2-16 tekens; de databank weigert e-mailadressen en lange cijferreeksen).
  Geen achternaam, geen klasfoto met namen in de galerij.
- Iedereen van de klas kan (technisch) de resultaten van de klas lezen: de stad heeft die nodig om te groeien.
  Andere klassen en buitenstaanders zien niets (Row Level Security, getest).
- De klascode is de sleutel om een nieuwe reiziger te maken: deel ze enkel met je klas.
- Sluit (via de school) een verwerkersovereenkomst af met Supabase (*Organization > Legal Documents > DPA*) en vermeld
  de app in het privacybeleid van de school.
- Einde van het schooljaar: *Instellingen > Alles wissen* (wist de klas in de databank), of verwijder de klas.
  Oude anonieme sessies opruimen (SQL Editor):

  ```sql
  delete from auth.users u
  where u.is_anonymous and u.created_at < now() - interval '30 days'
    and not exists (select 1 from public.leden l where l.user_id = u.id);
  ```

## Problemen

| Melding | Oplossing |
|---|---|
| "De klasdatabank is nog niet klaar: het SQL-script ..." | Stap 3 opnieuw. |
| "Anonieme aanmeldingen staan uit" | Stap 2.1. |
| "Te veel foute pogingen" | Wacht een kwartier, of geef in het dashboard een nieuwe pincode. |
| Reizigers kunnen niet aanmelden, allemaal tegelijk | Rate limit (stap 2.3). |
| "Dat e-mailadres en wachtwoord kloppen niet" | Wachtwoord vergeten: *Authentication > Users* in Supabase, of maak een nieuw account en een nieuwe klas. |
| Terug naar werken zonder databank op één toestel | Dashboard: vink *Klas online* uit (de gegevens in de databank blijven). |
