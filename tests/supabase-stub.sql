-- Minimale nabootsing van wat Supabase al klaarzet (enkel voor de lokale RLS-tests, NIET in Supabase draaien).
-- auth.uid() en auth.jwt() lezen request.jwt.claims, net zoals in Supabase.
create role anon nologin;
create role authenticated nologin;
-- In Supabase is 'postgres' geen superuser maar heeft hij BYPASSRLS. We draaien het script als zo'n rol.
create role sb_eigenaar nologin bypassrls;
grant anon, authenticated to sb_eigenaar;
-- (PGlite kan geen GRANT op de database: we maken het schema vooraf en geven het aan sb_eigenaar)
create schema vagant_priv authorization sb_eigenaar;
grant usage, create on schema public to sb_eigenaar;
grant usage on schema public to anon, authenticated;

create schema auth;
create table auth.users (id uuid primary key, email text, is_anonymous boolean not null default false);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, sb_eigenaar;
grant execute on all functions in schema auth to anon, authenticated, sb_eigenaar;
grant references, select on auth.users to sb_eigenaar;

create schema realtime;
create table realtime.messages (id bigserial primary key, topic text not null, extension text not null, event text, payload jsonb, private boolean default true);
create table realtime.verzonden (id bigserial primary key, topic text, event text, payload jsonb, private boolean);
create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
  language sql security definer as $$ insert into realtime.verzonden (topic, event, payload, private) values (topic, event, payload, private) $$;
alter table realtime.messages owner to sb_eigenaar;
grant usage on schema realtime to anon, authenticated, sb_eigenaar;
grant select, insert on realtime.messages to authenticated;
grant usage on sequence realtime.messages_id_seq to authenticated;
grant execute on all functions in schema realtime to authenticated, sb_eigenaar;
grant select on realtime.verzonden to sb_eigenaar;
