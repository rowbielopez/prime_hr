begin;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select au.id
  from public.app_users au
  where au.auth_user_id = auth.uid()
    and au.deleted_at is null
  limit 1;
$$;

create or replace function public.has_active_role(role_code text, scope_campus_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = public.current_app_user_id()
      and ur.is_active = true
      and (ur.effective_from is null or ur.effective_from <= current_date)
      and (ur.effective_to is null or ur.effective_to >= current_date)
      and r.code = role_code
      and (scope_campus_id is null or ur.campus_id is null or ur.campus_id = scope_campus_id)
  );
$$;

grant execute on function public.current_app_user_id() to authenticated;
grant execute on function public.has_active_role(text, uuid) to authenticated;

alter table public.app_users enable row level security;
alter table public.user_roles enable row level security;
alter table public.roles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_documents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.campuses enable row level security;
alter table public.offices enable row level security;

drop policy if exists app_users_self_or_admin_select on public.app_users;
create policy app_users_self_or_admin_select
on public.app_users
for select
to authenticated
using (
  auth.uid() = auth_user_id
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

drop policy if exists app_users_self_update on public.app_users;
create policy app_users_self_update
on public.app_users
for update
to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists roles_authenticated_select on public.roles;
create policy roles_authenticated_select
on public.roles
for select
to authenticated
using (true);

drop policy if exists user_roles_self_or_admin_select on public.user_roles;
create policy user_roles_self_or_admin_select
on public.user_roles
for select
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

drop policy if exists campuses_authenticated_select on public.campuses;
create policy campuses_authenticated_select
on public.campuses
for select
to authenticated
using (true);

drop policy if exists offices_authenticated_select on public.offices;
create policy offices_authenticated_select
on public.offices
for select
to authenticated
using (true);

drop policy if exists employees_scoped_select on public.employees;
create policy employees_scoped_select
on public.employees
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
);

drop policy if exists employee_documents_scoped_select on public.employee_documents;
create policy employee_documents_scoped_select
on public.employee_documents
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
);

drop policy if exists audit_logs_privileged_select on public.audit_logs;
create policy audit_logs_privileged_select
on public.audit_logs
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

commit;

