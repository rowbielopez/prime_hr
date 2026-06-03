begin;

create or replace function public.authz_employee_self_access(
  p_employee_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users au
    where au.id = public.current_app_user_id()
      and au.deleted_at is null
      and au.status = 'active'
      and au.is_active = true
      and au.employee_id = p_employee_id
  );
$$;

grant execute on function public.authz_employee_self_access(uuid) to authenticated;

drop policy if exists employees_scoped_select on public.employees;
create policy employees_scoped_select
on public.employees
for select
to authenticated
using (
  deleted_at is null
  and (
    public.authz_scoped_campus_office_access(campus_id, office_id)
    or public.authz_employee_self_access(id)
  )
);

drop policy if exists employee_documents_scoped_select on public.employee_documents;
create policy employee_documents_scoped_select
on public.employee_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_id
      and e.deleted_at is null
      and (
        public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
        or public.authz_employee_self_access(e.id)
      )
  )
);

commit;