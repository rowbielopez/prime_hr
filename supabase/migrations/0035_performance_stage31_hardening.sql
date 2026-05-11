begin;

do $$ begin
  alter table public.performance_records
    add constraint chk_performance_records_final_score_range
    check (final_score is null or (final_score >= 1 and final_score <= 5)) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.performance_records
    add constraint chk_performance_records_final_rating_allowed
    check (
      final_rating is null
      or final_rating in ('Outstanding', 'Very Satisfactory', 'Satisfactory', 'Needs Improvement', 'Poor')
    ) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.performance_records
    add constraint chk_performance_records_finalized_requires_summary
    check (
      status <> 'finalized'
      or (final_score is not null and final_rating is not null and finalized_at is not null)
    ) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.performance_objectives
    add constraint chk_performance_objectives_reviewer_score_range
    check (reviewer_score is null or (reviewer_score >= 1 and reviewer_score <= 5)) not valid;
exception when duplicate_object then null; end $$;

create or replace function public.validate_performance_record_finalization_guard()
returns trigger
language plpgsql
as $$
declare
  objective_count bigint := 0;
  scored_count bigint := 0;
  total_weight numeric := 0;
  computed_score numeric := 0;
  expected_band text;
begin
  if new.status <> 'finalized' then
    return new;
  end if;

  if new.final_score is null or new.final_rating is null then
    raise exception 'Finalized records must include final_score and final_rating.';
  end if;

  select
    count(*)::bigint,
    count(*) filter (where o.reviewer_score is not null)::bigint,
    coalesce(sum(o.weight), 0),
    coalesce(sum((o.weight * o.reviewer_score) / 100.0), 0)
  into objective_count, scored_count, total_weight, computed_score
  from public.performance_objectives o
  where o.record_id = new.id;

  if objective_count = 0 then
    raise exception 'Finalized records must have at least one objective.';
  end if;

  if objective_count <> scored_count then
    raise exception 'All objectives must have reviewer_score before finalization.';
  end if;

  if abs(total_weight - 100) > 0.01 then
    raise exception 'Objective weights must total 100 before finalization. Current total: %', total_weight;
  end if;

  computed_score := round(computed_score::numeric, 2);
  if abs(new.final_score - computed_score) > 0.05 then
    raise exception 'final_score (%) does not match weighted objective reviewer_score (%).', new.final_score, computed_score;
  end if;

  expected_band := case
    when computed_score >= 4.5 then 'Outstanding'
    when computed_score >= 3.5 then 'Very Satisfactory'
    when computed_score >= 2.5 then 'Satisfactory'
    when computed_score >= 1.5 then 'Needs Improvement'
    else 'Poor'
  end;

  if new.final_rating <> expected_band then
    raise exception 'final_rating (%) does not match computed rating band (%).', new.final_rating, expected_band;
  end if;

  return new;
end;
$$;

create or replace function public.guard_performance_objective_reviewer_score_on_finalized()
returns trigger
language plpgsql
as $$
declare
  record_status public.perf_record_status;
begin
  if tg_op = 'DELETE' then
    select r.status into record_status from public.performance_records r where r.id = old.record_id;
    if record_status = 'finalized' then
      raise exception 'Cannot remove objectives from finalized records.';
    end if;
    return old;
  end if;

  select r.status into record_status from public.performance_records r where r.id = new.record_id;

  if record_status = 'finalized' then
    if new.reviewer_score is null then
      raise exception 'reviewer_score is required for finalized records.';
    end if;
    if tg_op = 'UPDATE' and old.reviewer_score is distinct from new.reviewer_score then
      raise exception 'Cannot modify reviewer_score for finalized records.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_performance_records_finalization_guard on public.performance_records;
create trigger trg_performance_records_finalization_guard
before insert or update on public.performance_records
for each row execute function public.validate_performance_record_finalization_guard();

drop trigger if exists trg_performance_objectives_reviewer_guard on public.performance_objectives;
create trigger trg_performance_objectives_reviewer_guard
before insert or update or delete on public.performance_objectives
for each row execute function public.guard_performance_objective_reviewer_score_on_finalized();

commit;
