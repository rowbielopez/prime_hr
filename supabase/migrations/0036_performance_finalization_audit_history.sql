begin;

create table if not exists public.performance_finalization_history (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.performance_records(id) on delete cascade,
  cycle_id uuid not null references public.performance_cycles(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  finalized_by_user_id uuid null references public.app_users(id),
  finalized_at timestamptz not null,
  final_score numeric(6,2) not null,
  final_rating text not null,
  finalizer_comments text null,
  snapshot_at timestamptz not null default now()
);

create index if not exists idx_perf_finalization_history_record on public.performance_finalization_history(record_id, snapshot_at desc);
create index if not exists idx_perf_finalization_history_cycle on public.performance_finalization_history(cycle_id, snapshot_at desc);
create index if not exists idx_perf_finalization_history_employee on public.performance_finalization_history(employee_id, snapshot_at desc);
create index if not exists idx_perf_finalization_history_campus on public.performance_finalization_history(campus_id, snapshot_at desc);

alter table public.performance_finalization_history enable row level security;

drop policy if exists performance_finalization_history_scoped_select on public.performance_finalization_history;
create policy performance_finalization_history_scoped_select on public.performance_finalization_history
for select to authenticated
using (
  exists (
    select 1
    from public.performance_records r
    where r.id = performance_finalization_history.record_id
      and (
        r.employee_id = public.current_user_employee_id()
        or r.supervisor_employee_id = public.current_user_employee_id()
        or r.reviewer_employee_id = public.current_user_employee_id()
        or public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
);

drop policy if exists performance_finalization_history_scoped_insert on public.performance_finalization_history;
create policy performance_finalization_history_scoped_insert on public.performance_finalization_history
for insert to authenticated
with check (
  exists (
    select 1
    from public.performance_records r
    where r.id = performance_finalization_history.record_id
      and (
        public.has_active_role('super_admin')
        or public.has_active_role('central_hr_admin')
        or public.has_active_role('campus_hr_officer', r.campus_id)
      )
  )
);

create or replace function public.log_performance_finalization_snapshot()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'finalized'
     and (
       tg_op = 'INSERT'
       or old.status is distinct from 'finalized'
       or old.final_score is distinct from new.final_score
       or old.final_rating is distinct from new.final_rating
       or old.finalizer_comments is distinct from new.finalizer_comments
     ) then
    insert into public.performance_finalization_history (
      record_id,
      cycle_id,
      employee_id,
      campus_id,
      office_id,
      finalized_by_user_id,
      finalized_at,
      final_score,
      final_rating,
      finalizer_comments
    )
    values (
      new.id,
      new.cycle_id,
      new.employee_id,
      new.campus_id,
      new.office_id,
      public.current_app_user_id(),
      coalesce(new.finalized_at, now()),
      new.final_score,
      new.final_rating,
      new.finalizer_comments
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_performance_records_log_finalization_snapshot on public.performance_records;
create trigger trg_performance_records_log_finalization_snapshot
after insert or update on public.performance_records
for each row execute function public.log_performance_finalization_snapshot();

commit;
