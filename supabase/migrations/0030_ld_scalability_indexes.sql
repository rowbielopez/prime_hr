begin;

create index if not exists idx_ld_training_requests_requester_updated_at
  on public.ld_training_requests(requester_employee_id, updated_at desc);

create index if not exists idx_ld_training_requests_submitter_updated_at
  on public.ld_training_requests(submitted_by_employee_id, updated_at desc)
  where submitted_by_employee_id is not null;

create index if not exists idx_ld_training_requests_campus_status_updated_at
  on public.ld_training_requests(campus_id, status, updated_at desc);

create index if not exists idx_ld_training_sessions_campus_status_starts_at_active
  on public.ld_training_sessions(campus_id, status, starts_at)
  where deleted_at is null;

create index if not exists idx_ld_training_sessions_program_starts_at_active
  on public.ld_training_sessions(program_id, starts_at desc)
  where deleted_at is null;

create index if not exists idx_ld_session_participants_employee_created_at
  on public.ld_session_participants(employee_id, created_at desc);

create index if not exists idx_ld_session_participants_completion_completed_at
  on public.ld_session_participants(completion, completed_at desc);

create index if not exists idx_ld_training_programs_scope_status_updated_at_active
  on public.ld_training_programs(campus_id, office_id, status, updated_at desc)
  where deleted_at is null;

create index if not exists idx_ld_annual_plans_campus_year_updated_at_active
  on public.ld_annual_plans(campus_id, year desc, updated_at desc)
  where deleted_at is null;

commit;
