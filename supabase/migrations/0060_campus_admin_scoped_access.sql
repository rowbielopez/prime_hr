begin;

-- Campus HR administrators can manage non-global user assignments only inside
-- their assigned campus scopes. Global role and campus-reference ownership stays
-- with central/global administrators.

create or replace function public.is_active_global_user(target_user_id uuid)
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
    where ur.user_id = target_user_id
      and ur.is_active = true
      and (ur.effective_from is null or ur.effective_from <= current_date)
      and (ur.effective_to is null or ur.effective_to >= current_date)
      and public.is_role_globally_scoped(r.code)
  );
$$;

create or replace function public.can_manage_app_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_active_role('super_admin')
    or (
      public.has_active_role('central_hr_admin')
      and not exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = target_user_id
          and ur.is_active = true
          and (ur.effective_from is null or ur.effective_from <= current_date)
          and (ur.effective_to is null or ur.effective_to >= current_date)
          and r.code = 'super_admin'
      )
    )
    or (
      not public.is_active_global_user(target_user_id)
      and exists (
        select 1
        from public.app_users au
        left join public.employees e on e.id = au.employee_id and e.deleted_at is null
        where au.id = target_user_id
          and (
            (au.primary_campus_id is not null and public.has_active_role('campus_hr_officer', au.primary_campus_id))
            or (e.campus_id is not null and public.has_active_role('campus_hr_officer', e.campus_id))
            or exists (
              select 1
              from public.user_roles scoped_ur
              join public.roles scoped_r on scoped_r.id = scoped_ur.role_id
              where scoped_ur.user_id = au.id
                and scoped_ur.is_active = true
                and (scoped_ur.effective_from is null or scoped_ur.effective_from <= current_date)
                and (scoped_ur.effective_to is null or scoped_ur.effective_to >= current_date)
                and not public.is_role_globally_scoped(scoped_r.code)
                and scoped_ur.campus_id is not null
                and public.has_active_role('campus_hr_officer', scoped_ur.campus_id)
            )
          )
      )
    );
$$;

create or replace function public.can_manage_user_role_assignment(
  target_user_id uuid,
  target_role_id uuid,
  target_campus_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_active_role('super_admin')
    or (
      public.has_active_role('central_hr_admin')
      and coalesce((select code <> 'super_admin' from public.roles where id = target_role_id), false)
    )
    or (
      public.can_manage_app_user(target_user_id)
      and target_campus_id is not null
      and public.has_active_role('campus_hr_officer', target_campus_id)
      and coalesce((select not public.is_role_globally_scoped(code) from public.roles where id = target_role_id), false)
    );
$$;

create or replace function public.can_manage_user_role_office(
  target_user_role_id uuid,
  target_office_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    left join public.offices o on o.id = target_office_id and o.deleted_at is null
    where ur.id = target_user_role_id
      and public.can_manage_user_role_assignment(ur.user_id, ur.role_id, ur.campus_id)
      and (target_office_id is null or o.campus_id = ur.campus_id)
  );
$$;

-- App user reads for campus HR beyond linked-employee rows: users scoped by
-- primary campus or active non-global role in the actor's campus.
drop policy if exists app_users_campus_hr_select_scoped on public.app_users;
create policy app_users_campus_hr_select_scoped
on public.app_users
for select
to authenticated
using (
  public.can_manage_app_user(id)
);

-- App user updates for scoped user activation, primary campus/office updates,
-- and employee relinking through guarded server actions.
drop policy if exists app_users_admin_update on public.app_users;
create policy app_users_admin_update
on public.app_users
for update
to authenticated
using (public.can_manage_app_user(id))
with check (public.can_manage_app_user(id));

-- Campus HR needs to read active roles for users they can manage.
drop policy if exists user_roles_campus_hr_select_scoped on public.user_roles;
create policy user_roles_campus_hr_select_scoped
on public.user_roles
for select
to authenticated
using (public.can_manage_app_user(user_id));

-- Replace user-role mutation policies with row-aware scoped checks.
drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert
on public.user_roles
for insert
to authenticated
with check (public.can_manage_user_role_assignment(user_id, role_id, campus_id));

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update
on public.user_roles
for update
to authenticated
using (public.can_manage_user_role_assignment(user_id, role_id, campus_id))
with check (public.can_manage_user_role_assignment(user_id, role_id, campus_id));

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete
on public.user_roles
for delete
to authenticated
using (public.can_manage_user_role_assignment(user_id, role_id, campus_id));

-- Office restrictions assigned to managed roles are visible and mutable to the
-- same scoped actor, constrained to offices in the role campus.
drop policy if exists user_role_offices_campus_hr_select_scoped on public.user_role_offices;
create policy user_role_offices_campus_hr_select_scoped
on public.user_role_offices
for select
to authenticated
using (public.can_manage_user_role_office(user_role_id, office_id));

drop policy if exists user_role_offices_admin_manage on public.user_role_offices;
create policy user_role_offices_admin_manage
on public.user_role_offices
for all
to authenticated
using (public.can_manage_user_role_office(user_role_id, office_id))
with check (public.can_manage_user_role_office(user_role_id, office_id));

-- Campus HR can create/update offices only inside their assigned campuses.
drop policy if exists offices_super_admin_insert on public.offices;
create policy offices_super_admin_insert
on public.offices
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists offices_super_admin_update on public.offices;
create policy offices_super_admin_update
on public.offices
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

-- Campus-scoped audit visibility. Rows without a campus remain central/global.
drop policy if exists audit_logs_campus_hr_select_scoped on public.audit_logs;
create policy audit_logs_campus_hr_select_scoped
on public.audit_logs
for select
to authenticated
using (
  campus_id is not null
  and public.has_active_role('campus_hr_officer', campus_id)
);

commit;
