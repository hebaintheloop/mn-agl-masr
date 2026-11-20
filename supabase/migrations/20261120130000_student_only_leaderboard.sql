create or replace function public.leaderboard()
returns table(full_name text,points bigint)
language sql stable set search_path=''
as $$
  select p.full_name, coalesce(sum(l.points),0)::bigint
  from public.profiles p
  left join public.points_ledger l on l.user_id=p.id
  where p.role = 'student'
  group by p.id,p.full_name
  order by 2 desc,p.full_name
  limit 100
$$;
