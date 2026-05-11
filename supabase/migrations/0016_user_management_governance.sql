begin;

drop policy if exists app_users_admin_update on public.app_users;

create policy app_users_admin_update
on public.app_users
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or (
    public.has_active_role('central_hr_admin')
    and not exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = app_users.id
        and ur.is_active = true
        and (ur.effective_from is null or ur.effective_from <= current_date)
        and (ur.effective_to is null or ur.effective_to >= current_date)
        and r.code = 'super_admin'
    )
  )
)
with check (
  public.has_active_role('super_admin')
  or (
    public.has_active_role('central_hr_admin')
    and not exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = app_users.id
        and ur.is_active = true
        and (ur.effective_from is null or ur.effective_from <= current_date)
        and (ur.effective_to is null or ur.effective_to >= current_date)
        and r.code = 'super_admin'
    )
  )
);

create or replace function public.apply_user_management_bundle(
  p_target_user_id uuid,
  p_is_active boolean,
  p_status public.user_status,
  p_primary_campus_id uuid,
  p_primary_office_id uuid,
  p_role_id uuid,
  p_role_campus_id uuid,
  p_office_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_role_id uuid;
  v_today date := current_date;
begin
  update public.app_users
  set
    is_active = p_is_active,
    status = p_status,
    primary_campus_id = p_primary_campus_id,
    primary_office_id = p_primary_office_id
  where id = p_target_user_id;

  update public.user_roles
  set is_active = false
  where user_id = p_target_user_id
    and is_active = true;

  insert into public.user_roles (
    user_id,
    role_id,
    campus_id,
    is_active,
    effective_from,
    effective_to
  )
  values (
    p_target_user_id,
    p_role_id,
    p_role_campus_id,
    true,
    v_today,
    null
  )
  on conflict (user_id, role_id, campus_id) do update set
    is_active = excluded.is_active,
    effective_from = excluded.effective_from,
    effective_to = excluded.effective_to
  returning id into v_user_role_id;

  delete from public.user_role_offices
  where user_role_id = v_user_role_id;

  if p_office_id is not null then
    insert into public.user_role_offices (user_role_id, office_id)
    values (v_user_role_id, p_office_id);
  end if;
end;
$$;

grant execute on function public.apply_user_management_bundle(
  uuid,
  boolean,
  public.user_status,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) to authenticated;

commit;
