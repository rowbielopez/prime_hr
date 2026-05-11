begin;

-- Resolve the employee profile linked to the signed-in app user (for self-service L&D).
create or replace function public.current_user_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select au.employee_id
  from public.app_users au
  where au.auth_user_id = auth.uid()
    and au.deleted_at is null
  limit 1;
$$;

grant execute on function public.current_user_employee_id() to authenticated;

do $$ begin
  create type public.ld_training_modality as enum ('classroom', 'online', 'blended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_program_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_plan_status as enum ('draft', 'approved', 'active', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_session_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_request_status as enum ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_participant_source as enum ('assigned', 'nominated', 'self_registered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_attendance_status as enum ('registered', 'attended', 'absent', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_completion_status as enum ('not_started', 'in_progress', 'completed', 'waived', 'not_completed');
exception when duplicate_object then null; end $$;

create table if not exists public.ld_training_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  modality public.ld_training_modality not null default 'classroom',
  duration_hours numeric(6, 2) not null default 1 check (duration_hours > 0),
  campus_id uuid null references public.campuses(id),
  status public.ld_program_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_ld_training_programs_campus_id on public.ld_training_programs(campus_id);
create index if not exists idx_ld_training_programs_status on public.ld_training_programs(status);
create index if not exists idx_ld_training_programs_updated_at on public.ld_training_programs(updated_at desc);

drop trigger if exists trg_ld_training_programs_updated_at on public.ld_training_programs;
create trigger trg_ld_training_programs_updated_at
before update on public.ld_training_programs
for each row execute function public.set_updated_at();

create table if not exists public.ld_annual_plans (
  id uuid primary key default gen_random_uuid(),
  year integer not null check (year between 2000 and 2100),
  title text not null,
  campus_id uuid not null references public.campuses(id),
  status public.ld_plan_status not null default 'draft',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (campus_id, year, title)
);

create index if not exists idx_ld_annual_plans_campus_id on public.ld_annual_plans(campus_id);
create index if not exists idx_ld_annual_plans_year on public.ld_annual_plans(year desc);

drop trigger if exists trg_ld_annual_plans_updated_at on public.ld_annual_plans;
create trigger trg_ld_annual_plans_updated_at
before update on public.ld_annual_plans
for each row execute function public.set_updated_at();

create table if not exists public.ld_annual_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ld_annual_plans(id) on delete cascade,
  program_id uuid not null references public.ld_training_programs(id),
  quarter smallint not null check (quarter between 1 and 4),
  notes text null,
  created_at timestamptz not null default now(),
  unique (plan_id, program_id, quarter)
);

create index if not exists idx_ld_annual_plan_items_plan_id on public.ld_annual_plan_items(plan_id);
create index if not exists idx_ld_annual_plan_items_program_id on public.ld_annual_plan_items(program_id);

create table if not exists public.ld_training_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ld_training_programs(id),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text null,
  campus_id uuid not null references public.campuses(id),
  capacity integer null check (capacity is null or capacity > 0),
  status public.ld_session_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  check (ends_at > starts_at)
);

create index if not exists idx_ld_training_sessions_campus_id on public.ld_training_sessions(campus_id);
create index if not exists idx_ld_training_sessions_program_id on public.ld_training_sessions(program_id);
create index if not exists idx_ld_training_sessions_starts_at on public.ld_training_sessions(starts_at desc);
create index if not exists idx_ld_training_sessions_status on public.ld_training_sessions(status);

drop trigger if exists trg_ld_training_sessions_updated_at on public.ld_training_sessions;
create trigger trg_ld_training_sessions_updated_at
before update on public.ld_training_sessions
for each row execute function public.set_updated_at();

create or replace function public.validate_ld_session_program_campus()
returns trigger
language plpgsql
as $$
declare
  prog_campus uuid;
