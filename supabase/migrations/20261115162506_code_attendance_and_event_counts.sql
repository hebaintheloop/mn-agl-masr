-- Attendance entered by leaders is durable before a student account exists.
create table public.student_code_attendance (
 event_id uuid not null references public.events on delete cascade,
 student_code text not null check (student_code ~ '^[0-9]{7}$'),
 points integer not null check (points between 0 and 10000),
 recorded_by uuid references public.profiles on delete set null,
 recorded_at timestamptz not null default now(),
 primary key(event_id,student_code)
);
create index student_code_attendance_code_idx on public.student_code_attendance(student_code,event_id);
create index student_code_attendance_actor_idx on public.student_code_attendance(recorded_by);
alter table public.student_code_attendance enable row level security;
revoke all on public.student_code_attendance from public,anon,authenticated,service_role;
grant select,insert on public.student_code_attendance to service_role;

create function public.record_attendance_by_code(p_event uuid,p_code text,p_actor uuid) returns jsonb
language plpgsql set search_path='' as $$
declare ev public.events; member_id uuid; snapshot public.student_code_attendance; existed boolean; awarded integer;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role='leader') then raise exception 'هذه العملية متاحة للقادة فقط'; end if;
 if p_code is null or p_code !~ '^[0-9]{7}$' then raise exception 'كود الطالب يجب أن يكون 7 أرقام دون شرطات'; end if;
 -- This lock is also taken by finish_registration, so signup and a late addition cannot miss each other.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('student-code:'||p_code,0));
 select * into ev from public.events where id=p_event for share;
 if ev.id is null then raise exception 'الفعالية غير موجودة'; end if;
 if now()<ev.start_at-interval '1 hour' then raise exception 'تسجيل الحضور يبدأ قبل الفعالية بساعة'; end if;
 select id into member_id from public.profiles where student_code=p_code;
 existed := exists(select 1 from public.student_code_attendance where event_id=p_event and student_code=p_code)
   or exists(select 1 from public.attendance where event_id=p_event and user_id=member_id);
 insert into public.student_code_attendance(event_id,student_code,points,recorded_by)
 values(p_event,p_code,coalesce((select points from public.points_ledger where event_id=p_event and user_id=member_id),ev.points),p_actor)
 on conflict(event_id,student_code) do nothing;
 select * into snapshot from public.student_code_attendance where event_id=p_event and student_code=p_code;
 if member_id is not null then
   insert into public.attendance(event_id,user_id,actor_id,checked_at) values(p_event,member_id,p_actor,snapshot.recorded_at) on conflict do nothing;
   insert into public.points_ledger(event_id,user_id,points,created_at) values(p_event,member_id,snapshot.points,snapshot.recorded_at) on conflict do nothing returning points into awarded;
 end if;
 return jsonb_build_object('saved',true,'pendingAccount',member_id is null,'alreadyRecorded',existed,'points',snapshot.points,'creditedPoints',coalesce(awarded,0));
end $$;

create or replace function public.finish_registration(p_id uuid,p_code text,p_name text,p_phone text,p_recovery text,p_ciphertext text) returns void
language plpgsql set search_path='' as $$ begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('student-code:'||p_code,0));
 insert into public.profiles(id,student_code,full_name,phone,recovery_hash) values(p_id,p_code,p_name,p_phone,p_recovery);
 insert into public.identities(user_id,ciphertext) values(p_id,p_ciphertext);
 insert into public.attendance(event_id,user_id,actor_id,checked_at)
 select event_id,p_id,recorded_by,recorded_at from public.student_code_attendance where student_code=p_code order by event_id on conflict do nothing;
 insert into public.points_ledger(event_id,user_id,points,created_at)
 select event_id,p_id,points,recorded_at from public.student_code_attendance where student_code=p_code order by event_id on conflict do nothing;
end $$;

create function public.leader_event_stats(p_actor uuid) returns table(event_id uuid,rsvp_count bigint,attended_count bigint,pending_count bigint)
language plpgsql stable set search_path='' as $$ begin
 if not exists(select 1 from public.profiles where id=p_actor and role='leader') then raise exception 'هذه العملية متاحة للقادة فقط'; end if;
 return query
 with rsvps as (select r.event_id,count(*) n from public.registrations r where r.going group by r.event_id),
 seen as (select a.event_id,p.student_code from public.attendance a join public.profiles p on p.id=a.user_id union select c.event_id,c.student_code from public.student_code_attendance c),
 attended as (select s.event_id,count(*) n from seen s group by s.event_id),
 pending as (select c.event_id,count(*) n from public.student_code_attendance c where not exists(select 1 from public.profiles p where p.student_code=c.student_code) group by c.event_id)
 select e.id,coalesce(r.n,0),coalesce(a.n,0),coalesce(p.n,0) from public.events e left join rsvps r on r.event_id=e.id left join attended a on a.event_id=e.id left join pending p on p.event_id=e.id;
end $$;

create function public.leader_event_roster(p_actor uuid,p_event uuid) returns jsonb
language plpgsql stable set search_path='' as $$ declare result jsonb; begin
 if not exists(select 1 from public.profiles where id=p_actor and role='leader') then raise exception 'هذه العملية متاحة للقادة فقط'; end if;
 with member_ids as (select user_id from public.registrations where event_id=p_event union select user_id from public.attendance where event_id=p_event),
 members as (
   select p.id as user_id,coalesce(r.going,true) as going,coalesce(r.going,false) as has_rsvp,(r.user_id is not null) as registered_before,
     coalesce(r.excuse,'') as excuse,coalesce(r.accommodation,'') as accommodation,(a.user_id is not null) as present,false as pending_account,
     p.full_name,p.phone,p.student_code,coalesce(l.points,0) as points
   from member_ids m join public.profiles p on p.id=m.user_id
   left join public.registrations r on r.event_id=p_event and r.user_id=p.id
   left join public.attendance a on a.event_id=p_event and a.user_id=p.id
   left join public.points_ledger l on l.event_id=p_event and l.user_id=p.id
   union all
   select null::uuid,true,false,false,'','',true,true,'','',c.student_code,c.points
   from public.student_code_attendance c where c.event_id=p_event and not exists(select 1 from public.profiles p where p.student_code=c.student_code)
 ), rows_json as (select jsonb_agg(jsonb_build_object(
   'user_id',m.user_id,'going',m.going,'has_rsvp',m.has_rsvp,'registered_before',m.registered_before,'excuse',m.excuse,'accommodation',m.accommodation,
   'present',m.present,'pending_account',m.pending_account,'points',m.points,
   'profiles',jsonb_build_object('full_name',m.full_name,'phone',m.phone,'student_code',m.student_code)
 ) order by m.pending_account,m.full_name,m.student_code) value from members m)
 select jsonb_build_object('rows',coalesce((select value from rows_json),'[]'::jsonb),'attendance',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'checked_at',a.checked_at)) from public.attendance a where a.event_id=p_event),'[]'::jsonb)) into result;
 return result;
end $$;

revoke all on function public.record_attendance_by_code(uuid,text,uuid),public.finish_registration(uuid,text,text,text,text,text),public.leader_event_stats(uuid),public.leader_event_roster(uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_attendance_by_code(uuid,text,uuid),public.finish_registration(uuid,text,text,text,text,text),public.leader_event_stats(uuid),public.leader_event_roster(uuid,uuid) to service_role;
