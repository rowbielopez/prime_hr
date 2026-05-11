begin;

-- ---------------------------------------------------------------------------
-- 1) AuthZ helpers: campus + optional office (respects user_role_offices)
-- ---------------------------------------------------------------------------

create or replace function public.authz_scoped_campus_office_access(p_campus_id uuid, p_office_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.has_active_role('super_admin') or public.has_active_role('central_hr_admin') then
    return true;
  end if;

  if p_office_id is null then
    return
      public.has_active_role('campus_hr_officer', p_campus_id)
      or public.has_active_role('office_unit_head', p_campus_id)
      or public.has_active_role('committee_member', p_campus_id)
      or public.has_active_role('employee', p_campus_id);
  end if;

  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = public.current_app_user_id()
      and ur.is_active = true
      and (ur.effective_from is null or ur.effective_from <= current_date)
      and (ur.effective_to is null or ur.effective_to >= current_date)
      and ur.campus_id = p_campus_id
      and r.code in ('campus_hr_officer', 'office_unit_head', 'committee_member', 'employee')
      and (
        not exists (select 1 from public.user_role_offices uro where uro.user_role_id = ur.id)
        or exists (
          select 1
          from public.user_role_offices uro2
          where uro2.user_role_id = ur.id
            and uro2.office_id = p_office_id
        )
      )
  );
end;
$$;

create or replace function public.authz_campus_hr_office_write(p_campus_id uuid, p_office_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.has_active_role('super_admin') or public.has_active_role('central_hr_admin') then
    return true;
  end if;
  if not public.has_active_role('campus_hr_officer', p_campus_id) then
    return false;
  end if;
  if p_office_id is null then
    return true;
  end if;
  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = public.current_app_user_id()
      and ur.is_active = true
      and (ur.effective_from is null or ur.effective_from <= current_date)
      and (ur.effective_to is null or ur.effective_to >= current_date)
      and ur.campus_id = p_campus_id
      and r.code = 'campus_hr_officer'
      and (
        not exists (select 1 from public.user_role_offices uro where uro.user_role_id = ur.id)
        or exists (
          select 1
          from public.user_role_offices uro2
          where uro2.user_role_id = ur.id
            and uro2.office_id = p_office_id
        )
      )
  );
end;
$$;

create or replace function public.authz_compliance_scoped_write(p_campus_id uuid, p_office_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.has_active_role('super_admin') or public.has_active_role('central_hr_admin') then
    return true;
  end if;

  if p_office_id is null then
    return
      public.has_active_role('campus_hr_officer', p_campus_id)
      or public.has_active_role('office_unit_head', p_campus_id);
  end if;

  return exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = public.current_app_user_id()
      and ur.is_active = true
      and (ur.effective_from is null or ur.effective_from <= current_date)
      and (ur.effective_to is null or ur.effective_to >= current_date)
      and ur.campus_id = p_campus_id
      and r.code in ('campus_hr_officer', 'office_unit_head')
      and (
        not exists (select 1 from public.user_role_offices uro where uro.user_role_id = ur.id)
        or exists (
          select 1
          from public.user_role_offices uro2
          where uro2.user_role_id = ur.id
            and uro2.office_id = p_office_id
        )
      )
  );
end;
$$;

grant execute on function public.authz_scoped_campus_office_access(uuid, uuid) to authenticated;
grant execute on function public.authz_campus_hr_office_write(uuid, uuid) to authenticated;
grant execute on function public.authz_compliance_scoped_write(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Compliance: indicator must belong to selected area
-- ---------------------------------------------------------------------------

create or replace function public.validate_compliance_evidence_indicator_area()
returns trigger
language plpgsql
as $$
declare
  ind_area uuid;
begin
  select ci.area_id into ind_area
  from public.compliance_indicators ci
  where ci.id = new.indicator_id
    and ci.deleted_at is null;

  if ind_area is null then
    raise exception 'indicator_id does not reference an active indicator';
  end if;

  if ind_area <> new.area_id then
    raise exception 'compliance_evidence indicator must belong to the selected area';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compliance_evidence_validate_indicator_area on public.compliance_evidence;
create trigger trg_compliance_evidence_validate_indicator_area
before insert or update on public.compliance_evidence
for each row execute function public.validate_compliance_evidence_indicator_area();

-- ---------------------------------------------------------------------------
-- 3) Employees: office must belong to campus; documents campus synced from employee
-- ---------------------------------------------------------------------------

create or replace function public.validate_employees_office_scope()
returns trigger
language plpgsql
as $$
declare
  oc uuid;
begin
  if new.office_id is null then
    return new;
  end if;
  select o.campus_id into oc from public.offices o where o.id = new.office_id;
  if oc is null or oc <> new.campus_id then
    raise exception 'employees.office_id must belong to employees.campus_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_employees_validate_office_scope on public.employees;
