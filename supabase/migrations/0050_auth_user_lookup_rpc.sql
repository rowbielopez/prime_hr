-- Secure RPC for admin-side lookup of auth user ID by email.
-- Used by manual provisioning: super_admin can create an app_users record
-- even before the employee has successfully signed in.
-- Security: SECURITY DEFINER + explicit search_path prevents privilege escalation.

begin;

create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from auth.users
  where lower(trim(email)) = lower(trim(p_email))
  limit 1;
  return v_id;
end;
$$;

-- Only service-role and super_admin can call this; revoke public access.
revoke execute on function public.get_auth_user_id_by_email(text) from public, anon;
grant  execute on function public.get_auth_user_id_by_email(text) to service_role;

commit;
