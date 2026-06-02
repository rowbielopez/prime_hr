-- 0053_employee_requests.sql
-- Adds the Employee Portal My Requests center for HR-related service and correction requests.
-- Requests do not modify official HR records directly; HR review workflow can be added separately.

begin;

create type public.employee_request_type as enum (
  'profile_correction',
  'employment_detail_correction',
  'pds_update',
  'service_record_correction',
  'document_request',
  'certificate_request',
  'leave_related_request',
  'account_login_concern',
  'other_hr_request'
);

create type public.employee_request_status as enum (
  'draft',
  'submitted',
  'under_review',
  'returned_for_revision',
  'approved',
  'rejected',
  'completed',
  'cancelled'
);

create table if not exists public.employee_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  request_type public.employee_request_type not null,
  subject text not null,
  description text not null,
  field_to_correct text null,
  current_value text null,
  requested_value text null,
  related_module text null,
  related_record_id uuid null,
  status public.employee_request_status not null default 'submitted',
  hr_remarks text null,
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  reviewed_by_user_id uuid null references public.app_users(id),
  cancelled_at timestamptz null,
  created_by_user_id uuid null references public.app_users(id),
  updated_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint employee_requests_subject_not_blank check (length(btrim(subject)) > 0),
  constraint employee_requests_description_not_blank check (length(btrim(description)) > 0),
  constraint employee_requests_submitted_at_chk check (status = 'draft' or submitted_at is not null),
  constraint employee_requests_cancelled_at_chk check (status <> 'cancelled' or cancelled_at is not null),
  constraint employee_requests_correction_requested_value_chk check (
    status = 'draft'
    or request_type not in ('profile_correction', 'employment_detail_correction', 'service_record_correction', 'account_login_concern')
    or requested_value is not null
  )
);

comment on table public.employee_requests is 'Employee-submitted HR service and correction requests. Official HR-controlled records are updated only through future HR review workflows.';
comment on column public.employee_requests.related_record_id is 'Internal optional pointer to a related record. Never display this value in employee UI.';

create index if not exists idx_employee_requests_employee_updated
  on public.employee_requests(employee_id, updated_at desc)
  where deleted_at is null;

create index if not exists idx_employee_requests_employee_status
  on public.employee_requests(employee_id, status)
  where deleted_at is null;

create index if not exists idx_employee_requests_active_duplicate
  on public.employee_requests(employee_id, request_type, field_to_correct, related_module)
  where deleted_at is null and status in ('submitted', 'under_review', 'returned_for_revision');

create index if not exists idx_employee_requests_scope_queue
  on public.employee_requests(campus_id, status, updated_at desc)
  where deleted_at is null;

drop trigger if exists trg_employee_requests_updated_at on public.employee_requests;
create trigger trg_employee_requests_updated_at
before update on public.employee_requests
for each row execute function public.set_updated_at();

create or replace function public.employee_request_is_self(p_employee_id uuid)
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
      and au.employee_id = p_employee_id
      and au.is_active = true
      and au.deleted_at is null
  );
$$;

create or replace function public.employee_request_self_scope_matches(
  p_employee_id uuid,
  p_campus_id uuid,
  p_office_id uuid
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
    join public.employees e on e.id = au.employee_id
    where au.id = public.current_app_user_id()
      and au.employee_id = p_employee_id
      and au.is_active = true
      and au.deleted_at is null
      and e.deleted_at is null
      and e.id = p_employee_id
      and e.campus_id = p_campus_id
      and (e.office_id is not distinct from p_office_id)
  );
$$;

grant execute on function public.employee_request_is_self(uuid) to authenticated;
grant execute on function public.employee_request_self_scope_matches(uuid, uuid, uuid) to authenticated;