create trigger trg_employees_validate_office_scope
before insert or update on public.employees
for each row execute function public.validate_employees_office_scope();

create or replace function public.sync_employee_documents_campus()
returns trigger
language plpgsql
as $$
declare
  ec uuid;
begin
  select e.campus_id into ec from public.employees e where e.id = new.employee_id;
  if ec is null then
    raise exception 'employee_id does not reference a valid employee';
  end if;
  new.campus_id := ec;
  return new;
end;
$$;

drop trigger if exists trg_employee_documents_sync_campus on public.employee_documents;
create trigger trg_employee_documents_sync_campus
before insert or update on public.employee_documents
for each row execute function public.sync_employee_documents_campus();

-- ---------------------------------------------------------------------------
-- 4) User roles: effective date sanity
-- ---------------------------------------------------------------------------

alter table public.user_roles
  drop constraint if exists chk_user_roles_effective_range;

alter table public.user_roles
  add constraint chk_user_roles_effective_range
  check (
    effective_from is null
    or effective_to is null
    or effective_to >= effective_from
  );

-- ---------------------------------------------------------------------------
-- 5) Vacancies: posting date sanity
-- ---------------------------------------------------------------------------

alter table public.recruitment_vacancies
  drop constraint if exists chk_recruitment_vacancies_posting_dates;

alter table public.recruitment_vacancies
  add constraint chk_recruitment_vacancies_posting_dates
  check (
    posted_at is null
    or closing_at is null
    or closing_at >= posted_at
  );

-- ---------------------------------------------------------------------------
-- 6) FK semantics (explicit RESTRICT / CASCADE)
-- ---------------------------------------------------------------------------

alter table public.recruitment_applications
  drop constraint if exists recruitment_applications_applicant_id_fkey;

alter table public.recruitment_applications
  add constraint recruitment_applications_applicant_id_fkey
  foreign key (applicant_id) references public.recruitment_applicants(id)
  on delete restrict;

alter table public.recruitment_applications
  drop constraint if exists recruitment_applications_vacancy_id_fkey;

alter table public.recruitment_applications
  add constraint recruitment_applications_vacancy_id_fkey
  foreign key (vacancy_id) references public.recruitment_vacancies(id)
  on delete restrict;

alter table public.user_roles
  drop constraint if exists user_roles_role_id_fkey;

alter table public.user_roles
  add constraint user_roles_role_id_fkey
  foreign key (role_id) references public.roles(id)
  on delete restrict;

-- ---------------------------------------------------------------------------
-- 7) Screening: optional link to application for traceability
-- ---------------------------------------------------------------------------

alter table public.recruitment_screening_results
  add column if not exists application_id uuid null references public.recruitment_applications(id) on delete set null;

create index if not exists idx_recruitment_screening_results_application
  on public.recruitment_screening_results(application_id);

create or replace function public.validate_screening_application_applicant()
returns trigger
language plpgsql
as $$
declare
  aid uuid;
begin
  if new.application_id is null then
    return new;
  end if;
  select ra.applicant_id into aid
  from public.recruitment_applications ra
  where ra.id = new.application_id
    and ra.deleted_at is null;
  if aid is null then
    raise exception 'application_id does not reference a valid application';
  end if;
  if aid <> new.applicant_id then
    raise exception 'screening application must belong to the same applicant';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recruitment_screening_validate_application on public.recruitment_screening_results;
create trigger trg_recruitment_screening_validate_application
before insert or update on public.recruitment_screening_results
for each row execute function public.validate_screening_application_applicant();

-- ---------------------------------------------------------------------------
-- 8) Compliance action plans: allow multiple plans per evidence
-- ---------------------------------------------------------------------------

alter table public.compliance_action_plans
  drop constraint if exists compliance_action_plans_evidence_id_key;

create index if not exists idx_compliance_action_plans_evidence_id
  on public.compliance_action_plans(evidence_id);

-- ---------------------------------------------------------------------------
-- 9) Audit logs: optional typed entity id + immutability + tighter insert
-- ---------------------------------------------------------------------------

alter table public.audit_logs
  add column if not exists entity_uuid uuid null;

create index if not exists idx_audit_logs_entity_uuid on public.audit_logs(entity_uuid);

create or replace function public.audit_logs_set_entity_uuid()
returns trigger
language plpgsql
as $$
begin
  if new.entity_id is not null then
    begin
      new.entity_uuid := new.entity_id::uuid;
    exception
      when invalid_text_representation then
        new.entity_uuid := null;
    end;
  else
    new.entity_uuid := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_logs_set_entity_uuid on public.audit_logs;
create trigger trg_audit_logs_set_entity_uuid
before insert on public.audit_logs
for each row execute function public.audit_logs_set_entity_uuid();

