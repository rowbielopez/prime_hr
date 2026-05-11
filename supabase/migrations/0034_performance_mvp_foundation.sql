begin;

do $$ begin
  create type public.perf_cycle_status as enum ('draft', 'active', 'closed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.perf_record_status as enum (
    'draft',
    'submitted',
    'under_review',
    'needs_revision',
    'approved',
    'finalized',
    'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.perf_review_decision as enum ('approve', 'request_revision');
exception when duplicate_object then null; end $$;

create table if not exists public.performance_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text null,
  start_date date not null,
  submission_deadline date not null,
  review_deadline date not null,
  end_date date not null,
  campus_id uuid null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.perf_cycle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  check (start_date <= submission_deadline),
  check (submission_deadline <= review_deadline),
  check (review_deadline <= end_date)
);

create index if not exists idx_performance_cycles_scope_status on public.performance_cycles(campus_id, office_id, status);
create index if not exists idx_performance_cycles_dates on public.performance_cycles(start_date, end_date);

create table if not exists public.performance_records (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.performance_cycles(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  supervisor_employee_id uuid null references public.employees(id),
  reviewer_employee_id uuid null references public.employees(id),
  status public.perf_record_status not null default 'draft',
  submitted_at timestamptz null,
  approved_at timestamptz null,
  finalized_at timestamptz null,
  final_score numeric(6,2) null,
  final_rating text null,
  employee_comments text null,
  reviewer_comments text null,
  finalizer_comments text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, employee_id)
);

create index if not exists idx_performance_records_cycle_status on public.performance_records(cycle_id, status);
create index if not exists idx_performance_records_employee on public.performance_records(employee_id, cycle_id);
create index if not exists idx_performance_records_supervisor on public.performance_records(supervisor_employee_id, status);