begin
  select p.campus_id into prog_campus
  from public.ld_training_programs p
  where p.id = new.program_id;

  if prog_campus is not null and prog_campus <> new.campus_id then
    raise exception 'Session campus must match program campus when program is campus-specific';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ld_training_sessions_validate_program_campus on public.ld_training_sessions;
create trigger trg_ld_training_sessions_validate_program_campus
before insert or update on public.ld_training_sessions
for each row execute function public.validate_ld_session_program_campus();

create table if not exists public.ld_training_requests (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  requester_employee_id uuid not null references public.employees(id),
  program_id uuid null references public.ld_training_programs(id),
  custom_title text null,
  justification text not null,
  status public.ld_request_status not null default 'draft',
  reviewer_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    program_id is not null
    or (custom_title is not null and length(trim(custom_title)) > 0)
  )
);

create index if not exists idx_ld_training_requests_campus_id on public.ld_training_requests(campus_id);
create index if not exists idx_ld_training_requests_requester on public.ld_training_requests(requester_employee_id);
create index if not exists idx_ld_training_requests_status on public.ld_training_requests(status);

drop trigger if exists trg_ld_training_requests_updated_at on public.ld_training_requests;
create trigger trg_ld_training_requests_updated_at
before update on public.ld_training_requests
for each row execute function public.set_updated_at();

create table if not exists public.ld_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ld_training_sessions(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  source public.ld_participant_source not null default 'assigned',
  attendance public.ld_attendance_status not null default 'registered',
  completion public.ld_completion_status not null default 'not_started',
  completed_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, employee_id)
);

create index if not exists idx_ld_session_participants_session_id on public.ld_session_participants(session_id);
create index if not exists idx_ld_session_participants_employee_id on public.ld_session_participants(employee_id);

drop trigger if exists trg_ld_session_participants_updated_at on public.ld_session_participants;
create trigger trg_ld_session_participants_updated_at
before update on public.ld_session_participants
for each row execute function public.set_updated_at();

-- Row level security (align with recruitment + employee self-service reads)
alter table public.ld_training_programs enable row level security;
alter table public.ld_annual_plans enable row level security;
alter table public.ld_annual_plan_items enable row level security;
alter table public.ld_training_sessions enable row level security;
alter table public.ld_training_requests enable row level security;
alter table public.ld_session_participants enable row level security;

drop policy if exists ld_training_programs_scoped_select on public.ld_training_programs;
create policy ld_training_programs_scoped_select
on public.ld_training_programs
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
  or campus_id is null
  or (
    status = 'active'
    and (
      campus_id is null
      or campus_id = (
        select e.campus_id
        from public.employees e
        where e.id = public.current_user_employee_id()
      )
    )
  )
);

drop policy if exists ld_training_programs_scoped_insert on public.ld_training_programs;
create policy ld_training_programs_scoped_insert
on public.ld_training_programs
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists ld_training_programs_scoped_update on public.ld_training_programs;
create policy ld_training_programs_scoped_update
on public.ld_training_programs
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

drop policy if exists ld_annual_plans_scoped_select on public.ld_annual_plans;
create policy ld_annual_plans_scoped_select
on public.ld_annual_plans
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
);

drop policy if exists ld_annual_plans_scoped_insert on public.ld_annual_plans;
create policy ld_annual_plans_scoped_insert
on public.ld_annual_plans
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists ld_annual_plans_scoped_update on public.ld_annual_plans;
create policy ld_annual_plans_scoped_update
on public.ld_annual_plans
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

drop policy if exists ld_annual_plan_items_scoped_select on public.ld_annual_plan_items;
create policy ld_annual_plan_items_scoped_select
on public.ld_annual_plan_items
for select
to authenticated
using (
  exists (
    select 1
    from public.ld_annual_plans p
    where p.id = ld_annual_plan_items.plan_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', p.campus_id)
        or public.has_active_role('office_unit_head', p.campus_id)
        or public.has_active_role('committee_member', p.campus_id)
      )
  )
);

