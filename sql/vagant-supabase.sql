-- =====================================================================================
-- Vagant - klasdatabank voor Supabase (Postgres 15/16/17)
--
-- Eenmalig plakken in Supabase > SQL Editor > Run. Het script mag later opnieuw gedraaid
-- worden (idempotent): het maakt niets dubbel en wist geen gegevens.
--
-- Privacy (AVG):
--  * reizigers (leerlingen) hebben enkel een voornaam of bijnaam, GEEN e-mail, geen achternaam;
--    ze melden zich aan met een anonieme Supabase-sessie per toestel + klascode + bijnaam
--    (+ een pincode van 4 cijfers om op een ander toestel verder te spelen);
--  * enkel de leerkracht heeft een e-mailadres (Supabase Auth, e-mail + wachtwoord);
--  * Row Level Security op elke tabel: een klas ziet enkel haar eigen gegevens.
--
-- Tabellen (schema public):
--   klassen    (id, code, naam, eigenaar, max_reizigers)        - een klas met een korte klascode
--   reizigers  (klas_id, pid, bijnaam, pin)                    - een leerling (identiteit, los van toestellen)
--   leden      (klas_id, user_id, rol, pid)                    - welke Supabase-gebruiker (toestel) bij welke klas hoort
--   klasdata   (klas_id, soort, id, pid, data jsonb, ...)      - alles wat de app bewaart (zoals LocalStore):
--              soort = settings | pupil | attempt | gallery | event
-- Intern (schema vagant_priv, niet bereikbaar via de API):
--   pogingen   - mislukte aanmeldpogingen (rem op raden van pincodes en klascodes)
--
-- Live (Realtime Broadcast, privé-kanaal per klas): topic 'klas:<klas_id>' (optioneel ':<kamer>').
--   Enkel leden van de klas mogen er luisteren en zenden (RLS op realtime.messages).
--   Elke wijziging in klasdata stuurt een klein bericht 'db' (soort + id's, nooit de inhoud).
-- =====================================================================================

-- ---------- schema voor interne hulpfuncties (niet blootgesteld via de Data API) ----------
create schema if not exists vagant_priv;
revoke all on schema vagant_priv from public;
grant usage on schema vagant_priv to authenticated;

-- ---------- tabellen ----------
create table if not exists public.klassen (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  naam           text not null default '' check (char_length(naam) <= 40),
  eigenaar       uuid not null references auth.users (id) on delete cascade,
  max_reizigers  integer not null default 40 check (max_reizigers between 1 and 60),
  created_at     timestamptz not null default now()
);
create index if not exists klassen_eigenaar_idx on public.klassen (eigenaar);

create table if not exists public.reizigers (
  klas_id     uuid not null references public.klassen (id) on delete cascade,
  pid         text not null check (pid ~ '^[A-Za-z0-9_-]{1,64}$'),
  bijnaam     text not null check (char_length(bijnaam) between 2 and 16),
  pin         text not null check (pin ~ '^[0-9]{4}$'),
  created_at  timestamptz not null default now(),
  primary key (klas_id, pid)
);
create unique index if not exists reizigers_bijnaam_uniek on public.reizigers (klas_id, lower(bijnaam));

create table if not exists public.leden (
  klas_id     uuid not null references public.klassen (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  rol         text not null check (rol in ('leerkracht', 'reiziger')),
  pid         text,
  created_at  timestamptz not null default now(),
  primary key (klas_id, user_id),
  constraint leden_pid_bij_rol check ((rol = 'reiziger') = (pid is not null)),
  constraint leden_reiziger_fk foreign key (klas_id, pid) references public.reizigers (klas_id, pid) on delete cascade
);
create index if not exists leden_user_idx on public.leden (user_id);
create index if not exists leden_pid_idx on public.leden (klas_id, pid);

create table if not exists public.klasdata (
  klas_id     uuid not null references public.klassen (id) on delete cascade,
  soort       text not null check (soort in ('settings', 'pupil', 'attempt', 'gallery', 'event')),
  id          text not null check (id ~ '^[A-Za-z0-9_:.-]{1,80}$'),
  pid         text,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  auteur      uuid default auth.uid(),
  primary key (klas_id, soort, id),
  -- de eigenaar-kolom pid moet kloppen met de inhoud
  constraint klasdata_pid_klopt check (
    case soort
      when 'pupil'   then coalesce(pid = id, false)
      when 'attempt' then coalesce(pid = data ->> 'pid', false)
      when 'gallery' then coalesce(pid = data ->> 'pid', false)
      else pid is null
    end),
  constraint klasdata_id_klopt check (soort = 'settings' or coalesce(data ->> 'id' = id, false)),
  -- een document is nooit groter dan ~400 kB (een galerijfoto is ~30-60 kB)
  constraint klasdata_grootte check (pg_column_size(data) <= 400000)
);
create index if not exists klasdata_klas_tijd_idx on public.klasdata (klas_id, updated_at);
create index if not exists klasdata_klas_pid_idx on public.klasdata (klas_id, pid);

create table if not exists vagant_priv.pogingen (
  id       bigint generated always as identity primary key,
  user_id  uuid,
  soort    text not null,           -- 'code' (klascode raden) of 'pin' (pincode raden)
  sleutel  text not null,           -- bv. klas_id + bijnaam
  ts       timestamptz not null default now()
);
create index if not exists pogingen_idx on vagant_priv.pogingen (soort, sleutel, ts);
create index if not exists pogingen_user_idx on vagant_priv.pogingen (user_id, ts);
create index if not exists pogingen_ts_idx on vagant_priv.pogingen (ts);

-- ---------- hulpfuncties voor RLS (security definer: lezen leden/klassen zonder RLS-lus) ----------
create or replace function vagant_priv.is_lid(p_klas uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leden l where l.klas_id = p_klas and l.user_id = (select auth.uid()));
$$;

create or replace function vagant_priv.is_leerkracht(p_klas uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.klassen k where k.id = p_klas and k.eigenaar = (select auth.uid()));
$$;

create or replace function vagant_priv.mijn_pid(p_klas uuid) returns text
language sql stable security definer set search_path = '' as $$
  select l.pid from public.leden l where l.klas_id = p_klas and l.user_id = (select auth.uid()) and l.rol = 'reiziger';
$$;

/** Is de huidige gebruiker anoniem (leerlingtoestel)? */
create or replace function vagant_priv.is_anoniem() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$$;

/** Klas-id uit een Realtime-topic 'klas:<uuid>' of 'klas:<uuid>:<kamer>' (anders null). */
create or replace function vagant_priv.klas_uit_topic(p_topic text) returns uuid
language sql immutable set search_path = '' as $$
  select case when p_topic ~ '^klas:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:[A-Za-z0-9_-]{1,32})?$'
              then substr(p_topic, 6, 36)::uuid end;
$$;

/** Een bijnaam opschonen; null als hij niet mag (te kort/lang, e-mail, lange cijferreeksen, rare tekens). */
create or replace function vagant_priv.bijnaam(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when n is null then null
    when char_length(n) < 2 or char_length(n) > 16 then null
    when n ~ '[@<>/\\{}\[\]|]' or n ~ '[[:cntrl:]]' then null
    when n ~ '[0-9]{3,}' then null
    else n end
  from (select regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g') as n) x;
$$;

/** Willekeurige tekens uit sterke willekeur (gen_random_uuid gebruikt pg_strong_random). */
create or replace function vagant_priv.klascode_nieuw() returns text
language plpgsql volatile set search_path = '' as $$
declare
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- geen I, O, 0, 1
  b bytea; c text; i int;
begin
  loop
    b := uuid_send(gen_random_uuid()); c := '';
    for i in 0..5 loop c := c || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;
    exit when not exists (select 1 from public.klassen k where k.code = c);
  end loop;
  return c;
end $$;

create or replace function vagant_priv.pin_nieuw() returns text
language plpgsql volatile set search_path = '' as $$
declare b bytea := uuid_send(gen_random_uuid());
begin
  return lpad((((get_byte(b, 0) << 16) | (get_byte(b, 1) << 8) | get_byte(b, 2)) % 10000)::text, 4, '0');
end $$;

create or replace function vagant_priv.pid_nieuw() returns text
language sql volatile set search_path = '' as $$
  select 'll_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

/** Telt mislukte pogingen en ruimt oude op. */
create or replace function vagant_priv.te_veel(p_soort text, p_sleutel text, p_max int, p_venster interval) returns boolean
language sql volatile security definer set search_path = '' as $$
  delete from vagant_priv.pogingen where ts < now() - interval '1 day';
  select count(*) >= p_max from vagant_priv.pogingen where soort = p_soort and sleutel = p_sleutel and ts > now() - p_venster;
$$;

create or replace function vagant_priv.mislukt(p_soort text, p_sleutel text) returns void
language sql volatile security definer set search_path = '' as $$
  insert into vagant_priv.pogingen (user_id, soort, sleutel) values ((select auth.uid()), p_soort, p_sleutel);
$$;

create or replace function vagant_priv.klas_json(k public.klassen) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', k.id, 'code', k.code, 'naam', k.naam);
$$;

-- ---------- RPC: voor de app (schema public, enkel voor aangemelde gebruikers) ----------

/** Controle voor de knop 'Test verbinding': bestaan alle onderdelen? Mag ook zonder aanmelding. */
create or replace function public.vagant_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  tabellen text[] := array['klassen', 'reizigers', 'leden', 'klasdata'];
  t text; ontbreekt text[] := '{}'; zonder_rls text[] := '{}';
begin
  foreach t in array tabellen loop
    if to_regclass('public.' || t) is null then ontbreekt := ontbreekt || t;
    elsif not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = to_regclass('public.' || t)) then zonder_rls := zonder_rls || t;
    end if;
  end loop;
  return jsonb_build_object(
    'versie', 1,
    'ontbrekend', to_jsonb(ontbreekt),
    'zonder_rls', to_jsonb(zonder_rls),
    'realtime', to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null,
    'aangemeld', (select auth.uid()) is not null);
end $$;

/** Leerkracht: een nieuwe klas maken. Geeft de klascode terug. */
create or replace function public.vagant_maak_klas(p_naam text default '') returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); k public.klassen;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reden', 'niet_aangemeld'); end if;
  if vagant_priv.is_anoniem() then return jsonb_build_object('ok', false, 'reden', 'enkel_leerkracht'); end if;
  if (select count(*) from public.klassen where eigenaar = uid) >= 5 then return jsonb_build_object('ok', false, 'reden', 'te_veel_klassen'); end if;
  insert into public.klassen (code, naam, eigenaar) values (vagant_priv.klascode_nieuw(), left(btrim(coalesce(p_naam, '')), 40), uid) returning * into k;
  insert into public.leden (klas_id, user_id, rol) values (k.id, uid, 'leerkracht');
  return jsonb_build_object('ok', true, 'klas', vagant_priv.klas_json(k));
end $$;

/** Bestaat deze klascode? (rem: max. 20 foute codes per toestel per uur) */
create or replace function public.vagant_klas_info(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); k public.klassen;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reden', 'niet_aangemeld'); end if;
  if vagant_priv.te_veel('code', uid::text, 20, interval '1 hour') then return jsonb_build_object('ok', false, 'reden', 'geblokkeerd'); end if;
  select * into k from public.klassen where code = upper(btrim(coalesce(p_code, '')));
  if not found then perform vagant_priv.mislukt('code', uid::text); return jsonb_build_object('ok', false, 'reden', 'onbekend'); end if;
  return jsonb_build_object('ok', true, 'klas', vagant_priv.klas_json(k));
end $$;

/** Mijn plaats in een klas (na herladen): rol, pid en bijnaam. */
create or replace function public.vagant_mijn_klas(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); k public.klassen; l public.leden; b text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reden', 'niet_aangemeld'); end if;
  select * into k from public.klassen where code = upper(btrim(coalesce(p_code, '')));
  if not found then return jsonb_build_object('ok', false, 'reden', 'onbekend'); end if;
  select * into l from public.leden where klas_id = k.id and user_id = uid;
  if not found then return jsonb_build_object('ok', false, 'reden', 'geen_lid', 'klas', vagant_priv.klas_json(k)); end if;
  select bijnaam into b from public.reizigers where klas_id = k.id and pid = l.pid;
  return jsonb_build_object('ok', true, 'klas', vagant_priv.klas_json(k), 'rol', l.rol, 'pid', l.pid, 'bijnaam', b);
end $$;

/** Een nieuwe reiziger maakt zich aan met klascode + bijnaam (anonieme sessie op dit toestel). */
create or replace function public.vagant_nieuwe_reiziger(p_code text, p_bijnaam text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); k public.klassen; n text := vagant_priv.bijnaam(p_bijnaam);
  r public.reizigers; l public.leden;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reden', 'niet_aangemeld'); end if;
  if n is null then return jsonb_build_object('ok', false, 'reden', 'bijnaam'); end if;
  if vagant_priv.te_veel('code', uid::text, 20, interval '1 hour') then return jsonb_build_object('ok', false, 'reden', 'geblokkeerd'); end if;
  select * into k from public.klassen where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then perform vagant_priv.mislukt('code', uid::text); return jsonb_build_object('ok', false, 'reden', 'onbekend'); end if;
  if k.eigenaar = uid then return jsonb_build_object('ok', false, 'reden', 'enkel_reiziger'); end if;
  -- opnieuw proberen na een netwerkfout: zelfde toestel, zelfde naam -> zelfde reiziger
  select r2.* into r from public.leden l2 join public.reizigers r2 on r2.klas_id = l2.klas_id and r2.pid = l2.pid
    where l2.klas_id = k.id and l2.user_id = uid and lower(r2.bijnaam) = lower(n);
  if found then return jsonb_build_object('ok', true, 'klas', vagant_priv.klas_json(k), 'pid', r.pid, 'pin', r.pin, 'bijnaam', r.bijnaam); end if;
  if exists (select 1 from public.reizigers where klas_id = k.id and lower(bijnaam) = lower(n)) then
    return jsonb_build_object('ok', false, 'reden', 'bijnaam_bestaat');
  end if;
  if (select count(*) from public.reizigers where klas_id = k.id) >= k.max_reizigers then
    return jsonb_build_object('ok', false, 'reden', 'klas_vol');
  end if;
  insert into public.reizigers (klas_id, pid, bijnaam, pin) values (k.id, vagant_priv.pid_nieuw(), n, vagant_priv.pin_nieuw()) returning * into r;
  insert into public.leden (klas_id, user_id, rol, pid) values (k.id, uid, 'reiziger', r.pid)
    on conflict (klas_id, user_id) do update set pid = excluded.pid, rol = 'reiziger';
  -- meteen een minimale reiziger in klasdata, zodat er nooit een reiziger zonder document is
  insert into public.klasdata (klas_id, soort, id, pid, data)
    values (k.id, 'pupil', r.pid, r.pid, jsonb_build_object('id', r.pid, 'naam', r.bijnaam, 'xp', 0, 'codes', '[]'::jsonb, 'kosmetiek', '[]'::jsonb, 'gemaakt', floor(extract(epoch from now()) * 1000)))
    on conflict do nothing;
  return jsonb_build_object('ok', true, 'klas', vagant_priv.klas_json(k), 'pid', r.pid, 'pin', r.pin, 'bijnaam', r.bijnaam);
end $$;

/** Een bestaande reiziger meldt zich aan op een (ander) toestel met klascode + bijnaam + pincode.
 *  Rem: max. 5 foute pincodes per reiziger per 15 minuten, en max. 20 per toestel per uur. */
create or replace function public.vagant_aanmelden(p_code text, p_bijnaam text, p_pin text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid()); k public.klassen; r public.reizigers; n text := vagant_priv.bijnaam(p_bijnaam); sleutel text;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reden', 'niet_aangemeld'); end if;
  if vagant_priv.te_veel('code', uid::text, 20, interval '1 hour') or vagant_priv.te_veel('pin-toestel', uid::text, 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'reden', 'geblokkeerd');
  end if;
  select * into k from public.klassen where code = upper(btrim(coalesce(p_code, '')));
  if not found then perform vagant_priv.mislukt('code', uid::text); return jsonb_build_object('ok', false, 'reden', 'onbekend'); end if;
  sleutel := k.id::text || ':' || lower(coalesce(n, ''));
  if vagant_priv.te_veel('pin', sleutel, 5, interval '15 minutes') then return jsonb_build_object('ok', false, 'reden', 'geblokkeerd'); end if;
  select * into r from public.reizigers where klas_id = k.id and lower(bijnaam) = lower(coalesce(n, ''));
  if not found or r.pin is distinct from btrim(coalesce(p_pin, '')) then
    perform vagant_priv.mislukt('pin', sleutel); perform vagant_priv.mislukt('pin-toestel', uid::text);
    return jsonb_build_object('ok', false, 'reden', 'pin');
  end if;
  if k.eigenaar = uid then return jsonb_build_object('ok', false, 'reden', 'enkel_reiziger'); end if;
  -- een toestel hoort bij hoogstens een reiziger per klas: een andere reiziger op dit toestel neemt de plaats over
  insert into public.leden (klas_id, user_id, rol, pid) values (k.id, uid, 'reiziger', r.pid)
    on conflict (klas_id, user_id) do update set pid = excluded.pid, rol = 'reiziger';
  return jsonb_build_object('ok', true, 'klas', vagant_priv.klas_json(k), 'pid', r.pid, 'bijnaam', r.bijnaam);
end $$;

/** Leerkracht: een reiziger en al zijn gegevens verwijderen (ook de toestellen verliezen hun toegang). */
create or replace function public.vagant_verwijder_reiziger(p_klas uuid, p_pid text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not vagant_priv.is_leerkracht(p_klas) then return jsonb_build_object('ok', false, 'reden', 'geen_leerkracht'); end if;
  delete from public.klasdata where klas_id = p_klas and pid = p_pid;
  delete from public.reizigers where klas_id = p_klas and pid = p_pid;   -- leden volgen (on delete cascade)
  return jsonb_build_object('ok', true);
end $$;

/** Leerkracht: een nieuwe pincode voor een reiziger (en de blokkering opheffen). */
create or replace function public.vagant_nieuwe_pin(p_klas uuid, p_pid text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_pin text; v_bijnaam text;
begin
  if not vagant_priv.is_leerkracht(p_klas) then return jsonb_build_object('ok', false, 'reden', 'geen_leerkracht'); end if;
  update public.reizigers set pin = vagant_priv.pin_nieuw() where klas_id = p_klas and pid = p_pid returning pin, bijnaam into v_pin, v_bijnaam;
  if not found then return jsonb_build_object('ok', false, 'reden', 'onbekend'); end if;
  delete from vagant_priv.pogingen where soort = 'pin' and sleutel = p_klas::text || ':' || lower(v_bijnaam);
  return jsonb_build_object('ok', true, 'pin', v_pin);
end $$;

/** Leerkracht: alle gegevens van de klas wissen (reizigers, resultaten, galerij, instellingen). De klas en de klascode blijven. */
create or replace function public.vagant_wis_klasdata(p_klas uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not vagant_priv.is_leerkracht(p_klas) then return jsonb_build_object('ok', false, 'reden', 'geen_leerkracht'); end if;
  delete from public.klasdata where klas_id = p_klas;
  delete from public.reizigers where klas_id = p_klas;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- triggers op klasdata ----------

/** updated_at en auteur altijd door de server gezet. */
create or replace function vagant_priv.klasdata_stempel() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.auteur := (select auth.uid());
  return new;
end $$;
drop trigger if exists klasdata_stempel on public.klasdata;
create trigger klasdata_stempel before insert or update on public.klasdata
  for each row execute function vagant_priv.klasdata_stempel();

/** Een reiziger-document houdt de tabel reizigers bij:
 *  - de leerkracht maakt een reiziger (dashboard, demodata, import): er komt een reizigersrij met pincode bij;
 *  - een reiziger verandert zijn naam: de bijnaam volgt (uniek in de klas). */
create or replace function vagant_priv.klasdata_reiziger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n text; k public.klassen;
begin
  if new.soort <> 'pupil' then return new; end if;
  n := vagant_priv.bijnaam(new.data ->> 'naam');
  if n is null then raise exception 'Ongeldige bijnaam' using errcode = '22023', hint = 'bijnaam'; end if;
  if exists (select 1 from public.reizigers where klas_id = new.klas_id and lower(bijnaam) = lower(n) and pid <> new.pid) then
    raise exception 'Die bijnaam bestaat al in deze klas' using errcode = '23505', hint = 'bijnaam_bestaat';
  end if;
  if exists (select 1 from public.reizigers where klas_id = new.klas_id and pid = new.pid) then
    update public.reizigers set bijnaam = n where klas_id = new.klas_id and pid = new.pid and bijnaam <> n;
  else
    if not vagant_priv.is_leerkracht(new.klas_id) and (select auth.uid()) is not null then
      raise exception 'Enkel de leerkracht maakt zo een reiziger' using errcode = '42501';
    end if;
    select * into k from public.klassen where id = new.klas_id;
    if (select count(*) from public.reizigers where klas_id = new.klas_id) >= k.max_reizigers then
      raise exception 'De klas is vol' using errcode = '23514', hint = 'klas_vol';
    end if;
    insert into public.reizigers (klas_id, pid, bijnaam, pin) values (new.klas_id, new.pid, n, vagant_priv.pin_nieuw());
  end if;
  return new;
end $$;
drop trigger if exists klasdata_reiziger on public.klasdata;
create trigger klasdata_reiziger before insert or update on public.klasdata
  for each row execute function vagant_priv.klasdata_reiziger();

/** Rem: max. 100 galerijfoto's per reiziger en 5000 resultaten per reiziger. */
create or replace function vagant_priv.klasdata_rem() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.soort = 'gallery' and (select count(*) from public.klasdata where klas_id = new.klas_id and soort = 'gallery' and pid = new.pid) >= 100 then
    raise exception 'Te veel foto''s in de galerij' using errcode = '54000', hint = 'te_veel';
  end if;
  if new.soort = 'attempt' and (select count(*) from public.klasdata where klas_id = new.klas_id and soort = 'attempt' and pid = new.pid) >= 5000 then
    raise exception 'Te veel resultaten' using errcode = '54000', hint = 'te_veel';
  end if;
  return new;
end $$;
drop trigger if exists klasdata_rem on public.klasdata;
create trigger klasdata_rem before insert on public.klasdata
  for each row execute function vagant_priv.klasdata_rem();

/** Na elke wijziging: een klein 'db'-bericht op het privékanaal van de klas (soort + id's, nooit de inhoud).
 *  Doet niets als Realtime er niet is; een fout hier blokkeert nooit het bewaren. */
create or replace function vagant_priv.klasdata_meld() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rij record;
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is null then return null; end if;
  for rij in
    select klas_id, soort, count(*) as n, (array_agg(id))[1:50] as ids from vagant_rijen group by klas_id, soort
  loop
    begin
      execute 'select realtime.send($1, $2, $3, true)'
        using jsonb_build_object('op', lower(tg_op), 'soort', rij.soort, 'ids', case when rij.n <= 50 then to_jsonb(rij.ids) end, 'n', rij.n),
              'db', 'klas:' || rij.klas_id::text;
    exception when others then null;
    end;
  end loop;
  return null;
end $$;
drop trigger if exists klasdata_meld_ins on public.klasdata;
drop trigger if exists klasdata_meld_upd on public.klasdata;
drop trigger if exists klasdata_meld_del on public.klasdata;
create trigger klasdata_meld_ins after insert on public.klasdata referencing new table as vagant_rijen
  for each statement execute function vagant_priv.klasdata_meld();
create trigger klasdata_meld_upd after update on public.klasdata referencing new table as vagant_rijen
  for each statement execute function vagant_priv.klasdata_meld();
create trigger klasdata_meld_del after delete on public.klasdata referencing old table as vagant_rijen
  for each statement execute function vagant_priv.klasdata_meld();

-- ---------- Row Level Security ----------
alter table public.klassen   enable row level security;
alter table public.reizigers enable row level security;
alter table public.leden     enable row level security;
alter table public.klasdata  enable row level security;
alter table vagant_priv.pogingen enable row level security;   -- geen policies: enkel via functies

-- klassen: leden zien hun klas; de eigenaar mag de naam veranderen of de klas verwijderen. Aanmaken enkel via vagant_maak_klas.
drop policy if exists klassen_lezen on public.klassen;
create policy klassen_lezen on public.klassen for select to authenticated
  using (eigenaar = (select auth.uid()) or vagant_priv.is_lid(id));
drop policy if exists klassen_wijzigen on public.klassen;
create policy klassen_wijzigen on public.klassen for update to authenticated
  using (eigenaar = (select auth.uid())) with check (eigenaar = (select auth.uid()));
drop policy if exists klassen_verwijderen on public.klassen;
create policy klassen_verwijderen on public.klassen for delete to authenticated
  using (eigenaar = (select auth.uid()));

-- reizigers (met pincode): de leerkracht ziet alle reizigers van haar/zijn klas, een reiziger enkel zichzelf.
drop policy if exists reizigers_lezen on public.reizigers;
create policy reizigers_lezen on public.reizigers for select to authenticated
  using (vagant_priv.is_leerkracht(klas_id) or pid = vagant_priv.mijn_pid(klas_id));

-- leden: je ziet je eigen lidmaatschap; de leerkracht ziet alle toestellen van de klas en mag er een loskoppelen.
drop policy if exists leden_lezen on public.leden;
create policy leden_lezen on public.leden for select to authenticated
  using (user_id = (select auth.uid()) or vagant_priv.is_leerkracht(klas_id));
drop policy if exists leden_verwijderen on public.leden;
create policy leden_verwijderen on public.leden for delete to authenticated
  using (rol = 'reiziger' and (user_id = (select auth.uid()) or vagant_priv.is_leerkracht(klas_id)));

-- klasdata: leden lezen alles van hun klas; een reiziger schrijft enkel zijn eigen reiziger, resultaten en foto's;
-- de leerkracht leest en schrijft alles van de eigen klas. Niemand ziet een andere klas.
drop policy if exists klasdata_lezen on public.klasdata;
create policy klasdata_lezen on public.klasdata for select to authenticated
  using (vagant_priv.is_lid(klas_id));
drop policy if exists klasdata_toevoegen on public.klasdata;
create policy klasdata_toevoegen on public.klasdata for insert to authenticated
  with check (vagant_priv.is_leerkracht(klas_id)
    or (soort in ('pupil', 'attempt', 'gallery') and pid is not null and pid = vagant_priv.mijn_pid(klas_id)));
drop policy if exists klasdata_wijzigen on public.klasdata;
create policy klasdata_wijzigen on public.klasdata for update to authenticated
  using (vagant_priv.is_leerkracht(klas_id)
    or (soort in ('pupil', 'attempt', 'gallery') and pid is not null and pid = vagant_priv.mijn_pid(klas_id)))
  with check (vagant_priv.is_leerkracht(klas_id)
    or (soort in ('pupil', 'attempt', 'gallery') and pid is not null and pid = vagant_priv.mijn_pid(klas_id)));
drop policy if exists klasdata_verwijderen on public.klasdata;
create policy klasdata_verwijderen on public.klasdata for delete to authenticated
  using (vagant_priv.is_leerkracht(klas_id));

-- ---------- rechten (naast RLS: wat mag een rol ueberhaupt) ----------
revoke all on table public.klassen, public.reizigers, public.leden, public.klasdata from anon, public;
revoke all on table public.klassen, public.reizigers, public.leden, public.klasdata from authenticated;
grant select, delete on table public.klassen to authenticated;
grant update (naam) on table public.klassen to authenticated;
grant select on table public.reizigers to authenticated;
grant select, delete on table public.leden to authenticated;
grant select, insert, update, delete on table public.klasdata to authenticated;
revoke all on table vagant_priv.pogingen from anon, authenticated, public;

revoke all on all functions in schema vagant_priv from public, anon;
grant execute on function vagant_priv.is_lid(uuid), vagant_priv.is_leerkracht(uuid), vagant_priv.mijn_pid(uuid),
  vagant_priv.is_anoniem(), vagant_priv.klas_uit_topic(text) to authenticated;

revoke all on function public.vagant_maak_klas(text), public.vagant_klas_info(text), public.vagant_mijn_klas(text),
  public.vagant_nieuwe_reiziger(text, text), public.vagant_aanmelden(text, text, text),
  public.vagant_verwijder_reiziger(uuid, text), public.vagant_nieuwe_pin(uuid, text), public.vagant_wis_klasdata(uuid),
  public.vagant_status() from public, anon;
grant execute on function public.vagant_maak_klas(text), public.vagant_klas_info(text), public.vagant_mijn_klas(text),
  public.vagant_nieuwe_reiziger(text, text), public.vagant_aanmelden(text, text, text),
  public.vagant_verwijder_reiziger(uuid, text), public.vagant_nieuwe_pin(uuid, text), public.vagant_wis_klasdata(uuid),
  public.vagant_status() to authenticated;
grant execute on function public.vagant_status() to anon;

-- ---------- Realtime: privékanaal per klas (Broadcast) ----------
-- Enkel leden van de klas luisteren en zenden op 'klas:<klas_id>'. (Ook de eindbaas tussen digibord en laptops.)
do $$
begin
  if to_regclass('realtime.messages') is not null then
    if not (select c.relrowsecurity from pg_catalog.pg_class c where c.oid = 'realtime.messages'::regclass) then
      execute 'alter table realtime.messages enable row level security';
    end if;
    execute 'drop policy if exists vagant_klas_luisteren on realtime.messages';
    execute $p$create policy vagant_klas_luisteren on realtime.messages for select to authenticated
      using (realtime.messages.extension in ('broadcast', 'presence')
             and vagant_priv.is_lid(vagant_priv.klas_uit_topic((select realtime.topic()))))$p$;
    execute 'drop policy if exists vagant_klas_zenden on realtime.messages';
    execute $p$create policy vagant_klas_zenden on realtime.messages for insert to authenticated
      with check (realtime.messages.extension in ('broadcast', 'presence')
                  and vagant_priv.is_lid(vagant_priv.klas_uit_topic((select realtime.topic()))))$p$;
  else
    raise notice 'Schema realtime ontbreekt: geen Realtime-policies gemaakt (enkel normaal buiten Supabase).';
  end if;
end $$;

-- ---------- zelfcontrole (mag je altijd los draaien) ----------
-- select c.relname as tabel, c.relrowsecurity as rls_aan,
--        (select count(*) from pg_policies p where p.schemaname = n.nspname and p.tablename = c.relname) as policies
-- from pg_class c join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname in ('public', 'vagant_priv') and c.relkind = 'r' order by 1;
-- Verwacht: rls_aan = true op elke rij (pogingen heeft bewust 0 policies).
