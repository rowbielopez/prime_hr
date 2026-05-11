begin;

create or replace function public.validate_app_user_office_scope()
returns trigger
language plpgsql
as $$
declare
  office_campus_id uuid;
begin
  if new.primary_office_id is null then
    return new;
  end if;

  select o.campus_id into office_campus_id
  from public.offices o
  where o.id = new.primary_office_id;

  if office_campus_id is null then
    raise exception 'primary_office_id does not reference a valid office';
  end if;

  if new.primary_campus_id is not null and office_campus_id <> new.primary_campus_id then
    raise exception 'primary_office_id campus must match primary_campus_id';
  end if;

  if new.primary_campus_id is null then
    new.primary_campus_id := office_campus_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_app_users_validate_office_scope on public.app_users;
create trigger trg_app_users_validate_office_scope
before insert or update on public.app_users
for each row execute function public.validate_app_user_office_scope();

create or replace function public.validate_evidence_office_scope()
returns trigger
language plpgsql
as $$
declare
  office_campus_id uuid;
begin
  if new.office_id is null then
    return new;
  end if;

  select o.campus_id into office_campus_id
  from public.offices o
  where o.id = new.office_id;

  if office_campus_id is null then
    raise exception 'office_id does not reference a valid office';
  end if;

  if office_campus_id <> new.campus_id then
    raise exception 'evidence office_id campus must match evidence campus_id';
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'evidence_records'
  ) then
    execute 'drop trigger if exists trg_evidence_records_validate_office_scope on public.evidence_records';
    execute 'create trigger trg_evidence_records_validate_office_scope before insert or update on public.evidence_records for each row execute function public.validate_evidence_office_scope()';
  end if;
end $$;

commit;

