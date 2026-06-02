-- 0054_employee_request_review_workflow.sql
-- Adds HR review completion metadata and request-specific status history.

begin;

alter table public.employee_requests
  add column if not exists completed_at timestamptz null,
  add column if not exists internal_notes text null;

update public.employee_requests
set completed_at = coalesce(reviewed_at, updated_at)
where status = 'completed'
  and completed_at is null;

do $$ begin
  alter table public.employee_requests
    add constraint employee_requests_completed_at_chk
    check (status <> 'completed' or completed_at is not null);
exception when duplicate_object then null; end $$;

comment on column public.employee_requests.completed_at is 'Timestamp when HR marked the employee request as completed after any required manual work.';
comment on column public.employee_requests.internal_notes is 'HR-only internal review notes. Never expose to employee self-service UI.';

create table if not exists public.employee_request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.employee_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  from_status public.employee_request_status null,
  to_status public.employee_request_status not null,
  remarks text null,
  internal_notes text null,
  actor_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now()
);

comment on table public.employee_request_status_history is 'HR review status changes for employee-submitted requests.';
comment on column public.employee_request_status_history.internal_notes is 'HR-only internal notes for the status change. Never expose to employee self-service UI.';

create index if not exists idx_employee_request_status_history_request_created
  on public.employee_request_status_history(request_id, created_at desc);

create index if not exists idx_employee_request_status_history_scope_created
  on public.employee_request_status_history(campus_id, office_id, created_at desc);

alter table public.employee_request_status_history enable row level security;

drop policy if exists employee_request_status_history_hr_select on public.employee_request_status_history;
create policy employee_request_status_history_hr_select on public.employee_request_status_history
for select to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_scoped_campus_office_access(campus_id, office_id)
);

drop policy if exists employee_request_status_history_hr_insert on public.employee_request_status_history;
create policy employee_request_status_history_hr_insert on public.employee_request_status_history
for insert to authenticated
with check (public.authz_campus_hr_office_write(campus_id, office_id));

commit;