revoke update, delete on public.audit_logs from authenticated;
revoke update, delete on public.audit_logs from anon;
grant select, insert on public.audit_logs to authenticated;

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert
on public.audit_logs
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or (
    actor_user_id is not null
    and actor_user_id = public.current_app_user_id()
  )
);

-- ---------------------------------------------------------------------------
-- 10) Recommendation status history
-- ---------------------------------------------------------------------------

create table if not exists public.recruitment_recommendation_status_history (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recruitment_appointment_recommendations(id) on delete cascade,
  from_status public.recommendation_status null,
  to_status public.recommendation_status not null,
  remarks text null,
  changed_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_recruitment_recommendation_status_hist_rec
  on public.recruitment_recommendation_status_history(recommendation_id);
create index if not exists idx_recruitment_recommendation_status_hist_created
  on public.recruitment_recommendation_status_history(created_at desc);

create or replace function public.log_recruitment_recommendation_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.recruitment_recommendation_status_history (
      recommendation_id,
      from_status,
      to_status,
      remarks,
      changed_by_user_id
    ) values (
      new.id,
      old.status,
      new.status,
      new.remarks,
      public.current_app_user_id()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recommendations_log_status on public.recruitment_appointment_recommendations;
create trigger trg_recommendations_log_status
after update on public.recruitment_appointment_recommendations
for each row execute function public.log_recruitment_recommendation_status_change();

alter table public.recruitment_recommendation_status_history enable row level security;

drop policy if exists recruitment_recommendation_status_hist_select on public.recruitment_recommendation_status_history;
create policy recruitment_recommendation_status_hist_select
on public.recruitment_recommendation_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_appointment_recommendations r
    where r.id = recommendation_id
      and r.deleted_at is null
      and public.authz_scoped_campus_office_access(r.campus_id, r.office_id)
  )
);

drop policy if exists recruitment_recommendation_status_hist_insert on public.recruitment_recommendation_status_history;
create policy recruitment_recommendation_status_hist_insert
on public.recruitment_recommendation_status_history
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or exists (
    select 1
    from public.recruitment_appointment_recommendations r
    where r.id = recommendation_id
      and public.authz_campus_hr_office_write(r.campus_id, r.office_id)
  )
);

-- ---------------------------------------------------------------------------
-- 11) Reporting indexes (common list / filter paths)
-- ---------------------------------------------------------------------------

create index if not exists idx_recruitment_applications_campus_status_updated
  on public.recruitment_applications(campus_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists idx_recruitment_vacancies_campus_status_updated
  on public.recruitment_vacancies(campus_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists idx_compliance_evidence_campus_status_updated
  on public.compliance_evidence(campus_id, status, updated_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- 12) RLS policy refresh: employees & employee_documents
-- ---------------------------------------------------------------------------

drop policy if exists employees_scoped_select on public.employees;
create policy employees_scoped_select
on public.employees
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists employee_documents_scoped_select on public.employee_documents;
create policy employee_documents_scoped_select
on public.employee_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_id
      and public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
  )
);

drop policy if exists employees_admin_insert on public.employees;
create policy employees_admin_insert
on public.employees
for insert
to authenticated
with check (
  public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists employees_admin_update on public.employees;
create policy employees_admin_update
on public.employees
for update
to authenticated
using (public.authz_campus_hr_office_write(campus_id, office_id))
with check (public.authz_campus_hr_office_write(campus_id, office_id));

drop policy if exists employee_documents_admin_manage on public.employee_documents;
create policy employee_documents_admin_manage
on public.employee_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.employees e
    where e.id = employee_id
      and public.authz_campus_hr_office_write(e.campus_id, e.office_id)
  )
)
with check (
  exists (
    select 1
    from public.employees e
    where e.id = employee_id
      and public.authz_campus_hr_office_write(e.campus_id, e.office_id)
  )
);

-- ---------------------------------------------------------------------------
-- 13) Recruitment: vacancies, applicants, applications
-- ---------------------------------------------------------------------------

drop policy if exists recruitment_vacancies_scoped_select on public.recruitment_vacancies;
create policy recruitment_vacancies_scoped_select
on public.recruitment_vacancies
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists recruitment_vacancies_scoped_insert on public.recruitment_vacancies;
create policy recruitment_vacancies_scoped_insert
on public.recruitment_vacancies
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists recruitment_vacancies_scoped_update on public.recruitment_vacancies;
create policy recruitment_vacancies_scoped_update
on public.recruitment_vacancies
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists recruitment_applicants_scoped_select on public.recruitment_applicants;
create policy recruitment_applicants_scoped_select
on public.recruitment_applicants
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists recruitment_applicants_scoped_insert on public.recruitment_applicants;
create policy recruitment_applicants_scoped_insert
on public.recruitment_applicants
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists recruitment_applicants_scoped_update on public.recruitment_applicants;
create policy recruitment_applicants_scoped_update
on public.recruitment_applicants
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists recruitment_applications_scoped_select on public.recruitment_applications;
create policy recruitment_applications_scoped_select
on public.recruitment_applications
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists recruitment_applications_scoped_insert on public.recruitment_applications;
create policy recruitment_applications_scoped_insert
on public.recruitment_applications
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists recruitment_applications_scoped_update on public.recruitment_applications;
create policy recruitment_applications_scoped_update
on public.recruitment_applications
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