create table if not exists public.performance_objectives (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.performance_records(id) on delete cascade,
  title text not null,
  metric text null,
  target_value text null,
  weight numeric(6,2) not null check (weight > 0),
  self_score numeric(6,2) null,
  reviewer_score numeric(6,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_performance_objectives_record on public.performance_objectives(record_id);

create table if not exists public.performance_accomplishments (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.performance_objectives(id) on delete cascade,
  period_date date not null,
  accomplishment_text text not null,
  evidence_link text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_performance_accomplishments_objective on public.performance_accomplishments(objective_id, period_date desc);

create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.performance_records(id) on delete cascade,
  reviewer_employee_id uuid not null references public.employees(id),
  decision public.perf_review_decision not null,
  comments text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_performance_reviews_record on public.performance_reviews(record_id, created_at desc);

create table if not exists public.performance_status_history (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.performance_records(id) on delete cascade,
  from_status public.perf_record_status null,
  to_status public.perf_record_status not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_performance_status_history_record on public.performance_status_history(record_id, changed_at desc);

create or replace function public.validate_performance_cycle_scope()
returns trigger
language plpgsql
as $$
declare
  office_campus uuid;
begin
  if new.office_id is null then
    return new;
  end if;
  if new.campus_id is null then
    raise exception 'Campus is required when office is selected.';
  end if;
  select o.campus_id into office_campus from public.offices o where o.id = new.office_id;
  if office_campus is null then
    raise exception 'Office not found.';
  end if;
  if office_campus <> new.campus_id then
    raise exception 'Cycle office must belong to selected campus.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_performance_record_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;
  if old.status = 'draft' and new.status in ('submitted', 'withdrawn') then return new; end if;
  if old.status = 'submitted' and new.status in ('under_review', 'needs_revision', 'withdrawn') then return new; end if;
  if old.status = 'under_review' and new.status in ('approved', 'needs_revision') then return new; end if;
  if old.status = 'needs_revision' and new.status in ('submitted', 'withdrawn') then return new; end if;
  if old.status = 'approved' and new.status = 'finalized' then return new; end if;
  raise exception 'Invalid performance record status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.touch_performance_record_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.status <> new.status then
    if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'finalized' and new.finalized_at is null then new.finalized_at := now(); end if;
    insert into public.performance_status_history(record_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_performance_cycles_validate_scope on public.performance_cycles;
create trigger trg_performance_cycles_validate_scope
before insert or update on public.performance_cycles
for each row execute function public.validate_performance_cycle_scope();

drop trigger if exists trg_performance_cycles_updated_at on public.performance_cycles;
create trigger trg_performance_cycles_updated_at
before update on public.performance_cycles
for each row execute function public.set_updated_at();

drop trigger if exists trg_performance_records_updated_at on public.performance_records;
create trigger trg_performance_records_updated_at
before update on public.performance_records
for each row execute function public.set_updated_at();

drop trigger if exists trg_performance_objectives_updated_at on public.performance_objectives;
create trigger trg_performance_objectives_updated_at
before update on public.performance_objectives
for each row execute function public.set_updated_at();

drop trigger if exists trg_performance_accomplishments_updated_at on public.performance_accomplishments;
create trigger trg_performance_accomplishments_updated_at
before update on public.performance_accomplishments
for each row execute function public.set_updated_at();

drop trigger if exists trg_performance_records_transition on public.performance_records;
create trigger trg_performance_records_transition
before update on public.performance_records
for each row execute function public.validate_performance_record_transition();

drop trigger if exists trg_performance_records_lifecycle on public.performance_records;
create trigger trg_performance_records_lifecycle
before update on public.performance_records
for each row execute function public.touch_performance_record_lifecycle();

alter table public.performance_cycles enable row level security;
alter table public.performance_records enable row level security;
alter table public.performance_objectives enable row level security;
alter table public.performance_accomplishments enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.performance_status_history enable row level security;

drop policy if exists performance_cycles_scoped_select on public.performance_cycles;
create policy performance_cycles_scoped_select on public.performance_cycles
for select to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or campus_id is null
);

drop policy if exists performance_cycles_scoped_write on public.performance_cycles;
create policy performance_cycles_scoped_write on public.performance_cycles
for all to authenticated
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

drop policy if exists performance_records_scoped_select on public.performance_records;
create policy performance_records_scoped_select on public.performance_records
for select to authenticated
using (
  employee_id = public.current_user_employee_id()
  or supervisor_employee_id = public.current_user_employee_id()
  or reviewer_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists performance_records_scoped_write on public.performance_records;
create policy performance_records_scoped_write on public.performance_records
for all to authenticated
using (
  employee_id = public.current_user_employee_id()
  or supervisor_employee_id = public.current_user_employee_id()
  or reviewer_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  employee_id = public.current_user_employee_id()
  or supervisor_employee_id = public.current_user_employee_id()
  or reviewer_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists performance_objectives_scoped_all on public.performance_objectives;
create policy performance_objectives_scoped_all on public.performance_objectives
for all to authenticated
using (
  exists (
    select 1 from public.performance_records r
    where r.id = performance_objectives.record_id
      and (
        r.employee_id = public.current_user_employee_id()
        or r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
)
with check (
  exists (
    select 1 from public.performance_records r
    where r.id = performance_objectives.record_id
      and (
        r.employee_id = public.current_user_employee_id()
        or r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
);

drop policy if exists performance_accomplishments_scoped_all on public.performance_accomplishments;
create policy performance_accomplishments_scoped_all on public.performance_accomplishments
for all to authenticated
using (
  exists (
    select 1
    from public.performance_objectives o
    join public.performance_records r on r.id = o.record_id
    where o.id = performance_accomplishments.objective_id
      and (
        r.employee_id = public.current_user_employee_id()
        or r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.performance_objectives o
    join public.performance_records r on r.id = o.record_id
    where o.id = performance_accomplishments.objective_id
      and (
        r.employee_id = public.current_user_employee_id()
        or r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
);

drop policy if exists performance_reviews_scoped_all on public.performance_reviews;
create policy performance_reviews_scoped_all on public.performance_reviews
for all to authenticated
using (
  exists (
    select 1 from public.performance_records r
    where r.id = performance_reviews.record_id
      and (
        r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
)
with check (
  exists (
    select 1 from public.performance_records r
    where r.id = performance_reviews.record_id
      and (
        r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
);

drop policy if exists performance_status_history_scoped_select on public.performance_status_history;
create policy performance_status_history_scoped_select on public.performance_status_history
for select to authenticated
using (
  exists (
    select 1 from public.performance_records r
    where r.id = performance_status_history.record_id
      and (
        r.employee_id = public.current_user_employee_id()
        or r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
);

commit;
