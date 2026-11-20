alter table public.profiles
  add column if not exists study_year text not null default 'first'
    check (study_year in ('first','second','third','fourth'));

alter table public.events
  add column if not exists response_deadline_at timestamptz;

update public.events
set response_deadline_at = start_at
where response_deadline_at is null;

alter table public.events
  alter column response_deadline_at set not null;

alter table public.events
  drop constraint if exists events_response_deadline_check;
alter table public.events
  add constraint events_response_deadline_check
  check (response_deadline_at <= start_at);

drop function if exists public.finish_registration(uuid,text,text,text,text,text);

create or replace function public.finish_registration(
  p_id uuid,
  p_code text,
  p_name text,
  p_phone text,
  p_year text,
  p_recovery text,
  p_ciphertext text
) returns void language plpgsql set search_path='' as $$
begin
  if p_year not in ('first','second','third','fourth') then
    raise exception 'Invalid study year';
  end if;
  insert into public.profiles(id,student_code,full_name,phone,study_year,recovery_hash)
  values(p_id,p_code,p_name,p_phone,p_year,p_recovery);
  insert into public.identities(user_id,ciphertext)
  values(p_id,p_ciphertext);
end $$;

revoke all on function public.finish_registration(uuid,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.finish_registration(uuid,text,text,text,text,text,text) to service_role;