-- ---------------------------------------------------------------------------
-- 14) Recruitment: screening, interviews, application status history
-- ---------------------------------------------------------------------------

drop policy if exists recruitment_screening_results_scoped_select on public.recruitment_screening_results;
create policy recruitment_screening_results_scoped_select
on public.recruitment_screening_results
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and public.authz_scoped_campus_office_access(a.campus_id, a.office_id)
  )
);

drop policy if exists recruitment_screening_results_scoped_write on public.recruitment_screening_results;
create policy recruitment_screening_results_scoped_write
on public.recruitment_screening_results
for all
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.authz_campus_hr_office_write(a.campus_id, a.office_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.authz_campus_hr_office_write(a.campus_id, a.office_id)
      )
  )
);

drop policy if exists recruitment_interviews_scoped_select on public.recruitment_interviews;
create policy recruitment_interviews_scoped_select
on public.recruitment_interviews
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and public.authz_scoped_campus_office_access(a.campus_id, a.office_id)
  )
);

drop policy if exists recruitment_interviews_scoped_write on public.recruitment_interviews;
create policy recruitment_interviews_scoped_write
on public.recruitment_interviews
for all
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.authz_campus_hr_office_write(a.campus_id, a.office_id)
      )
  )
)
with check (
  exists (
    select 1
    from public.recruitment_applicants a
    where a.id = applicant_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.authz_campus_hr_office_write(a.campus_id, a.office_id)
      )
  )
);

drop policy if exists recruitment_application_status_history_scoped_select on public.recruitment_application_status_history;
create policy recruitment_application_status_history_scoped_select
on public.recruitment_application_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.recruitment_applications ra
    where ra.id = application_id
      and public.authz_scoped_campus_office_access(ra.campus_id, ra.office_id)
  )
);

drop policy if exists recruitment_application_status_history_scoped_insert on public.recruitment_application_status_history;
create policy recruitment_application_status_history_scoped_insert
on public.recruitment_application_status_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.recruitment_applications ra
    where ra.id = application_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.authz_campus_hr_office_write(ra.campus_id, ra.office_id)
      )
  )
);

-- ---------------------------------------------------------------------------
-- 15) Compliance: evidence + children
-- ---------------------------------------------------------------------------

drop policy if exists compliance_evidence_scoped_select on public.compliance_evidence;
create policy compliance_evidence_scoped_select
on public.compliance_evidence
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists compliance_evidence_scoped_insert on public.compliance_evidence;
create policy compliance_evidence_scoped_insert
on public.compliance_evidence
for insert
to authenticated
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_compliance_scoped_write(campus_id, office_id)
);

drop policy if exists compliance_evidence_scoped_update on public.compliance_evidence;
create policy compliance_evidence_scoped_update
on public.compliance_evidence
for update
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_compliance_scoped_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_compliance_scoped_write(campus_id, office_id)
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
      and public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
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
        or public.authz_compliance_scoped_write(e.campus_id, e.office_id)
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
        or public.authz_compliance_scoped_write(e.campus_id, e.office_id)
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
      and public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
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
        or public.authz_compliance_scoped_write(e.campus_id, e.office_id)
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
        or public.authz_compliance_scoped_write(e.campus_id, e.office_id)
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
      and public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
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
        or public.authz_compliance_scoped_write(e.campus_id, e.office_id)
        or (
          public.has_active_role('committee_member', e.campus_id)
          and public.authz_scoped_campus_office_access(e.campus_id, e.office_id)
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- 16) Recruitment: ranking + recommendations
-- ---------------------------------------------------------------------------

drop policy if exists recruitment_ranking_entries_scoped_select on public.recruitment_ranking_entries;
create policy recruitment_ranking_entries_scoped_select
on public.recruitment_ranking_entries
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists recruitment_ranking_entries_scoped_write on public.recruitment_ranking_entries;
create policy recruitment_ranking_entries_scoped_write
on public.recruitment_ranking_entries
for all
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists recruitment_recommendations_scoped_select on public.recruitment_appointment_recommendations;
create policy recruitment_recommendations_scoped_select
on public.recruitment_appointment_recommendations
for select
to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists recruitment_recommendations_scoped_write on public.recruitment_appointment_recommendations;
create policy recruitment_recommendations_scoped_write
on public.recruitment_appointment_recommendations
for all
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

commit;
