begin;

create table if not exists public.ld_training_program_status_history (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ld_training_programs(id) on delete cascade,
  from_status public.ld_program_status null,
  to_status public.ld_program_status not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.ld_annual_plan_status_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ld_annual_plans(id) on delete cascade,
  from_status public.ld_plan_status null,
  to_status public.ld_plan_status not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.ld_training_session_status_history (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ld_training_sessions(id) on delete cascade,
  from_status public.ld_session_status null,
  to_status public.ld_session_status not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.ld_training_request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ld_training_requests(id) on delete cascade,
  from_status public.ld_request_status null,
  to_status public.ld_request_status not null,
  changed_at timestamptz not null default now()
);

create or replace function public.validate_ld_training_program_status_transition()
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
  if old.status = 'draft' and new.status in ('active', 'archived') then
    return new;
  end if;
  if old.status = 'active' and new.status = 'archived' then
    return new;
  end if;
  if old.status = 'archived' and new.status = 'active' then
    return new;
  end if;
  raise exception 'Invalid training program status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.validate_ld_annual_plan_status_transition()
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
  if old.status = 'draft' and new.status in ('approved', 'closed') then
    return new;
  end if;
  if old.status = 'approved' and new.status in ('active', 'closed') then
    return new;
  end if;
  if old.status = 'active' and new.status = 'closed' then
    return new;
  end if;
  raise exception 'Invalid annual plan status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.validate_ld_training_session_status_transition()
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
  if old.status = 'scheduled' and new.status in ('in_progress', 'cancelled') then
    return new;
  end if;
  if old.status = 'in_progress' and new.status in ('completed', 'cancelled') then
    return new;
  end if;
  raise exception 'Invalid training session status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.validate_ld_training_request_status_transition()
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
  if old.status = 'draft' and new.status in ('submitted', 'withdrawn') then
    return new;
  end if;
  if old.status = 'submitted' and new.status in ('under_review', 'approved', 'rejected', 'withdrawn') then
    return new;
  end if;
  if old.status = 'under_review' and new.status in ('approved', 'rejected', 'withdrawn') then
    return new;
  end if;
  raise exception 'Invalid training request status transition: % -> %', old.status, new.status;
end;
$$;

create or replace function public.log_ld_training_program_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ld_training_program_status_history (program_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif old.status <> new.status then
    insert into public.ld_training_program_status_history (program_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create or replace function public.log_ld_annual_plan_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ld_annual_plan_status_history (plan_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif old.status <> new.status then
    insert into public.ld_annual_plan_status_history (plan_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create or replace function public.log_ld_training_session_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ld_training_session_status_history (session_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif old.status <> new.status then
    insert into public.ld_training_session_status_history (session_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

create or replace function public.log_ld_training_request_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ld_training_request_status_history (request_id, from_status, to_status)
    values (new.id, null, new.status);
  elsif old.status <> new.status then
    insert into public.ld_training_request_status_history (request_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ld_training_programs_status_transition on public.ld_training_programs;
create trigger trg_ld_training_programs_status_transition
before update on public.ld_training_programs
for each row execute function public.validate_ld_training_program_status_transition();

drop trigger if exists trg_ld_annual_plans_status_transition on public.ld_annual_plans;
create trigger trg_ld_annual_plans_status_transition
before update on public.ld_annual_plans
for each row execute function public.validate_ld_annual_plan_status_transition();

drop trigger if exists trg_ld_training_sessions_status_transition on public.ld_training_sessions;
create trigger trg_ld_training_sessions_status_transition
before update on public.ld_training_sessions
for each row execute function public.validate_ld_training_session_status_transition();

drop trigger if exists trg_ld_training_requests_status_transition on public.ld_training_requests;
create trigger trg_ld_training_requests_status_transition
before update on public.ld_training_requests
for each row execute function public.validate_ld_training_request_status_transition();

drop trigger if exists trg_ld_training_programs_status_log on public.ld_training_programs;
create trigger trg_ld_training_programs_status_log
after insert or update on public.ld_training_programs
for each row execute function public.log_ld_training_program_status_change();

drop trigger if exists trg_ld_annual_plans_status_log on public.ld_annual_plans;
create trigger trg_ld_annual_plans_status_log
after insert or update on public.ld_annual_plans
for each row execute function public.log_ld_annual_plan_status_change();

drop trigger if exists trg_ld_training_sessions_status_log on public.ld_training_sessions;
create trigger trg_ld_training_sessions_status_log
after insert or update on public.ld_training_sessions
for each row execute function public.log_ld_training_session_status_change();

drop trigger if exists trg_ld_training_requests_status_log on public.ld_training_requests;
create trigger trg_ld_training_requests_status_log
after insert or update on public.ld_training_requests
for each row execute function public.log_ld_training_request_status_change();

commit;
