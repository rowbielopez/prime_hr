begin;

-- ---------------------------------------------------------------------------
-- 1) Committee reviewers: may UPDATE evidence rows (scoped) — column guard below
-- ---------------------------------------------------------------------------

drop policy if exists compliance_evidence_scoped_update on public.compliance_evidence;
create policy compliance_evidence_scoped_update
on public.compliance_evidence
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_compliance_scoped_write(campus_id, office_id)
  or (
    public.has_active_role('committee_member', campus_id)
    and public.authz_scoped_campus_office_access(campus_id, office_id)
  )
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_compliance_scoped_write(campus_id, office_id)
  or (
    public.has_active_role('committee_member', campus_id)
    and public.authz_scoped_campus_office_access(campus_id, office_id)
  )
);

-- ---------------------------------------------------------------------------
-- 2) Approved evidence: only global HR admins may change content (aligns with app)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_compliance_evidence_update_rules()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'approved'::public.compliance_evidence_status then
    if not (
      public.has_active_role('super_admin')
      or public.has_active_role('central_hr_admin')
    ) then
      raise exception 'approved evidence is locked; only central HR administrators may change it.';
    end if;
  end if;

  if public.has_active_role('committee_member', new.campus_id)
     and not public.authz_compliance_scoped_write(new.campus_id, new.office_id) then
    if (
      old.title is distinct from new.title
      or old.description is distinct from new.description
      or old.area_id is distinct from new.area_id
      or old.indicator_id is distinct from new.indicator_id
      or old.campus_id is distinct from new.campus_id
      or old.office_id is distinct from new.office_id
      or old.reporting_period is distinct from new.reporting_period
      or old.owner_user_id is distinct from new.owner_user_id
      or old.due_date is distinct from new.due_date
      or old.deleted_at is distinct from new.deleted_at
    ) then
      raise exception 'committee reviewers may only update review status fields on evidence';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compliance_evidence_enforce_update_rules on public.compliance_evidence;
create trigger trg_compliance_evidence_enforce_update_rules
before update on public.compliance_evidence
for each row execute function public.enforce_compliance_evidence_update_rules();

-- ---------------------------------------------------------------------------
-- 3) Atomic status change + history row with actor (single transaction)
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
begin
  select e.status
  into v_old_status
  from public.compliance_evidence e
  where e.id = p_evidence_id
    and e.deleted_at is null;

  if not found then
    raise exception 'Evidence not found';
  end if;

  update public.compliance_evidence
  set
    status = p_to_status,
    submitted_at = case when p_to_status = 'submitted' then v_ts else null end,
    approved_at = case when p_to_status = 'approved' then v_ts else null end,
    rejected_at = case when p_to_status = 'rejected' then v_ts else null end,
    reviewer_remarks = nullif(trim(coalesce(p_remarks, '')), '')
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
    nullif(trim(coalesce(p_remarks, '')), ''),
    public.current_app_user_id()
  );
end;
$$;

grant execute on function public.apply_compliance_evidence_status_change(uuid, public.compliance_evidence_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Prevent duplicate evidence for same indicator / campus / office / period
-- ---------------------------------------------------------------------------

create unique index if not exists uq_compliance_evidence_indicator_scope_period
  on public.compliance_evidence (indicator_id, campus_id, (coalesce(office_id::text, '')), reporting_period)
  where deleted_at is null;

commit;
