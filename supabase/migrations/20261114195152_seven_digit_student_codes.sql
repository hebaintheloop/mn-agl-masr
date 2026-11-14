-- Student codes are seven digits. Preserve account IDs, passwords and all linked records.
alter table public.profiles drop constraint profiles_student_code_check;
update public.profiles set student_code=replace(student_code,'-','') where student_code like '%-%';
alter table public.profiles add constraint profiles_student_code_check check(student_code ~ '^[0-9]{7}$');