create or replace function public.guard_employee_request_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.authz_campus_hr_office_write(new.campus_id, new.office_id) then
    return new;
  end if;

  if not public.employee_request_is_self(old.employee_id) then
    raise exception 'employee request update not allowed';
  end if;

  if new.employee_id is distinct from old.employee_id
    or new.campus_id is distinct from old.campus_id
    or new.office_id is distinct from old.office_id
    or new.related_record_id is distinct from old.related_record_id
    or new.hr_remarks is distinct from old.hr_remarks
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by_user_id is distinct from old.reviewed_by_user_id
    or new.deleted_at is distinct from old.deleted_at then
    raise exception 'employee request protected fields cannot be changed';
  end if;

  if old.status in ('draft', 'returned_for_revision') and new.status in ('draft', 'submitted') then
    return new;
  end if;

  if old.status in ('draft', 'submitted') and new.status = 'cancelled' then
    if new.request_type is distinct from old.request_type
      or new.subject is distinct from old.subject
      or new.description is distinct from old.description
      or new.field_to_correct is distinct from old.field_to_correct
      or new.current_value is distinct from old.current_value
      or new.requested_value is distinct from old.requested_value
      or new.related_module is distinct from old.related_module
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'employee request content cannot be changed while cancelling';
    end if;

    if new.cancelled_at is null then
      raise exception 'cancelled_at is required when cancelling a request';
    end if;

    return new;
  end if;

  raise exception 'employee request status transition not allowed';
end;
$$;

drop trigger if exists trg_employee_requests_self_update_guard on public.employee_requests;
create trigger trg_employee_requests_self_update_guard
before update on public.employee_requests
for each row execute function public.guard_employee_request_self_update();

alter table public.employee_requests enable row level security;

drop policy if exists employee_requests_employee_select on public.employee_requests;
create policy employee_requests_employee_select on public.employee_requests
for select to authenticated
using (
  deleted_at is null
  and public.employee_request_is_self(employee_id)
);

drop policy if exists employee_requests_hr_select on public.employee_requests;
create policy employee_requests_hr_select on public.employee_requests
for select to authenticated
using (
  deleted_at is null
  and (
    public.has_active_role('super_admin')
    or public.has_active_role('central_hr_admin')
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = public.current_app_user_id()
        and ur.is_active = true
        and (ur.effective_from is null or ur.effective_from <= current_date)
        and (ur.effective_to is null or ur.effective_to >= current_date)
        and ur.campus_id = employee_requests.campus_id
        and r.code in ('campus_hr_officer', 'office_unit_head')
        and (
          employee_requests.office_id is null
          or not exists (select 1 from public.user_role_offices uro where uro.user_role_id = ur.id)
          or exists (
            select 1
            from public.user_role_offices uro2
            where uro2.user_role_id = ur.id
              and uro2.office_id = employee_requests.office_id
          )
        )
    )
  )
);

drop policy if exists employee_requests_employee_insert on public.employee_requests;
create policy employee_requests_employee_insert on public.employee_requests
for insert to authenticated
with check (
  status in ('draft', 'submitted')
  and deleted_at is null
  and hr_remarks is null
  and reviewed_at is null
  and reviewed_by_user_id is null
  and public.employee_request_self_scope_matches(employee_id, campus_id, office_id)
);

drop policy if exists employee_requests_employee_update on public.employee_requests;
create policy employee_requests_employee_update on public.employee_requests
for update to authenticated
using (
  deleted_at is null
  and status in ('draft', 'submitted', 'returned_for_revision')
  and public.employee_request_is_self(employee_id)
)
with check (
  deleted_at is null
  and status in ('draft', 'submitted', 'cancelled')
  and public.employee_request_self_scope_matches(employee_id, campus_id, office_id)
);

drop policy if exists employee_requests_hr_update on public.employee_requests;
create policy employee_requests_hr_update on public.employee_requests
for update to authenticated
using (public.authz_campus_hr_office_write(campus_id, office_id))
with check (public.authz_campus_hr_office_write(campus_id, office_id));

commit;
