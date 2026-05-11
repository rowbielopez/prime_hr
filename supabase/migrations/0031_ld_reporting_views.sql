begin;

create or replace view public.v_ld_request_pipeline as
select
  r.campus_id,
  c.name as campus_name,
  r.request_kind,
  r.status,
  count(*)::bigint as request_count
from public.ld_training_requests r
join public.campuses c on c.id = r.campus_id
group by r.campus_id, c.name, r.request_kind, r.status;

create or replace view public.v_ld_session_utilization as
select
  s.id as session_id,
  s.program_id,
  s.campus_id,
  c.name as campus_name,
  s.title as session_title,
  s.starts_at,
  s.capacity,
  s.status,
  count(p.id)::bigint as participant_count,
  count(*) filter (where p.attendance = 'attended')::bigint as attended_count,
  count(*) filter (where p.attendance = 'absent')::bigint as absent_count,
  count(*) filter (where p.completion = 'completed')::bigint as completed_count
from public.ld_training_sessions s
left join public.ld_session_participants p on p.session_id = s.id
join public.campuses c on c.id = s.campus_id
where s.deleted_at is null
group by s.id, s.program_id, s.campus_id, c.name, s.title, s.starts_at, s.capacity, s.status;

create materialized view if not exists public.mv_ld_completion_kpis_daily as
select
  date_trunc('day', s.starts_at)::date as metric_date,
  s.campus_id,
  s.program_id,
  count(p.id)::bigint as participant_count,
  count(*) filter (where p.completion = 'completed')::bigint as completed_count,
  count(*) filter (where p.attendance = 'attended')::bigint as attended_count
from public.ld_training_sessions s
left join public.ld_session_participants p on p.session_id = s.id
where s.deleted_at is null
group by date_trunc('day', s.starts_at)::date, s.campus_id, s.program_id;

create unique index if not exists idx_mv_ld_completion_kpis_daily_key
  on public.mv_ld_completion_kpis_daily(metric_date, campus_id, program_id);

create materialized view if not exists public.mv_ld_delivery_load_monthly as
select
  date_trunc('month', s.starts_at)::date as metric_month,
  s.campus_id,
  s.program_id,
  count(s.id)::bigint as session_count,
  sum(coalesce(s.capacity, 0))::bigint as planned_capacity,
  sum(coalesce(u.participant_count, 0))::bigint as enrolled_count
from public.ld_training_sessions s
left join (
  select session_id, count(*)::bigint as participant_count
  from public.ld_session_participants
  group by session_id
) u on u.session_id = s.id
where s.deleted_at is null
group by date_trunc('month', s.starts_at)::date, s.campus_id, s.program_id;

create unique index if not exists idx_mv_ld_delivery_load_monthly_key
  on public.mv_ld_delivery_load_monthly(metric_month, campus_id, program_id);

create or replace function public.refresh_ld_reporting_materialized_views()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.mv_ld_completion_kpis_daily;
  refresh materialized view public.mv_ld_delivery_load_monthly;
end;
$$;

grant execute on function public.refresh_ld_reporting_materialized_views() to authenticated;

commit;
