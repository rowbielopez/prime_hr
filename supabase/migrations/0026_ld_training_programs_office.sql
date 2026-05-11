begin;

alter table public.ld_training_programs
  add column if not exists office_id uuid null references public.offices(id);

create index if not exists idx_ld_training_programs_office_id on public.ld_training_programs(office_id);

create or replace function public.validate_ld_program_office_scope()
returns trigger
language plpgsql
as $$
declare
  office_campus_id uuid;
begin
  if new.office_id is null then
    return new;
  end if;

  if new.campus_id is null then
    raise exception 'Campus is required when an office is selected';
  end if;

  select o.campus_id into office_campus_id
  from public.offices o
  where o.id = new.office_id;

  if office_campus_id is null then
    raise exception 'office_id does not reference a valid office';
  end if;

  if office_campus_id <> new.campus_id then
    raise exception 'Program office must belong to the selected campus';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ld_training_programs_validate_office_scope on public.ld_training_programs;
create trigger trg_ld_training_programs_validate_office_scope
before insert or update on public.ld_training_programs
for each row execute function public.validate_ld_program_office_scope();

-- Tighten employee self-service: active programs scoped to office when office_id is set.
drop policy if exists ld_training_programs_scoped_select on public.ld_training_programs;
create policy ld_training_programs_scoped_select
on public.ld_training_programs
for select
to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.has_active_role('campus_hr_officer', campus_id)
  or public.has_active_role('office_unit_head', campus_id)
  or public.has_active_role('committee_member', campus_id)
  or campus_id is null
  or (
    status = 'active'
    and (
      campus_id is null
      or (
        campus_id = (
          select e.campus_id
          from public.employees e
          where e.id = public.current_user_employee_id()
        )
        and (
          office_id is null
          or office_id = (
            select e.office_id
            from public.employees e
            where e.id = public.current_user_employee_id()
          )
        )
      )
    )
  )
);

commit;
