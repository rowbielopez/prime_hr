begin;

do $$ begin
  create type public.ld_request_kind as enum ('self_request', 'nomination');
exception when duplicate_object then null; end $$;

alter table public.ld_training_requests
  add column if not exists request_kind public.ld_request_kind not null default 'self_request';

alter table public.ld_training_requests
  add column if not exists submitted_by_employee_id uuid null references public.employees(id);

alter table public.ld_training_requests
  add column if not exists remarks text null;

create index if not exists idx_ld_training_requests_submitted_by on public.ld_training_requests(submitted_by_employee_id);

update public.ld_training_requests
set
  submitted_by_employee_id = coalesce(submitted_by_employee_id, requester_employee_id),
  request_kind = 'self_request'
where submitted_by_employee_id is null;

create or replace function public.validate_ld_request_subject_campus()
returns trigger
language plpgsql
as $$
declare
  subj_campus uuid;
begin
  select e.campus_id into subj_campus
  from public.employees e
  where e.id = new.requester_employee_id;

  if subj_campus is null then
    raise exception 'Subject employee is invalid or inactive';
  end if;

  if subj_campus <> new.campus_id then
    raise exception 'Request campus must match the subject employee campus';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ld_training_requests_validate_subject_campus on public.ld_training_requests;
create trigger trg_ld_training_requests_validate_subject_campus
before insert or update on public.ld_training_requests
for each row execute function public.validate_ld_request_subject_campus();

-- RLS: nominations + submitter visibility
drop policy if exists ld_training_requests_scoped_select on public.ld_training_requests;
create policy ld_training_requests_scoped_select
on public.ld_training_requests
for select
to authenticated
using (
  requester_employee_id = public.current_user_employee_id()
  or submitted_by_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists ld_training_requests_scoped_insert on public.ld_training_requests;
create policy ld_training_requests_scoped_insert
on public.ld_training_requests
for insert
to authenticated
with check (
  (
    request_kind = 'self_request'
    and requester_employee_id = public.current_user_employee_id()
    and public.current_user_employee_id() is not null
    and (
      submitted_by_employee_id is null
      or submitted_by_employee_id = requester_employee_id
      or submitted_by_employee_id = public.current_user_employee_id()
    )
  )
  or (
    request_kind = 'nomination'
    and (
      public.has_active_role('super_admin')
      or public.has_active_role('central_hr_admin')
      or public.has_active_role('campus_hr_officer', campus_id)
      or public.has_active_role('office_unit_head', campus_id)
    )
  )
);

drop policy if exists ld_training_requests_scoped_update on public.ld_training_requests;
create policy ld_training_requests_scoped_update
on public.ld_training_requests
for update
to authenticated
using (
  (
    requester_employee_id = public.current_user_employee_id()
    and public.current_user_employee_id() is not null
  )
  or submitted_by_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  (
    requester_employee_id = public.current_user_employee_id()
    and public.current_user_employee_id() is not null
  )
  or submitted_by_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

commit;
