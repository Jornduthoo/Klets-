-- Rooktest voor de klasdatabank (na sql/vagant-supabase.sql). Plak in de SQL Editor en klik Run.
-- Het maakt tijdelijke testgebruikers en -klassen, controleert de regels en ruimt alles weer op.
-- Het resultaat is één tabel met per controle 'ok' of 'FOUT'. Alles moet 'ok' zijn.
-- (Loopt er iets mis, dan wordt het hele script teruggedraaid: er blijft niets achter.)

drop table if exists pg_temp.rook, pg_temp.rookvar;
create temp table rook (nr serial, controle text, uitkomst text);
create temp table rookvar (k text primary key, v jsonb);
grant all on rook, rookvar to authenticated, anon;
grant usage on sequence rook_nr_seq to authenticated, anon;

-- testgebruikers (enkel binnen deze transactie)
insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-4000-8000-0000000000a1', 'rooktest-juf-a@example.invalid', false),
  ('00000000-0000-4000-8000-0000000000a2', 'rooktest-juf-b@example.invalid', false),
  ('00000000-0000-4000-8000-0000000000b1', null, true),
  ('00000000-0000-4000-8000-0000000000b2', null, true),
  ('00000000-0000-4000-8000-0000000000b3', null, true);

-- leerkracht A maakt klas A
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","is_anonymous":false}', false);
insert into rookvar select 'A', public.vagant_maak_klas('rooktest A');
-- leerkracht B maakt klas B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated","is_anonymous":false}', false);
insert into rookvar select 'B', public.vagant_maak_klas('rooktest B');
-- reiziger 1 (anoniem) sluit aan bij A, reiziger 3 bij B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","is_anonymous":true}', false);
insert into rook (controle, uitkomst) select 'anoniem kan geen klas maken', case when (public.vagant_maak_klas('x') ->> 'reden') = 'enkel_leerkracht' then 'ok' else 'FOUT' end;
insert into rookvar select 'R1', public.vagant_nieuwe_reiziger((select v -> 'klas' ->> 'code' from rookvar where k = 'A'), 'Rookje');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b3","role":"authenticated","is_anonymous":true}', false);
insert into rookvar select 'R3', public.vagant_nieuwe_reiziger((select v -> 'klas' ->> 'code' from rookvar where k = 'B'), 'Wolkje');

-- reiziger 1: leest klas A, niet klas B; schrijft enkel zichzelf
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","is_anonymous":true}', false);
insert into rook (controle, uitkomst) select 'reiziger ziet zijn klas', case when count(*) = 1 then 'ok' else 'FOUT' end
  from public.klasdata where klas_id = (select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'A');
insert into rook (controle, uitkomst) select 'reiziger ziet andere klas NIET', case when count(*) = 0 then 'ok' else 'FOUT' end
  from public.klasdata where klas_id = (select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'B');
insert into rook (controle, uitkomst) select 'reiziger ziet enkel zijn eigen pincode', case when count(*) = 1 then 'ok' else 'FOUT' end from public.reizigers;
with u as (
  update public.klasdata set data = data || '{"xp":5}'
  where soort = 'pupil' and klas_id = (select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'B') returning 1)
insert into rook (controle, uitkomst) select 'reiziger kan andere klas niet aanpassen', case when count(*) = 0 then 'ok' else 'FOUT' end from u;
with u as (
  update public.klasdata set data = data || '{"xp":5}'
  where soort = 'pupil' and id = (select v ->> 'pid' from rookvar where k = 'R1') returning 1)
insert into rook (controle, uitkomst) select 'reiziger past zichzelf aan', case when count(*) = 1 then 'ok' else 'FOUT' end from u;
do $$ begin
  insert into public.klasdata (klas_id, soort, id, data) values ((select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'A'), 'settings', 'klas', '{}');
  insert into rook (controle, uitkomst) values ('reiziger kan instellingen niet schrijven', 'FOUT');
