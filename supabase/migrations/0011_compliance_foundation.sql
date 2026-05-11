begin;

do $$ begin
  create type public.compliance_evidence_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compliance_gap_status as enum ('open', 'in_progress', 'closed');
exception when duplicate_object then null; end $$;

create table if not exists public.compliance_areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

drop trigger if exists trg_compliance_areas_updated_at on public.compliance_areas;
create trigger trg_compliance_areas_updated_at
before update on public.compliance_areas
for each row execute function public.set_updated_at();

create table if not exists public.compliance_indicators (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.compliance_areas(id),
  code text not null,
  title text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (area_id, code)
);

create index if not exists idx_compliance_indicators_area_id on public.compliance_indicators(area_id);

drop trigger if exists trg_compliance_indicators_updated_at on public.compliance_indicators;
create trigger trg_compliance_indicators_updated_at
before update on public.compliance_indicators
for each row execute function public.set_updated_at();

create table if not exists public.compliance_evidence (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  area_id uuid not null references public.compliance_areas(id),
  indicator_id uuid not null references public.compliance_indicators(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  reporting_period text not null,
  owner_user_id uuid null references public.app_users(id),
  due_date date null,
  status public.compliance_evidence_status not null default 'draft',
  submitted_at timestamptz null,
  approved_at timestamptz null,
  rejected_at timestamptz null,
  reviewer_remarks text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_compliance_evidence_campus_id on public.compliance_evidence(campus_id);
create index if not exists idx_compliance_evidence_office_id on public.compliance_evidence(office_id);
create index if not exists idx_compliance_evidence_status on public.compliance_evidence(status);
create index if not exists idx_compliance_evidence_indicator_id on public.compliance_evidence(indicator_id);

drop trigger if exists trg_compliance_evidence_updated_at on public.compliance_evidence;
create trigger trg_compliance_evidence_updated_at
before update on public.compliance_evidence
for each row execute function public.set_updated_at();

create table if not exists public.compliance_evidence_attachments (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.compliance_evidence(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  storage_path text null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists idx_compliance_evidence_attachments_evidence_id on public.compliance_evidence_attachments(evidence_id);

create table if not exists public.compliance_action_plans (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null unique references public.compliance_evidence(id) on delete cascade,
  gap_summary text not null,
  corrective_action text not null,
  owner_name text not null,
  due_date date not null,
  status public.compliance_gap_status not null default 'open',
  progress_notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_compliance_action_plans_status on public.compliance_action_plans(status);
create index if not exists idx_compliance_action_plans_due_date on public.compliance_action_plans(due_date);

drop trigger if exists trg_compliance_action_plans_updated_at on public.compliance_action_plans;
create trigger trg_compliance_action_plans_updated_at
before update on public.compliance_action_plans
for each row execute function public.set_updated_at();

create table if not exists public.compliance_evidence_status_history (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.compliance_evidence(id) on delete cascade,
  from_status public.compliance_evidence_status null,
  to_status public.compliance_evidence_status not null,
  remarks text null,
  changed_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_status_history_evidence_id on public.compliance_evidence_status_history(evidence_id);
create index if not exists idx_compliance_status_history_created_at on public.compliance_evidence_status_history(created_at desc);

create or replace function public.validate_compliance_evidence_office_scope()
returns trigger
language plpgsql
as $$
declare
  office_campus_id uuid;
begin
  if new.office_id is null then
    return new;
  end if;

  select o.campus_id into office_campus_id
  from public.offices o
  where o.id = new.office_id;

  if office_campus_id is null then
    raise exception 'office_id does not reference a valid office';
  end if;

  if office_campus_id <> new.campus_id then
    raise exception 'compliance evidence office_id campus must match campus_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compliance_evidence_validate_office_scope on public.compliance_evidence;
create trigger trg_compliance_evidence_validate_office_scope
before insert or update on public.compliance_evidence
for each row execute function public.validate_compliance_evidence_office_scope();

alter table public.compliance_areas enable row level security;
alter table public.compliance_indicators enable row level security;
alter table public.compliance_evidence enable row level security;
alter table public.compliance_evidence_attachments enable row level security;
alter table public.compliance_action_plans enable row level security;
alter table public.compliance_evidence_status_history enable row level security;

drop policy if exists compliance_areas_authenticated_select on public.compliance_areas;
create policy compliance_areas_authenticated_select
on public.compliance_areas
for select
to authenticated
using (true);

drop policy if exists compliance_areas_admin_write on public.compliance_areas;
create policy compliance_areas_admin_write
on public.compliance_areas
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

drop policy if exists compliance_indicators_authenticated_select on public.compliance_indicators;
create policy compliance_indicators_authenticated_select
on public.compliance_indicators
for select
to authenticated
using (true);

drop policy if exists compliance_indicators_admin_write on public.compliance_indicators;
create policy compliance_indicators_admin_write
on public.compliance_indicators
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

drop policy if exists compliance_evidence_scoped_select on public.compliance_evidence;
create policy compliance_evidence_scoped_select
on public.compliance_evidence
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
  or public.has_active_role('employee', campus_id)
);

drop policy if exists compliance_evidence_scoped_insert on public.compliance_evidence;
create policy compliance_evidence_scoped_insert
on public.compliance_evidence
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists compliance_evidence_scoped_update on public.compliance_evidence;
create policy compliance_evidence_scoped_update
on public.compliance_evidence
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists compliance_attachments_scoped_select on public.compliance_evidence_attachments;
create policy compliance_attachments_scoped_select
on public.compliance_evidence_attachments
for select
to authenticated
using (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
        or public.has_active_role('committee_member', e.campus_id)
        or public.has_active_role('employee', e.campus_id)
      )
  )
);

drop policy if exists compliance_attachments_scoped_write on public.compliance_evidence_attachments;
create policy compliance_attachments_scoped_write
on public.compliance_evidence_attachments
for all
to authenticated
using (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
      )
  )
);

drop policy if exists compliance_action_plans_scoped_select on public.compliance_action_plans;
create policy compliance_action_plans_scoped_select
on public.compliance_action_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
        or public.has_active_role('committee_member', e.campus_id)
        or public.has_active_role('employee', e.campus_id)
      )
  )
);

drop policy if exists compliance_action_plans_scoped_write on public.compliance_action_plans;
create policy compliance_action_plans_scoped_write
on public.compliance_action_plans
for all
to authenticated
using (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
      )
  )
);

drop policy if exists compliance_status_history_scoped_select on public.compliance_evidence_status_history;
create policy compliance_status_history_scoped_select
on public.compliance_evidence_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
        or public.has_active_role('committee_member', e.campus_id)
        or public.has_active_role('employee', e.campus_id)
      )
  )
);

drop policy if exists compliance_status_history_scoped_insert on public.compliance_evidence_status_history;
create policy compliance_status_history_scoped_insert
on public.compliance_evidence_status_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', e.campus_id)
        or public.has_active_role('office_unit_head', e.campus_id)
        or public.has_active_role('committee_member', e.campus_id)
      )
  )
);

commit;
