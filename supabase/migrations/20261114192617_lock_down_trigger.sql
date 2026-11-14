-- This pre-existing DDL trigger must never be callable by API users.
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
