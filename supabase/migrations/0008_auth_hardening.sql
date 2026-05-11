begin;

create or replace function public.is_role_globally_scoped(role_code text)
returns boolean
language sql
stable
as $$
  select role_code in ('super_admin', 'central_hr_admin');
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
      and (
        scope_campus_id is null
        or (
          public.is_role_globally_scoped(r.code)
          and ur.campus_id is null
        )
        or ur.campus_id = scope_campus_id
      )
  );
$$;

create or replace function public.validate_user_role_scope()
returns trigger
language plpgsql
as $$
declare
  target_role_code text;
begin
  select r.code into target_role_code
  from public.roles r
  where r.id = new.role_id;

  if target_role_code is null then
    raise exception 'role_id does not reference a valid role';
  end if;

  if not public.is_role_globally_scoped(target_role_code) and new.campus_id is null then
    raise exception 'campus_id is required for scoped roles';
  end if;

  if public.is_role_globally_scoped(target_role_code) and new.campus_id is not null then
    raise exception 'campus_id must be null for global roles';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_roles_validate_scope on public.user_roles;
create trigger trg_user_roles_validate_scope
before insert or update on public.user_roles
for each row execute function public.validate_user_role_scope();

create or replace function public.prevent_self_authz_field_updates()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() = old.auth_user_id then
    if new.status is distinct from old.status
      or new.is_active is distinct from old.is_active
      or new.primary_campus_id is distinct from old.primary_campus_id
      or new.primary_office_id is distinct from old.primary_office_id
      or new.employee_id is distinct from old.employee_id
    then
      raise exception 'updating authorization-sensitive fields is not allowed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_users_prevent_self_authz_update on public.app_users;
create trigger trg_app_users_prevent_self_authz_update
before update on public.app_users
for each row execute function public.prevent_self_authz_field_updates();

create or replace function public.can_manage_role_code(target_role_code text)
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
      and target_role_code <> 'super_admin'
    );
$$;

create or replace function public.can_manage_user_role(existing_user_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_role_code(r.code)
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.id = existing_user_role_id;
$$;

drop policy if exists app_users_self_update on public.app_users;
drop policy if exists user_roles_admin_manage on public.user_roles;

drop policy if exists user_roles_admin_insert on public.user_roles;
create policy user_roles_admin_insert
on public.user_roles
for insert
to authenticated
with check (
  public.can_manage_role_code(
    (
      select code
      from public.roles r
      where r.id = role_id
    )
  )
);

drop policy if exists user_roles_admin_update on public.user_roles;
create policy user_roles_admin_update
on public.user_roles
for update
to authenticated
using (public.can_manage_user_role(id))
with check (
  public.can_manage_role_code(
    (
      select code
      from public.roles r
      where r.id = role_id
    )
  )
);

drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_delete
on public.user_roles
for delete
to authenticated
using (public.can_manage_user_role(id));

commit;
