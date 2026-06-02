-- Migration: 0057_public_careers_reference_no_fn.sql
-- Purpose: Expose a security-definer helper that advances the public
-- application reference sequence so server actions can call it via PostgREST
-- (`supabase.rpc`). nextval() is not directly exposed; this function wraps it
-- safely and returns a fully formatted reference number.

create or replace function public.next_application_reference_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_year int := extract(year from current_date)::int;
begin
  v_seq := nextval('public.recruitment_application_reference_seq');
  return format('APP-%s-%s', v_year, lpad(v_seq::text, 6, '0'));
end;
$$;

revoke all on function public.next_application_reference_no() from public;
-- Only the service role calls this from the public careers server action.
grant execute on function public.next_application_reference_no() to service_role;

comment on function public.next_application_reference_no() is
  'Advances recruitment_application_reference_seq and returns a formatted APP-YYYY-NNNNNN reference number. Service role only.';
