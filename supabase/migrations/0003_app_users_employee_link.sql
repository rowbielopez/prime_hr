begin;

alter table public.app_users
add column if not exists employee_id uuid null references public.employees(id);

create unique index if not exists uq_app_users_employee_id
on public.app_users(employee_id)
where employee_id is not null;

create index if not exists idx_app_users_employee_id
on public.app_users(employee_id);

commit;

