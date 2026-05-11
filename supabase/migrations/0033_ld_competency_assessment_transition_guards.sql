begin;

alter table public.ld_competency_assessments
  add column if not exists submitted_at timestamptz null,
  add column if not exists validated_at timestamptz null,
  add column if not exists status_changed_at timestamptz not null default now();

update public.ld_competency_assessments
set status_changed_at = coalesce(updated_at, created_at, now()),
    submitted_at = case when status in ('submitted', 'validated') then coalesce(updated_at, created_at, now()) else submitted_at end,
    validated_at = case when status = 'validated' then coalesce(updated_at, created_at, now()) else validated_at end
where true;

create or replace function public.validate_ld_competency_assessment_status_transition()
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
  if old.status = 'draft' and new.status = 'submitted' then
    return new;
  end if;
  if old.status = 'submitted' and new.status in ('draft', 'validated') then
    return new;
  end if;
  raise exception 'Invalid competency assessment status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.touch_ld_competency_assessment_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
  elsif old.status <> new.status then
    new.status_changed_at := now();
    if new.status in ('submitted', 'validated') and new.submitted_at is null then
      new.submitted_at := now();
    end if;
    if new.status = 'validated' and new.validated_at is null then
      new.validated_at := now();
    end if;
    if new.status <> 'validated' then
      new.validated_at := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ld_competency_assessments_status_transition on public.ld_competency_assessments;
create trigger trg_ld_competency_assessments_status_transition
before update on public.ld_competency_assessments
for each row execute function public.validate_ld_competency_assessment_status_transition();

drop trigger if exists trg_ld_competency_assessments_lifecycle on public.ld_competency_assessments;
create trigger trg_ld_competency_assessments_lifecycle
before insert or update on public.ld_competency_assessments
for each row execute function public.touch_ld_competency_assessment_lifecycle();

commit;
