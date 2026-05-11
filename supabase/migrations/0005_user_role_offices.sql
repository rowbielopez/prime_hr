begin;

create table if not exists public.user_role_offices (
  id uuid primary key default gen_random_uuid(),
  user_role_id uuid not null references public.user_roles(id) on delete cascade,
  office_id uuid not null references public.offices(id),
  created_at timestamptz not null default now(),
  unique (user_role_id, office_id)
);

create index if not exists idx_user_role_offices_user_role_id
on public.user_role_offices(user_role_id);

create index if not exists idx_user_role_offices_office_id
on public.user_role_offices(office_id);

alter table public.user_role_offices enable row level security;

drop policy if exists user_role_offices_self_or_admin_select on public.user_role_offices;
create policy user_role_offices_self_or_admin_select
on public.user_role_offices
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.id = user_role_id
      and ur.user_id = public.current_app_user_id()
  )
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
);

commit;

