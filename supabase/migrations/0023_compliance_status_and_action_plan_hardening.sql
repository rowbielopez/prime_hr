begin;

-- ---------------------------------------------------------------------------
-- 1) Evidence status transitions + required remarks (enforced in RPC)
-- ---------------------------------------------------------------------------

create or replace function public.apply_compliance_evidence_status_change(
  p_evidence_id uuid,
  p_to_status public.compliance_evidence_status,
  p_remarks text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old_status public.compliance_evidence_status;
  v_ts timestamptz := now();
  v_is_privileged boolean := public.has_active_role('super_admin') or public.has_active_role('central_hr_admin');
  v_remarks text := nullif(trim(coalesce(p_remarks, '')), '');
begin
  select e.status
  into v_old_status
  from public.compliance_evidence e
  where e.id = p_evidence_id
    and e.deleted_at is null;

  if not found then
    raise exception 'Evidence not found';
  end if;

  -- Required remarks for major decisions or privileged overrides.
  if p_to_status in ('approved', 'rejected') and v_remarks is null then
    raise exception 'Remarks are required for approved/rejected decisions';
  end if;

  -- Allowed transitions (non-privileged).
  if not v_is_privileged then
    if v_old_status = 'draft' and p_to_status <> 'submitted' then
      raise exception 'Invalid transition';
    end if;
    if v_old_status = 'submitted' and p_to_status not in ('approved', 'rejected') then
      raise exception 'Invalid transition';
    end if;
    if v_old_status = 'rejected' and p_to_status <> 'submitted' then
      raise exception 'Invalid transition';
    end if;
    if v_old_status = 'approved' then
      raise exception 'Approved evidence is locked';
    end if;
  else
    -- Privileged actors can override but must provide remarks when changing status.
    if p_to_status is distinct from v_old_status and v_remarks is null then
      raise exception 'Remarks are required for privileged status overrides';
    end if;
  end if;

  update public.compliance_evidence
  set
    status = p_to_status,
    submitted_at = case when p_to_status = 'submitted' then v_ts else submitted_at end,
    approved_at = case when p_to_status = 'approved' then v_ts else approved_at end,
    rejected_at = case when p_to_status = 'rejected' then v_ts else rejected_at end,
    reviewer_remarks = v_remarks
  where id = p_evidence_id;

  insert into public.compliance_evidence_status_history (
    evidence_id,
    from_status,
    to_status,
    remarks,
    changed_by_user_id
  )
  values (
    p_evidence_id,
    v_old_status,
    p_to_status,
    v_remarks,
    public.current_app_user_id()
  );
end;
$$;

grant execute on function public.apply_compliance_evidence_status_change(uuid, public.compliance_evidence_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Action plan: accountability + office + progress + taxonomy
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.compliance_gap_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.compliance_gap_category as enum ('policy', 'process', 'documentation', 'systems', 'people', 'other');
exception when duplicate_object then null; end $$;

alter table public.compliance_action_plans
  add column if not exists owner_user_id uuid null references public.app_users(id),
  add column if not exists owner_office_id uuid null references public.offices(id),
  add column if not exists gap_severity public.compliance_gap_severity not null default 'medium',
  add column if not exists gap_category public.compliance_gap_category not null default 'other',
  add column if not exists root_cause text null,
  add column if not exists reference_clause text null,
  add column if not exists progress_percent integer not null default 0,
  add column if not exists last_progress_at timestamptz null,
  add column if not exists last_progress_by_user_id uuid null references public.app_users(id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'compliance_action_plans'
      and c.conname = 'chk_compliance_action_plans_progress_percent'
  ) then
    alter table public.compliance_action_plans
      add constraint chk_compliance_action_plans_progress_percent
      check (progress_percent >= 0 and progress_percent <= 100);
  end if;
end $$;

create index if not exists idx_compliance_action_plans_owner_user_id on public.compliance_action_plans(owner_user_id);
create index if not exists idx_compliance_action_plans_owner_office_id on public.compliance_action_plans(owner_office_id);
create index if not exists idx_compliance_action_plans_gap_severity on public.compliance_action_plans(gap_severity);
create index if not exists idx_compliance_action_plans_gap_category on public.compliance_action_plans(gap_category);

create or replace function public.validate_compliance_action_plan_owner_office()
returns trigger
language plpgsql
as $$
declare
  v_campus_id uuid;
  v_office_campus uuid;
begin
  if new.owner_office_id is null then
    return new;
  end if;

  select e.campus_id into v_campus_id
  from public.compliance_evidence e
  where e.id = new.evidence_id and e.deleted_at is null;

  if v_campus_id is null then
    raise exception 'evidence_id does not reference a valid evidence row';
  end if;

  select o.campus_id into v_office_campus
  from public.offices o
  where o.id = new.owner_office_id;

  if v_office_campus is null then
    raise exception 'owner_office_id does not reference a valid office';
  end if;

  if v_office_campus <> v_campus_id then
    raise exception 'owner_office_id must belong to the evidence campus';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compliance_action_plans_validate_owner_office on public.compliance_action_plans;
create trigger trg_compliance_action_plans_validate_owner_office
before insert or update on public.compliance_action_plans
for each row execute function public.validate_compliance_action_plan_owner_office();

create or replace function public.touch_compliance_action_plan_progress()
returns trigger
language plpgsql
as $$
begin
  if (new.progress_percent is distinct from old.progress_percent)
     or (new.progress_notes is distinct from old.progress_notes)
     or (new.status is distinct from old.status) then
    new.last_progress_at := now();
    new.last_progress_by_user_id := public.current_app_user_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_compliance_action_plans_touch_progress on public.compliance_action_plans;
create trigger trg_compliance_action_plans_touch_progress
before update on public.compliance_action_plans
for each row execute function public.touch_compliance_action_plan_progress();

-- ---------------------------------------------------------------------------
-- 3) Action plan history (append-only audit timeline)
-- ---------------------------------------------------------------------------

create table if not exists public.compliance_action_plan_history (
  id uuid primary key default gen_random_uuid(),
  action_plan_id uuid not null references public.compliance_action_plans(id) on delete cascade,
  evidence_id uuid not null references public.compliance_evidence(id) on delete cascade,
  actor_user_id uuid null references public.app_users(id),
  event_type text not null, -- 'created' | 'updated'
  before_state jsonb null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_action_plan_history_evidence_id on public.compliance_action_plan_history(evidence_id);
create index if not exists idx_compliance_action_plan_history_created_at on public.compliance_action_plan_history(created_at desc);

alter table public.compliance_action_plan_history enable row level security;

drop policy if exists compliance_action_plan_history_scoped_select on public.compliance_action_plan_history;
create policy compliance_action_plan_history_scoped_select
on public.compliance_action_plan_history
for select
to authenticated
using (
  exists (
    select 1
    from public.compliance_evidence e
    where e.id = evidence_id
      and public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
  )
);

drop policy if exists compliance_action_plan_history_scoped_insert on public.compliance_action_plan_history;
create policy compliance_action_plan_history_scoped_insert
on public.compliance_action_plan_history
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
        or public.authz_compliance_scoped_write(e.campus_id, e.office_id)
      )
  )
);

create or replace function public.log_compliance_action_plan_change()
returns trigger
language plpgsql
as $$
begin
  insert into public.compliance_action_plan_history (
    action_plan_id,
    evidence_id,
    actor_user_id,
    event_type,
    before_state,
    after_state
  )
  values (
    new.id,
    new.evidence_id,
    public.current_app_user_id(),
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists trg_compliance_action_plans_log_change on public.compliance_action_plans;
create trigger trg_compliance_action_plans_log_change
after insert or update on public.compliance_action_plans
for each row execute function public.log_compliance_action_plan_change();

commit;

