begin;

drop policy if exists app_users_admin_update on public.app_users;
create policy app_users_admin_update
on public.app_users
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

drop policy if exists user_roles_admin_manage on public.user_roles;
create policy user_roles_admin_manage
on public.user_roles
for all
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

drop policy if exists user_role_offices_admin_manage on public.user_role_offices;
create policy user_role_offices_admin_manage
on public.user_role_offices
for all
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

drop policy if exists employees_admin_insert on public.employees;
create policy employees_admin_insert
on public.employees
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists employees_admin_update on public.employees;
create policy employees_admin_update
on public.employees
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists employee_documents_admin_manage on public.employee_documents;
create policy employee_documents_admin_manage
on public.employee_documents
for all
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert
on public.audit_logs
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or actor_user_id = public.current_app_user_id()
);

commit;

