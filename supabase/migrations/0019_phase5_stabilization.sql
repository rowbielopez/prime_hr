begin;

-- ---------------------------------------------------------------------------
-- 1) Audit integrity: allow writes only from trusted service-role path
-- ---------------------------------------------------------------------------

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert
on public.audit_logs
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

-- ---------------------------------------------------------------------------
-- 2) Compliance action plans: enforce one plan per evidence (matches upsert)
-- ---------------------------------------------------------------------------

create unique index if not exists uq_compliance_action_plans_evidence_id
  on public.compliance_action_plans(evidence_id);

commit;