exception when others then insert into rook (controle, uitkomst) values ('reiziger kan instellingen niet schrijven', 'ok');
end $$;

-- ander toestel: verkeerde en juiste pincode
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated","is_anonymous":true}', false);
insert into rook (controle, uitkomst) select 'foute pincode geweigerd', case when (public.vagant_aanmelden((select v -> 'klas' ->> 'code' from rookvar where k = 'A'), 'Rookje', 'xxxx') ->> 'reden') = 'pin' then 'ok' else 'FOUT' end;
insert into rook (controle, uitkomst) select 'juiste pincode op ander toestel', case when (public.vagant_aanmelden((select v -> 'klas' ->> 'code' from rookvar where k = 'A'), 'rookje', (select v ->> 'pin' from rookvar where k = 'R1')) ->> 'ok') = 'true' then 'ok' else 'FOUT' end;

-- leerkracht A: ziet alles van A, niets van B; leerkracht B kan niets in A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","is_anonymous":false}', false);
insert into rook (controle, uitkomst) select 'leerkracht ziet pincodes van de klas', case when count(*) = 1 then 'ok' else 'FOUT' end
  from public.reizigers where klas_id = (select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'A');
insert into rook (controle, uitkomst) select 'leerkracht ziet andere klas NIET', case when count(*) = 0 then 'ok' else 'FOUT' end
  from public.klasdata where klas_id = (select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'B');
insert into public.klasdata (klas_id, soort, id, data) values ((select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'A'), 'settings', 'klas', '{"huidigeWeek":2}');
insert into rook (controle, uitkomst) values ('leerkracht schrijft instellingen', 'ok');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated","is_anonymous":false}', false);
insert into rook (controle, uitkomst) select 'andere leerkracht kan geen reiziger verwijderen', case when (public.vagant_verwijder_reiziger((select (v -> 'klas' ->> 'id')::uuid from rookvar where k = 'A'), (select v ->> 'pid' from rookvar where k = 'R1')) ->> 'reden') = 'geen_leerkracht' then 'ok' else 'FOUT' end;

-- niet aangemeld (rol anon)
reset role;
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$ begin
  perform count(*) from public.klasdata;
  insert into rook (controle, uitkomst) values ('niet aangemeld: geen toegang tot klasdata', 'FOUT');
exception when insufficient_privilege then insert into rook (controle, uitkomst) values ('niet aangemeld: geen toegang tot klasdata', 'ok');
end $$;
insert into rook (controle, uitkomst) select 'vagant_status: alles aanwezig en RLS aan', case when jsonb_array_length(s -> 'ontbrekend') = 0 and jsonb_array_length(s -> 'zonder_rls') = 0 then 'ok' else 'FOUT: ' || s::text end
  from (select public.vagant_status() as s) x;

reset role;
insert into rook (controle, uitkomst) select 'RLS aan op ' || c.relname, case when c.relrowsecurity then 'ok' else 'FOUT' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'vagant_priv') and c.relkind = 'r'
  and c.relname in ('klassen', 'reizigers', 'leden', 'klasdata', 'pogingen');
insert into rook (controle, uitkomst) select 'Realtime-regels op realtime.messages', case when count(*) = 2 then 'ok' else 'FOUT (' || count(*) || ')' end
  from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname like 'vagant_%';

-- opruimen (klassen, reizigers, leden en klasdata volgen via on delete cascade)
delete from vagant_priv.pogingen where user_id in (select id from auth.users where id::text like '00000000-0000-4000-8000-0000000000%');
delete from auth.users where id::text like '00000000-0000-4000-8000-0000000000%';
select set_config('request.jwt.claims', '', false);
insert into rook (controle, uitkomst) select 'opgeruimd', case when not exists (select 1 from public.klassen where naam like 'rooktest%') then 'ok' else 'FOUT' end;

select nr, controle, uitkomst from rook order by nr;
