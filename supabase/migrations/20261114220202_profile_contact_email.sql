-- Private contact address, separate from the immutable student-code login alias.
alter table public.profiles add column email text;
alter table public.profiles add constraint profiles_contact_email_length check (email is null or length(email) between 3 and 254);
