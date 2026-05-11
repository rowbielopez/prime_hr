begin;

alter table public.ld_training_programs
  add column if not exists activated_at timestamptz null,
  add column if not exists archived_at timestamptz null,
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.ld_annual_plans
  add column if not exists approved_at timestamptz null,
  add column if not exists activated_at timestamptz null,
  add column if not exists closed_at timestamptz null,
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.ld_training_sessions
  add column if not exists started_at timestamptz null,
  add column if not exists completed_at timestamptz null,
  add column if not exists cancelled_at timestamptz null,
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.ld_training_requests
  add column if not exists submitted_at timestamptz null,
  add column if not exists reviewed_at timestamptz null,
  add column if not exists approved_at timestamptz null,
  add column if not exists rejected_at timestamptz null,
  add column if not exists withdrawn_at timestamptz null,
  add column if not exists status_changed_at timestamptz not null default now();

alter table public.ld_session_participants
  add column if not exists attendance_marked_at timestamptz null;

update public.ld_training_programs
set status_changed_at = coalesce(updated_at, created_at, now()),
    activated_at = case when status = 'active' then coalesce(updated_at, created_at, now()) else activated_at end,
    archived_at = case when status = 'archived' then coalesce(updated_at, created_at, now()) else archived_at end
where true;

update public.ld_annual_plans
set status_changed_at = coalesce(updated_at, created_at, now()),
    approved_at = case when status in ('approved', 'active', 'closed') then coalesce(updated_at, created_at, now()) else approved_at end,
    activated_at = case when status in ('active', 'closed') then coalesce(updated_at, created_at, now()) else activated_at end,
    closed_at = case when status = 'closed' then coalesce(updated_at, created_at, now()) else closed_at end
where true;

update public.ld_training_sessions
set status_changed_at = coalesce(updated_at, created_at, now()),
    started_at = case when status in ('in_progress', 'completed') then coalesce(starts_at, updated_at, created_at, now()) else started_at end,
    completed_at = case when status = 'completed' then coalesce(ends_at, updated_at, created_at, now()) else completed_at end,
    cancelled_at = case when status = 'cancelled' then coalesce(updated_at, created_at, now()) else cancelled_at end
where true;

update public.ld_training_requests
set status_changed_at = coalesce(updated_at, created_at, now()),
    submitted_at = case when status in ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn') then coalesce(created_at, now()) else submitted_at end,
    reviewed_at = case when status in ('under_review', 'approved', 'rejected') then coalesce(updated_at, created_at, now()) else reviewed_at end,
    approved_at = case when status = 'approved' then coalesce(updated_at, created_at, now()) else approved_at end,
    rejected_at = case when status = 'rejected' then coalesce(updated_at, created_at, now()) else rejected_at end,
    withdrawn_at = case when status = 'withdrawn' then coalesce(updated_at, created_at, now()) else withdrawn_at end
where true;

update public.ld_session_participants
set completed_at = case when completion = 'completed' then coalesce(completed_at, updated_at, created_at, now()) else null end,
    attendance_marked_at = case when attendance <> 'registered' then coalesce(updated_at, created_at, now()) else attendance_marked_at end
where true;

do $$ begin
  alter table public.ld_session_participants
    add constraint chk_ld_session_participants_completion_timestamp_consistency
    check (
      (completion = 'completed' and completed_at is not null)
      or
      (completion <> 'completed' and completed_at is null)
    ) not valid;
exception when duplicate_object then null; end $$;

alter table public.ld_session_participants
  validate constraint chk_ld_session_participants_completion_timestamp_consistency;

create or replace function public.touch_ld_training_program_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
  elsif old.status <> new.status then
    new.status_changed_at := now();
    if new.status = 'active' and new.activated_at is null then new.activated_at := now(); end if;
    if new.status = 'archived' and new.archived_at is null then new.archived_at := now(); end if;
  end if;
  return new;
end;
$$;

create or replace function public.touch_ld_annual_plan_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
  elsif old.status <> new.status then
    new.status_changed_at := now();
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'active' and new.activated_at is null then new.activated_at := now(); end if;
    if new.status = 'closed' and new.closed_at is null then new.closed_at := now(); end if;
  end if;
  return new;
end;
$$;

create or replace function public.touch_ld_training_session_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
  elsif old.status <> new.status then
    new.status_changed_at := now();
    if new.status = 'in_progress' and new.started_at is null then new.started_at := now(); end if;
    if new.status = 'completed' and new.completed_at is null then new.completed_at := now(); end if;
    if new.status = 'cancelled' and new.cancelled_at is null then new.cancelled_at := now(); end if;
  end if;
  return new;
end;
$$;

create or replace function public.touch_ld_training_request_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := coalesce(new.status_changed_at, now());
    if new.status in ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn') and new.submitted_at is null then
      new.submitted_at := now();
    end if;
  elsif old.status <> new.status then
    new.status_changed_at := now();
    if new.status in ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn') and new.submitted_at is null then
      new.submitted_at := now();
    end if;
    if new.status in ('under_review', 'approved', 'rejected') and new.reviewed_at is null then
      new.reviewed_at := now();
    end if;
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'rejected' and new.rejected_at is null then new.rejected_at := now(); end if;
    if new.status = 'withdrawn' and new.withdrawn_at is null then new.withdrawn_at := now(); end if;
  end if;
  return new;
end;
$$;

create or replace function public.normalize_ld_session_participant_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if new.attendance <> 'registered' and old.attendance <> new.attendance and new.attendance_marked_at is null then
    new.attendance_marked_at := now();
  end if;
  if new.completion = 'completed' and new.completed_at is null then
    new.completed_at := now();
  elsif new.completion <> 'completed' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ld_training_programs_lifecycle on public.ld_training_programs;
create trigger trg_ld_training_programs_lifecycle
before insert or update on public.ld_training_programs
for each row execute function public.touch_ld_training_program_lifecycle();

drop trigger if exists trg_ld_annual_plans_lifecycle on public.ld_annual_plans;
create trigger trg_ld_annual_plans_lifecycle
before insert or update on public.ld_annual_plans
for each row execute function public.touch_ld_annual_plan_lifecycle();

drop trigger if exists trg_ld_training_sessions_lifecycle on public.ld_training_sessions;
create trigger trg_ld_training_sessions_lifecycle
before insert or update on public.ld_training_sessions
for each row execute function public.touch_ld_training_session_lifecycle();

drop trigger if exists trg_ld_training_requests_lifecycle on public.ld_training_requests;
create trigger trg_ld_training_requests_lifecycle
before insert or update on public.ld_training_requests
for each row execute function public.touch_ld_training_request_lifecycle();

drop trigger if exists trg_ld_session_participants_lifecycle on public.ld_session_participants;
create trigger trg_ld_session_participants_lifecycle
before update on public.ld_session_participants
for each row execute function public.normalize_ld_session_participant_lifecycle();

commit;