drop policy if exists ld_annual_plan_items_scoped_insert on public.ld_annual_plan_items;
create policy ld_annual_plan_items_scoped_insert
on public.ld_annual_plan_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ld_annual_plans p
    where p.id = ld_annual_plan_items.plan_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', p.campus_id)
      )
  )
);

drop policy if exists ld_annual_plan_items_scoped_update on public.ld_annual_plan_items;
create policy ld_annual_plan_items_scoped_update
on public.ld_annual_plan_items
for update
to authenticated
using (
  exists (
    select 1
    from public.ld_annual_plans p
    where p.id = ld_annual_plan_items.plan_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', p.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.ld_annual_plans p
    where p.id = ld_annual_plan_items.plan_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', p.campus_id)
      )
  )
);

drop policy if exists ld_annual_plan_items_scoped_delete on public.ld_annual_plan_items;
create policy ld_annual_plan_items_scoped_delete
on public.ld_annual_plan_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.ld_annual_plans p
    where p.id = ld_annual_plan_items.plan_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', p.campus_id)
      )
  )
);

drop policy if exists ld_training_sessions_scoped_select on public.ld_training_sessions;
create policy ld_training_sessions_scoped_select
on public.ld_training_sessions
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
  or (
    status in ('scheduled', 'in_progress')
    and campus_id = (
      select e.campus_id
      from public.employees e
      where e.id = public.current_user_employee_id()
    )
  )
);

drop policy if exists ld_training_sessions_scoped_insert on public.ld_training_sessions;
create policy ld_training_sessions_scoped_insert
on public.ld_training_sessions
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists ld_training_sessions_scoped_update on public.ld_training_sessions;
create policy ld_training_sessions_scoped_update
on public.ld_training_sessions
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

drop policy if exists ld_training_requests_scoped_select on public.ld_training_requests;
create policy ld_training_requests_scoped_select
on public.ld_training_requests
for select
to authenticated
using (
  requester_employee_id = public.current_user_employee_id()
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
    requester_employee_id = public.current_user_employee_id()
    and public.current_user_employee_id() is not null
  )
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
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
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  (
    requester_employee_id = public.current_user_employee_id()
    and public.current_user_employee_id() is not null
  )
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists ld_session_participants_scoped_select on public.ld_session_participants;
create policy ld_session_participants_scoped_select
on public.ld_session_participants
for select
to authenticated
using (
  employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or exists (
    select 1
    from public.ld_training_sessions s
    where s.id = ld_session_participants.session_id
      and (
        public.has_active_role('campus_hr_officer', s.campus_id)
        or public.has_active_role('office_unit_head', s.campus_id)
        or public.has_active_role('committee_member', s.campus_id)
      )
  )
);

drop policy if exists ld_session_participants_scoped_insert on public.ld_session_participants;
create policy ld_session_participants_scoped_insert
on public.ld_session_participants
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or exists (
    select 1
    from public.ld_training_sessions s
    where s.id = ld_session_participants.session_id
      and public.has_active_role('campus_hr_officer', s.campus_id)
  )
);

drop policy if exists ld_session_participants_scoped_update on public.ld_session_participants;
create policy ld_session_participants_scoped_update
on public.ld_session_participants
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or exists (
    select 1
    from public.ld_training_sessions s
    where s.id = ld_session_participants.session_id
      and public.has_active_role('campus_hr_officer', s.campus_id)
  )
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or exists (
    select 1
    from public.ld_training_sessions s
    where s.id = ld_session_participants.session_id
      and public.has_active_role('campus_hr_officer', s.campus_id)
  )
);

drop policy if exists ld_session_participants_scoped_delete on public.ld_session_participants;
create policy ld_session_participants_scoped_delete
on public.ld_session_participants
for delete
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or exists (
    select 1
    from public.ld_training_sessions s
    where s.id = ld_session_participants.session_id
      and public.has_active_role('campus_hr_officer', s.campus_id)
  )
);

commit;
