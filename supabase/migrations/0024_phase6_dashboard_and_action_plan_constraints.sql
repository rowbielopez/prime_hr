begin;

-- ---------------------------------------------------------------------------
-- 1) Enforce action plan due_date within evidence reporting_period (YYYY-MM)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_action_plan_due_date_reporting_period()
returns trigger
language plpgsql
as $$
declare
  v_period text;
begin
  select e.reporting_period into v_period
  from public.compliance_evidence e
  where e.id = new.evidence_id
    and e.deleted_at is null;

  if v_period is null then
    raise exception 'evidence_id does not reference a valid evidence row';
  end if;

  if new.due_date is null then
    raise exception 'Action plan due_date is required';
  end if;

  if to_char(new.due_date, 'YYYY-MM') <> v_period then
    raise exception 'Action plan due_date must be within evidence reporting_period (%)', v_period;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compliance_action_plans_enforce_due_date_period on public.compliance_action_plans;
create trigger trg_compliance_action_plans_enforce_due_date_period
before insert or update of due_date, evidence_id on public.compliance_action_plans
for each row execute function public.enforce_action_plan_due_date_reporting_period();

-- ---------------------------------------------------------------------------
-- 2) Compliance dashboard aggregates (RLS-safe, SECURITY INVOKER)
-- ---------------------------------------------------------------------------

create or replace function public.get_compliance_dashboard_summary()
returns table (
  total_items bigint,
  draft_count bigint,
  submitted_count bigint,
  approved_count bigint,
  rejected_count bigint,
  with_open_gap_count bigint,
  overdue_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with evidence as (
    select e.id, e.status, e.due_date
    from public.compliance_evidence e
    where e.deleted_at is null
  ),
  open_gaps as (
    select ap.evidence_id
    from public.compliance_action_plans ap
    where ap.status in ('open'::public.compliance_gap_status, 'in_progress'::public.compliance_gap_status)
  )
  select
    count(*) as total_items,
    count(*) filter (where status = 'draft'::public.compliance_evidence_status) as draft_count,
    count(*) filter (where status = 'submitted'::public.compliance_evidence_status) as submitted_count,
    count(*) filter (where status = 'approved'::public.compliance_evidence_status) as approved_count,
    count(*) filter (where status = 'rejected'::public.compliance_evidence_status) as rejected_count,
    count(*) filter (where id in (select evidence_id from open_gaps)) as with_open_gap_count,
    count(*) filter (where due_date is not null and due_date < current_date and status <> 'approved'::public.compliance_evidence_status) as overdue_count
  from evidence;
$$;

grant execute on function public.get_compliance_dashboard_summary() to authenticated;

create or replace function public.get_compliance_dashboard_campus_breakdown()
returns table (
  campus_id uuid,
  campus_name text,
  total bigint,
  approved bigint,
  rejected bigint,
  pending bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.campus_id,
    coalesce(c.name, 'Unknown') as campus_name,
    count(*) as total,
    count(*) filter (where e.status = 'approved'::public.compliance_evidence_status) as approved,
    count(*) filter (where e.status = 'rejected'::public.compliance_evidence_status) as rejected,
    count(*) filter (where e.status in ('draft'::public.compliance_evidence_status, 'submitted'::public.compliance_evidence_status)) as pending
  from public.compliance_evidence e
  left join public.campuses c on c.id = e.campus_id
  where e.deleted_at is null
  group by e.campus_id, c.name
  order by coalesce(c.name, 'Unknown');
$$;

grant execute on function public.get_compliance_dashboard_campus_breakdown() to authenticated;

create or replace function public.get_compliance_dashboard_unresolved_gaps(p_limit int default 25)
returns table (
  evidence_id uuid,
  evidence_title text,
  campus_name text,
  office_name text,
  indicator_code text,
  indicator_title text,
  gap_severity public.compliance_gap_severity,
  gap_category public.compliance_gap_category,
  action_plan_status public.compliance_gap_status,
  progress_percent int,
  due_date date,
  is_overdue boolean,
  owner_name text,
  owner_user_label text,
  responsible_office_label text,
  last_progress_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.id as evidence_id,
    e.title as evidence_title,
    coalesce(c.name, 'Unknown') as campus_name,
    o.name as office_name,
    coalesce(ci.code, 'N/A') as indicator_code,
    coalesce(ci.title, 'Unknown') as indicator_title,
    ap.gap_severity,
    ap.gap_category,
    ap.status as action_plan_status,
    ap.progress_percent,
    ap.due_date,
    (ap.due_date < current_date) as is_overdue,
    ap.owner_name,
    coalesce(nullif(trim(concat_ws(' ', au.first_name, au.last_name)), ''), au.email) as owner_user_label,
    case when ro.id is null then null else concat(ro.code, ' - ', ro.name) end as responsible_office_label,
    ap.last_progress_at
  from public.compliance_action_plans ap
  join public.compliance_evidence e on e.id = ap.evidence_id and e.deleted_at is null
  left join public.campuses c on c.id = e.campus_id
  left join public.offices o on o.id = e.office_id
  left join public.compliance_indicators ci on ci.id = e.indicator_id
  left join public.app_users au on au.id = ap.owner_user_id
  left join public.offices ro on ro.id = ap.owner_office_id
  where ap.status in ('open'::public.compliance_gap_status, 'in_progress'::public.compliance_gap_status)
  order by (ap.due_date < current_date) desc, ap.due_date asc
  limit greatest(1, least(p_limit, 100));
$$;

grant execute on function public.get_compliance_dashboard_unresolved_gaps(int) to authenticated;

commit;

