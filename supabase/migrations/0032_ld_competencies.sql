begin;

do $$ begin
  create type public.ld_competency_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ld_competency_assessment_status as enum ('draft', 'submitted', 'validated');
exception when duplicate_object then null; end $$;

create table if not exists public.ld_competencies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text null,
  category text null,
  campus_id uuid null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.ld_competency_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (code, campus_id, office_id)
);

create index if not exists idx_ld_competencies_scope_status on public.ld_competencies(campus_id, office_id, status);

create table if not exists public.ld_program_competencies (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ld_training_programs(id) on delete cascade,
  competency_id uuid not null references public.ld_competencies(id) on delete cascade,
  weight numeric(6,2) not null default 1 check (weight > 0),
  created_at timestamptz not null default now(),
  unique (program_id, competency_id)
);

create table if not exists public.ld_competency_assessments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  assessor_employee_id uuid null references public.employees(id),
  reviewer_employee_id uuid null references public.employees(id),
  assessment_date date not null default current_date,
  status public.ld_competency_assessment_status not null default 'draft',
  remarks text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ld_competency_assessments_employee on public.ld_competency_assessments(employee_id, assessment_date desc);
create index if not exists idx_ld_competency_assessments_campus_status on public.ld_competency_assessments(campus_id, status, assessment_date desc);

create table if not exists public.ld_competency_assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.ld_competency_assessments(id) on delete cascade,
  competency_id uuid not null references public.ld_competencies(id),
  target_level smallint not null check (target_level between 1 and 5),
  current_level smallint not null check (current_level between 1 and 5),
  evidence_notes text null,
  created_at timestamptz not null default now(),
  unique (assessment_id, competency_id)
);

create index if not exists idx_ld_competency_assessment_items_assessment on public.ld_competency_assessment_items(assessment_id);

create or replace function public.validate_ld_competency_office_scope()
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
    raise exception 'Campus is required when office is set.';
  end if;
  select o.campus_id into office_campus from public.offices o where o.id = new.office_id;
  if office_campus is null then
    raise exception 'Office does not exist.';
  end if;
  if office_campus <> new.campus_id then
    raise exception 'Competency office must belong to selected campus.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ld_competencies_validate_office_scope on public.ld_competencies;
create trigger trg_ld_competencies_validate_office_scope
before insert or update on public.ld_competencies
for each row execute function public.validate_ld_competency_office_scope();

drop trigger if exists trg_ld_competencies_updated_at on public.ld_competencies;
create trigger trg_ld_competencies_updated_at before update on public.ld_competencies
for each row execute function public.set_updated_at();

drop trigger if exists trg_ld_competency_assessments_updated_at on public.ld_competency_assessments;
create trigger trg_ld_competency_assessments_updated_at before update on public.ld_competency_assessments
for each row execute function public.set_updated_at();

alter table public.ld_competencies enable row level security;
alter table public.ld_program_competencies enable row level security;
alter table public.ld_competency_assessments enable row level security;
alter table public.ld_competency_assessment_items enable row level security;

drop policy if exists ld_competencies_scoped_select on public.ld_competencies;
create policy ld_competencies_scoped_select on public.ld_competencies
for select to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or (
    status = 'active' and (campus_id is null or campus_id = (
      select e.campus_id from public.employees e where e.id = public.current_user_employee_id()
    ))
  )
);

drop policy if exists ld_competencies_scoped_write on public.ld_competencies;
create policy ld_competencies_scoped_write on public.ld_competencies
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

drop policy if exists ld_program_competencies_scoped_select on public.ld_program_competencies;
create policy ld_program_competencies_scoped_select on public.ld_program_competencies
for select to authenticated
using (true);

drop policy if exists ld_program_competencies_scoped_write on public.ld_program_competencies;
create policy ld_program_competencies_scoped_write on public.ld_program_competencies
for all to authenticated
using (public.has_active_role('super_admin') or public.has_active_role('central_hr_admin'))
with check (public.has_active_role('super_admin') or public.has_active_role('central_hr_admin'));

drop policy if exists ld_competency_assessments_scoped_select on public.ld_competency_assessments;
create policy ld_competency_assessments_scoped_select on public.ld_competency_assessments
for select to authenticated
using (
  employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists ld_competency_assessments_scoped_write on public.ld_competency_assessments;
create policy ld_competency_assessments_scoped_write on public.ld_competency_assessments
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

drop policy if exists ld_competency_assessment_items_scoped_select on public.ld_competency_assessment_items;
create policy ld_competency_assessment_items_scoped_select on public.ld_competency_assessment_items
for select to authenticated
using (
  exists (
    select 1 from public.ld_competency_assessments a
    where a.id = ld_competency_assessment_items.assessment_id
      and (
        a.employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
        or public.has_active_role('office_unit_head', a.campus_id)
      )
  )
);

drop policy if exists ld_competency_assessment_items_scoped_write on public.ld_competency_assessment_items;
create policy ld_competency_assessment_items_scoped_write on public.ld_competency_assessment_items
for all to authenticated
using (
  exists (
    select 1 from public.ld_competency_assessments a
    where a.id = ld_competency_assessment_items.assessment_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
      )
  )
)
with check (
  exists (
    select 1 from public.ld_competency_assessments a
    where a.id = ld_competency_assessment_items.assessment_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', a.campus_id)
      )
  )
);

commit;
