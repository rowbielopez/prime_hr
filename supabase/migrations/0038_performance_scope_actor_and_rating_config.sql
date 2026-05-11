begin;

-- ---------------------------------------------------------------------------
-- 1) Status history actor attribution
-- ---------------------------------------------------------------------------

alter table public.performance_status_history
  add column if not exists changed_by_user_id uuid null references public.app_users(id);

create index if not exists idx_performance_status_history_changed_by
  on public.performance_status_history(changed_by_user_id, changed_at desc);

create or replace function public.touch_performance_record_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.status <> new.status then
    if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'finalized' and new.finalized_at is null then new.finalized_at := now(); end if;
    insert into public.performance_status_history(record_id, from_status, to_status, changed_by_user_id)
    values (new.id, old.status, new.status, public.current_app_user_id());
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Record scope must align with selected cycle scope
-- ---------------------------------------------------------------------------

create or replace function public.validate_performance_record_cycle_scope()
returns trigger
language plpgsql
as $$
declare
  v_cycle_campus uuid;
  v_cycle_office uuid;
  v_office_campus uuid;
begin
  select c.campus_id, c.office_id
  into v_cycle_campus, v_cycle_office
  from public.performance_cycles c
  where c.id = new.cycle_id
    and c.deleted_at is null;

  if not found then
    raise exception 'Performance cycle not found.';
  end if;

  if v_cycle_campus is not null and new.campus_id <> v_cycle_campus then
    raise exception 'Performance record campus must match cycle campus.';
  end if;

  if v_cycle_office is not null and new.office_id is distinct from v_cycle_office then
    raise exception 'Performance record office must match cycle office.';
  end if;

  if new.office_id is not null then
    select o.campus_id into v_office_campus
    from public.offices o
    where o.id = new.office_id;
    if v_office_campus is null then
      raise exception 'Office not found.';
    end if;
    if v_office_campus <> new.campus_id then
      raise exception 'Performance record office must belong to record campus.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_performance_records_validate_cycle_scope on public.performance_records;
create trigger trg_performance_records_validate_cycle_scope
before insert or update on public.performance_records
for each row execute function public.validate_performance_record_cycle_scope();

-- ---------------------------------------------------------------------------
-- 3) Centralized rating band configuration (source for DB + app parity)
-- ---------------------------------------------------------------------------
-- Values generated from src/features/performance/rating-band-config.ts

create table if not exists public.performance_rating_band_config (
  band text primary key,
  min_score numeric(6,2) not null,
  sort_order integer not null unique
);

insert into public.performance_rating_band_config(band, min_score, sort_order)
values
  ('Outstanding', 4.5, 1),
  ('Very Satisfactory', 3.5, 2),
  ('Satisfactory', 2.5, 3),
  ('Needs Improvement', 1.5, 4),
  ('Poor', 0, 5)
on conflict (band) do update
set min_score = excluded.min_score,
    sort_order = excluded.sort_order;

create or replace function public.resolve_performance_rating_band(p_score numeric)
returns text
language sql
stable
as $$
  select c.band
  from public.performance_rating_band_config c
  where p_score >= c.min_score
  order by c.min_score desc
  limit 1
$$;

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

  expected_band := public.resolve_performance_rating_band(computed_score);
  if expected_band is null then
    raise exception 'Unable to resolve rating band for score %.', computed_score;
  end if;

  if new.final_rating <> expected_band then
    raise exception 'final_rating (%) does not match computed rating band (%).', new.final_rating, expected_band;
  end if;

  return new;
end;
$$;

commit;

