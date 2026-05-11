begin;

do $$ begin
  create type public.reward_award_status as enum ('draft', 'active', 'inactive', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reward_nomination_status as enum (
    'draft',
    'submitted',
    'under_review',
    'needs_revision',
    'recommended',
    'approved',
    'awarded',
    'rejected',
    'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reward_review_decision as enum ('recommend', 'request_revision', 'reject');
exception when duplicate_object then null; end $$;

create table if not exists public.rewards_awards (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text null,
  nomination_start_date date null,
  nomination_end_date date null,
  review_end_date date null,
  campus_id uuid null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.reward_award_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  unique (code, campus_id, office_id),
  check (
    nomination_start_date is null
    or nomination_end_date is null
    or nomination_start_date <= nomination_end_date
  ),
  check (
    nomination_end_date is null
    or review_end_date is null
    or nomination_end_date <= review_end_date
  )
);

create index if not exists idx_rewards_awards_scope_status on public.rewards_awards(campus_id, office_id, status);

create table if not exists public.rewards_nominations (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.rewards_awards(id) on delete cascade,
  nominee_employee_id uuid not null references public.employees(id),
  nominator_employee_id uuid not null references public.employees(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  status public.reward_nomination_status not null default 'draft',
  justification text not null,
  nominator_remarks text null,
  reviewer_remarks text null,
  approver_remarks text null,
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  approved_at timestamptz null,
  awarded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_rewards_nominations_award_nominee_active
  on public.rewards_nominations(award_id, nominee_employee_id)
  where status in ('draft', 'submitted', 'under_review', 'needs_revision', 'recommended', 'approved');

create index if not exists idx_rewards_nominations_status_scope on public.rewards_nominations(status, campus_id, office_id);
create index if not exists idx_rewards_nominations_nominee on public.rewards_nominations(nominee_employee_id, created_at desc);
create index if not exists idx_rewards_nominations_nominator on public.rewards_nominations(nominator_employee_id, created_at desc);

create table if not exists public.rewards_nomination_reviews (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.rewards_nominations(id) on delete cascade,
  reviewer_employee_id uuid not null references public.employees(id),
  decision public.reward_review_decision not null,
  score numeric(6,2) null,
  remarks text null,
  created_at timestamptz not null default now(),
  check (score is null or (score >= 0 and score <= 100))
);

create index if not exists idx_rewards_nomination_reviews_nomination on public.rewards_nomination_reviews(nomination_id, created_at desc);

create table if not exists public.rewards_nomination_status_history (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.rewards_nominations(id) on delete cascade,
  from_status public.reward_nomination_status null,
  to_status public.reward_nomination_status not null,
  changed_by_user_id uuid null references public.app_users(id),
  changed_at timestamptz not null default now()
);

create index if not exists idx_rewards_nomination_status_history_nomination
  on public.rewards_nomination_status_history(nomination_id, changed_at desc);

create table if not exists public.rewards_awardees (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null unique references public.rewards_nominations(id) on delete cascade,
  award_id uuid not null references public.rewards_awards(id),
  awardee_employee_id uuid not null references public.employees(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_awardees_award on public.rewards_awardees(award_id, awarded_at desc);
create index if not exists idx_rewards_awardees_employee on public.rewards_awardees(awardee_employee_id, awarded_at desc);

create or replace function public.validate_rewards_award_scope()
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
    raise exception 'Award office must belong to selected campus.';
  end if;
  return new;
end;
$$;

create or replace function public.validate_rewards_nomination_transition()
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
  if old.status = 'submitted' and new.status in ('under_review', 'withdrawn') then return new; end if;
  if old.status = 'under_review' and new.status in ('needs_revision', 'recommended', 'rejected') then return new; end if;
  if old.status = 'needs_revision' and new.status in ('submitted', 'withdrawn') then return new; end if;
  if old.status = 'recommended' and new.status in ('approved', 'rejected') then return new; end if;
  if old.status = 'approved' and new.status = 'awarded' then return new; end if;
  raise exception 'Invalid rewards nomination status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.touch_rewards_nomination_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.status <> new.status then
    if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
    if new.status in ('recommended', 'rejected', 'needs_revision') and new.reviewed_at is null then new.reviewed_at := now(); end if;
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'awarded' and new.awarded_at is null then new.awarded_at := now(); end if;
    insert into public.rewards_nomination_status_history(nomination_id, from_status, to_status, changed_by_user_id)
    values (new.id, old.status, new.status, public.current_app_user_id());
  end if;
  return new;
end;
$$;

create or replace function public.validate_rewards_nomination_scope()
returns trigger
language plpgsql
as $$
declare
  v_award_campus uuid;
  v_award_office uuid;
begin
  select a.campus_id, a.office_id
  into v_award_campus, v_award_office
  from public.rewards_awards a
  where a.id = new.award_id
    and a.deleted_at is null;

  if not found then
    raise exception 'Award not found.';
  end if;

  if v_award_campus is not null and new.campus_id <> v_award_campus then
    raise exception 'Nomination campus must match award campus.';
  end if;

  if v_award_office is not null and new.office_id is distinct from v_award_office then
    raise exception 'Nomination office must match award office.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_rewards_awards_validate_scope on public.rewards_awards;
create trigger trg_rewards_awards_validate_scope
before insert or update on public.rewards_awards
for each row execute function public.validate_rewards_award_scope();

drop trigger if exists trg_rewards_awards_updated_at on public.rewards_awards;
create trigger trg_rewards_awards_updated_at
before update on public.rewards_awards
for each row execute function public.set_updated_at();

drop trigger if exists trg_rewards_nominations_updated_at on public.rewards_nominations;
create trigger trg_rewards_nominations_updated_at
before update on public.rewards_nominations
for each row execute function public.set_updated_at();

drop trigger if exists trg_rewards_nominations_validate_scope on public.rewards_nominations;
create trigger trg_rewards_nominations_validate_scope
before insert or update on public.rewards_nominations
for each row execute function public.validate_rewards_nomination_scope();

drop trigger if exists trg_rewards_nominations_transition on public.rewards_nominations;
create trigger trg_rewards_nominations_transition
before update on public.rewards_nominations
for each row execute function public.validate_rewards_nomination_transition();

drop trigger if exists trg_rewards_nominations_lifecycle on public.rewards_nominations;
create trigger trg_rewards_nominations_lifecycle
before update on public.rewards_nominations
for each row execute function public.touch_rewards_nomination_lifecycle();

alter table public.rewards_awards enable row level security;
alter table public.rewards_nominations enable row level security;
alter table public.rewards_nomination_reviews enable row level security;
alter table public.rewards_nomination_status_history enable row level security;
alter table public.rewards_awardees enable row level security;

drop policy if exists rewards_awards_scoped_select on public.rewards_awards;
create policy rewards_awards_scoped_select on public.rewards_awards
for select to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or campus_id is null
);

drop policy if exists rewards_awards_scoped_write on public.rewards_awards;
create policy rewards_awards_scoped_write on public.rewards_awards
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

drop policy if exists rewards_nominations_scoped_select on public.rewards_nominations;
create policy rewards_nominations_scoped_select on public.rewards_nominations
for select to authenticated
using (
  nominator_employee_id = public.current_user_employee_id()
  or nominee_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists rewards_nominations_scoped_write on public.rewards_nominations;
create policy rewards_nominations_scoped_write on public.rewards_nominations
for all to authenticated
using (
  nominator_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
)
with check (
  nominator_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
);

drop policy if exists rewards_nomination_reviews_scoped_all on public.rewards_nomination_reviews;
create policy rewards_nomination_reviews_scoped_all on public.rewards_nomination_reviews
for all to authenticated
using (
  exists (
    select 1
    from public.rewards_nominations n
    where n.id = rewards_nomination_reviews.nomination_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', n.campus_id)
        or public.has_active_role('office_unit_head', n.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.rewards_nominations n
    where n.id = rewards_nomination_reviews.nomination_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', n.campus_id)
        or public.has_active_role('office_unit_head', n.campus_id)
      )
  )
);

drop policy if exists rewards_nomination_status_history_scoped_select on public.rewards_nomination_status_history;
create policy rewards_nomination_status_history_scoped_select on public.rewards_nomination_status_history
for select to authenticated
using (
  exists (
    select 1
    from public.rewards_nominations n
    where n.id = rewards_nomination_status_history.nomination_id
      and (
        n.nominator_employee_id = public.current_user_employee_id()
        or n.nominee_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', n.campus_id)
        or public.has_active_role('office_unit_head', n.campus_id)
      )
  )
);

drop policy if exists rewards_awardees_scoped_select on public.rewards_awardees;
create policy rewards_awardees_scoped_select on public.rewards_awardees
for select to authenticated
using (
  awardee_employee_id = public.current_user_employee_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
);

drop policy if exists rewards_awardees_scoped_write on public.rewards_awardees;
create policy rewards_awardees_scoped_write on public.rewards_awardees
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

commit;

