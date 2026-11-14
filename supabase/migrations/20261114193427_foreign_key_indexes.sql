create index if not exists attendance_actor on public.attendance(actor_id);
create index if not exists events_creator on public.events(created_by);
