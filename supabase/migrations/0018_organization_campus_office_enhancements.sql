begin;

-- Display helpers and stable ordering (code remains the stable identifier).
alter table public.campuses
  add column if not exists short_name text null,
  add column if not exists sort_order integer not null default 0;

alter table public.offices
  add column if not exists sort_order integer not null default 0,
  add column if not exists office_type text not null default 'other';

alter table public.offices
  add constraint chk_offices_office_type
  check (office_type in ('academic', 'administrative', 'student_services', 'other'));

create index if not exists idx_campuses_sort_order on public.campuses (sort_order, name);
create index if not exists idx_offices_sort_order on public.offices (campus_id, sort_order, name);

-- Block moving an office to another campus when it is already referenced.
create or replace function public.enforce_office_campus_change_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'update' and new.campus_id is distinct from old.campus_id then
    if exists (select 1 from public.app_users u where u.primary_office_id = old.id) then
      raise exception 'Cannot change office campus: assigned as a user primary office.';
    end if;
    if exists (select 1 from public.employees e where e.office_id = old.id and e.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to employee records.';
    end if;
    if exists (select 1 from public.user_role_offices uro where uro.office_id = old.id) then
      raise exception 'Cannot change office campus: linked to role assignments.';
    end if;
    if exists (select 1 from public.compliance_evidence ce where ce.office_id = old.id and ce.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to compliance evidence.';
    end if;
    if exists (select 1 from public.recruitment_vacancies rv where rv.office_id = old.id and rv.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to recruitment vacancies.';
    end if;
    if exists (select 1 from public.recruitment_applicants ra where ra.office_id = old.id and ra.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to recruitment applicants.';
    end if;
    if exists (select 1 from public.recruitment_applications rapp where rapp.office_id = old.id and rapp.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to recruitment applications.';
    end if;
    if exists (select 1 from public.recruitment_ranking_entries re where re.office_id = old.id and re.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to ranking entries.';
    end if;
    if exists (select 1 from public.recruitment_appointment_recommendations ar where ar.office_id = old.id and ar.deleted_at is null) then
      raise exception 'Cannot change office campus: linked to appointment recommendations.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_offices_enforce_campus_change on public.offices;
create trigger trg_offices_enforce_campus_change
before update of campus_id on public.offices
for each row execute function public.enforce_office_campus_change_guard();

commit;
