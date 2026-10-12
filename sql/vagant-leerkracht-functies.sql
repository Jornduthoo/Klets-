-- Vagant: de drie leerkrachtfuncties (leerling verwijderen, nieuwe pincode, klas wissen).
-- Plak dit in Supabase > SQL Editor > Run. (De rest van de databank staat al klaar.)

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
declare r public.reizigers;
begin
  if not vagant_priv.is_leerkracht(p_klas) then return jsonb_build_object('ok', false, 'reden', 'geen_leerkracht'); end if;
  update public.reizigers set pin = vagant_priv.pin_nieuw() where klas_id = p_klas and pid = p_pid returning * into r;
  if not found then return jsonb_build_object('ok', false, 'reden', 'onbekend'); end if;
  delete from vagant_priv.pogingen where soort = 'pin' and sleutel = p_klas::text || ':' || lower(r.bijnaam);
  return jsonb_build_object('ok', true, 'pin', r.pin);
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

revoke all on function public.vagant_verwijder_reiziger(uuid, text), public.vagant_nieuwe_pin(uuid, text), public.vagant_wis_klasdata(uuid) from public, anon;
grant execute on function public.vagant_verwijder_reiziger(uuid, text), public.vagant_nieuwe_pin(uuid, text), public.vagant_wis_klasdata(uuid) to authenticated;
