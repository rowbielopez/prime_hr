begin;

create table if not exists public.rewards_committee_assignments (
  id uuid primary key default gen_random_uuid(),
  nomination_id uuid not null references public.rewards_nominations(id) on delete cascade,
  reviewer_user_id uuid not null references public.app_users(id) on delete cascade,
  assignment_role text not null default 'member',
  assigned_at timestamptz not null default now(),
  unique (nomination_id, reviewer_user_id),
  check (assignment_role in ('member', 'chair'))
);

create index if not exists idx_rewards_committee_assignments_nomination
  on public.rewards_committee_assignments(nomination_id, assigned_at desc);

create unique index if not exists uq_rewards_nomination_reviews_nomination_reviewer
  on public.rewards_nomination_reviews(nomination_id, reviewer_employee_id);

alter table public.rewards_committee_assignments enable row level security;

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
  or public.has_active_role('committee_member', campus_id)
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
        or public.has_active_role('committee_member', n.campus_id)
      )
  )
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
        or public.has_active_role('committee_member', n.campus_id)
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
        or public.has_active_role('committee_member', n.campus_id)
      )
  )
);

drop policy if exists rewards_committee_assignments_scoped_select on public.rewards_committee_assignments;
create policy rewards_committee_assignments_scoped_select on public.rewards_committee_assignments
for select to authenticated
using (
  reviewer_user_id = public.current_app_user_id()
  or exists (
    select 1
    from public.rewards_nominations n
    where n.id = rewards_committee_assignments.nomination_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', n.campus_id)
        or public.has_active_role('office_unit_head', n.campus_id)
        or public.has_active_role('committee_member', n.campus_id)
      )
  )
);

drop policy if exists rewards_committee_assignments_scoped_write on public.rewards_committee_assignments;
create policy rewards_committee_assignments_scoped_write on public.rewards_committee_assignments
for all to authenticated
using (
  exists (
    select 1
    from public.rewards_nominations n
    where n.id = rewards_committee_assignments.nomination_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', n.campus_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.rewards_nominations n
    where n.id = rewards_committee_assignments.nomination_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', n.campus_id)
      )
  )
);

commit;

