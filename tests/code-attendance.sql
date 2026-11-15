-- All fixtures and changes roll back. No real users or events are modified.
begin;
do $$
declare
 actor uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); second_member uuid:=gen_random_uuid(); retry_member uuid:=gen_random_uuid();
 past_event uuid:=gen_random_uuid(); current_event uuid:=gen_random_uuid(); future_event uuid:=gen_random_uuid(); result jsonb; roster jsonb; failed boolean;
begin
 if exists(select 1 from public.profiles where student_code in ('9898980','9898981','9898982','9898983')) or exists(select 1 from public.student_code_attendance where student_code in ('9898980','9898981','9898982','9898983')) then raise exception 'Fixture codes are already in use; choose new test codes'; end if;
 insert into auth.users(id,email) values(actor,'code-test-leader-'||actor||'@example.invalid'),(member,'code-test-student-'||member||'@example.invalid'),(second_member,'code-test-student-'||second_member||'@example.invalid'),(retry_member,'code-test-student-'||retry_member||'@example.invalid');
 execute 'set local role service_role';
 insert into public.profiles(id,student_code,full_name,phone,role,recovery_hash) values(actor,'9898980','قائد اختبار','00000000000','leader','test');
 insert into public.events(id,title,location,start_at,end_at,points,qr_hash,created_by) values
 (past_event,'fixture past','test',now()-interval '2 days',now()-interval '1 day',20,'fixture-qr',actor),
 (current_event,'fixture current','test',now()-interval '10 minutes',now()+interval '1 hour',10,'fixture-qr',actor),
 (future_event,'fixture future','test',now()+interval '2 days',now()+interval '3 days',30,'fixture-qr',actor);

 result:=public.record_attendance_by_code(past_event,'9898981',actor);
 if not (result->>'pendingAccount')::boolean or (result->>'points')::int<>20 then raise exception 'Pending attendance did not save'; end if;
 result:=public.record_attendance_by_code(past_event,'9898981',actor);
 if not (result->>'alreadyRecorded')::boolean or (select count(*) from public.student_code_attendance where event_id=past_event)<>1 then raise exception 'Pending duplicate was not idempotent'; end if;
 if not exists(select 1 from public.leader_event_stats(actor) where event_id=past_event and rsvp_count=0 and attended_count=1 and pending_count=1) then raise exception 'Pending counts incorrect'; end if;
 roster:=public.leader_event_roster(actor,past_event);
 if jsonb_array_length(roster->'rows')<>1 or not (roster->'rows'->0->>'pending_account')::boolean then raise exception 'Pending roster missing'; end if;
 update public.events set points=35 where id=past_event;
 perform public.finish_registration(member,'9898981','طالب اختبار','00000000000','test','fixture-ciphertext');
 if (select count(*) from public.points_ledger where event_id=past_event and user_id=member)<>1 or (select sum(points) from public.points_ledger where user_id=member)<>20 then raise exception 'Signup failed to claim original points snapshot'; end if;
 if not exists(select 1 from public.attendance where event_id=past_event and user_id=member) then raise exception 'Signup missed attendance'; end if;
 if exists(select 1 from public.registrations where event_id=past_event and user_id=member) then raise exception 'Claim fabricated an RSVP'; end if;
 result:=public.record_attendance_by_code(past_event,'9898981',actor);
 if not (result->>'alreadyRecorded')::boolean or (select count(*) from public.points_ledger where event_id=past_event and user_id=member)<>1 then raise exception 'Post-signup duplicate awarded twice'; end if;
 if not exists(select 1 from public.leader_event_stats(actor) where event_id=past_event and rsvp_count=0 and attended_count=1 and pending_count=0) then raise exception 'Claim doubled attendance counts'; end if;

 perform public.finish_registration(second_member,'9898982','طالب ثان','00000000000','test','fixture-ciphertext');
 result:=public.record_attendance_by_code(past_event,'9898982',actor);
 if (result->>'pendingAccount')::boolean or (result->>'creditedPoints')::int<>35 then raise exception 'Existing walk-in did not get points'; end if;
 if exists(select 1 from public.registrations where event_id=past_event and user_id=second_member) then raise exception 'Walk-in fabricated an RSVP'; end if;

 failed:=false;
 begin perform public.check_in(current_event,member,member,'fixture-qr'); exception when others then failed:=true; end;
 if not failed then raise exception 'Student QR bypassed RSVP requirement'; end if;
 insert into public.registrations(event_id,user_id) values(current_event,member);
 perform public.check_in(current_event,member,member,'fixture-qr');
 perform public.record_attendance_by_code(current_event,'9898981',actor);
 if (select count(*) from public.points_ledger where event_id=current_event and user_id=member)<>1 then raise exception 'QR then manual double-awarded'; end if;
 if not exists(select 1 from public.leader_event_stats(actor) where event_id=current_event and rsvp_count=1 and attended_count=1) then raise exception 'RSVP/attendance counts incorrect'; end if;
 update public.registrations set going=false where event_id=current_event and user_id=member;
 if not exists(select 1 from public.leader_event_stats(actor) where event_id=current_event and rsvp_count=0 and attended_count=1) then raise exception 'Cancellation incorrectly changed attendance'; end if;

 perform public.record_attendance_by_code(past_event,'9898983',actor);
 failed:=false;
 begin perform public.finish_registration(retry_member,'9898983','فشل مؤقت','00000000000','test',null); exception when not_null_violation then failed:=true; end;
 if not failed or exists(select 1 from public.profiles where id=retry_member) or not exists(select 1 from public.student_code_attendance where event_id=past_event and student_code='9898983') then raise exception 'Failed signup lost pending credit or partially created a profile'; end if;
 perform public.finish_registration(retry_member,'9898983','نجاح المحاولة','00000000000','test','fixture-ciphertext');
 if (select sum(points) from public.points_ledger where user_id=retry_member)<>35 then raise exception 'Retry did not claim credit exactly once'; end if;

 failed:=false;
 begin perform public.record_attendance_by_code(future_event,'9898981',actor); exception when others then failed:=true; end;
 if not failed or exists(select 1 from public.student_code_attendance where event_id=future_event) then raise exception 'Future attendance was allowed'; end if;
 failed:=false;
 begin perform public.record_attendance_by_code(current_event,'9898982',member); exception when others then failed:=true; end;
 if not failed then raise exception 'Student was allowed to add attendance'; end if;
 failed:=false;
 begin perform public.leader_event_stats(member); exception when others then failed:=true; end;
 if not failed then raise exception 'Student could read private statistics'; end if;
 failed:=false;
 begin perform public.leader_event_roster(member,past_event); exception when others then failed:=true; end;
 if not failed then raise exception 'Student could read roster'; end if;
 if has_function_privilege('authenticated','public.record_attendance_by_code(uuid,text,uuid)','EXECUTE') or has_table_privilege('authenticated','public.student_code_attendance','SELECT') then raise exception 'Browser privileges too broad'; end if;
end $$;
select 'PASS pending credit, duplicates, automatic claim, original points snapshot, failed signup rollback/retry, walk-ins, RSVP counts, QR deduplication, cancellations, future restriction and leader-only access' as verification;
rollback;
