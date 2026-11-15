alter table public.events add column dress_code text not null default '' check (char_length(dress_code) <= 300);
