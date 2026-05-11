begin;

do $$ begin
  create type public.notification_status as enum ('unread', 'read', 'archived', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_channel as enum ('in_app', 'email', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_asset_status as enum ('active', 'deleted', 'quarantined');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.app_users(id) on delete cascade,
  recipient_employee_id uuid null references public.employees(id) on delete set null,
  campus_id uuid null references public.campuses(id),
  office_id uuid null references public.offices(id),
  channel public.notification_channel not null default 'in_app',
  status public.notification_status not null default 'unread',
  event_type text not null,
  title text not null,
  message text not null,
  action_url text null,
  dedupe_key text null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  sent_at timestamptz null,
  created_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_notifications_dedupe_key
  on public.notifications(recipient_user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists idx_notifications_recipient_status_created
  on public.notifications(recipient_user_id, status, created_at desc);

create index if not exists idx_notifications_campus_office_created
  on public.notifications(campus_id, office_id, created_at desc);

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  channel public.notification_channel not null default 'in_app',
  title_template text not null,
  body_template text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_notification_templates_updated_at on public.notification_templates;
create trigger trg_notification_templates_updated_at
before update on public.notification_templates
for each row execute function public.set_updated_at();

create table if not exists public.document_assets (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id),
  office_id uuid null references public.offices(id),
  entity_type text not null,
  entity_id text not null,
  category text not null,
  title text null,
  description text null,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text null,
  file_size_bytes bigint null check (file_size_bytes is null or file_size_bytes >= 0),
  checksum_sha256 text null,
  status public.document_asset_status not null default 'active',
  version_no integer not null default 1 check (version_no >= 1),
  parent_asset_id uuid null references public.document_assets(id),
  uploaded_by_user_id uuid null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  deleted_by_user_id uuid null references public.app_users(id),
  unique (storage_bucket, storage_path)
);

create index if not exists idx_document_assets_entity on public.document_assets(entity_type, entity_id, created_at desc);
create index if not exists idx_document_assets_scope on public.document_assets(campus_id, office_id, status);
create index if not exists idx_document_assets_parent on public.document_assets(parent_asset_id);

drop trigger if exists trg_document_assets_updated_at on public.document_assets;
create trigger trg_document_assets_updated_at
before update on public.document_assets
for each row execute function public.set_updated_at();

create table if not exists public.document_asset_access_logs (
  id bigserial primary key,
  document_asset_id uuid not null references public.document_assets(id) on delete cascade,
  actor_user_id uuid null references public.app_users(id),
  access_type text not null,
  access_context text null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_document_asset_access_logs_asset_occurred
  on public.document_asset_access_logs(document_asset_id, occurred_at desc);

insert into storage.buckets (id, name, public)
values ('primehr-secure-docs', 'primehr-secure-docs', false)
on conflict (id) do update set public = excluded.public;

alter table public.notifications enable row level security;
alter table public.notification_templates enable row level security;
alter table public.document_assets enable row level security;
alter table public.document_asset_access_logs enable row level security;

drop policy if exists notifications_scoped_select on public.notifications;
create policy notifications_scoped_select on public.notifications
for select to authenticated
using (
  recipient_user_id = public.current_app_user_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or (campus_id is not null and public.authz_scoped_campus_office_access(campus_id, office_id))
);

drop policy if exists notifications_scoped_write on public.notifications;
create policy notifications_scoped_write on public.notifications
for all to authenticated
using (
  recipient_user_id = public.current_app_user_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or (campus_id is not null and public.authz_campus_hr_office_write(campus_id, office_id))
)
with check (
  recipient_user_id = public.current_app_user_id()
  or public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or (campus_id is not null and public.authz_campus_hr_office_write(campus_id, office_id))
);

drop policy if exists notification_templates_scoped_select on public.notification_templates;
create policy notification_templates_scoped_select on public.notification_templates
for select to authenticated
using (true);

drop policy if exists notification_templates_admin_write on public.notification_templates;
create policy notification_templates_admin_write on public.notification_templates
for all to authenticated
using (public.has_active_role('super_admin') or public.has_active_role('central_hr_admin'))
with check (public.has_active_role('super_admin') or public.has_active_role('central_hr_admin'));

drop policy if exists document_assets_scoped_select on public.document_assets;
create policy document_assets_scoped_select on public.document_assets
for select to authenticated
using (public.authz_scoped_campus_office_access(campus_id, office_id));

drop policy if exists document_assets_scoped_write on public.document_assets;
create policy document_assets_scoped_write on public.document_assets
for all to authenticated
using (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
)
with check (
  public.has_active_role('super_admin')
  or public.has_active_role('central_hr_admin')
  or public.authz_campus_hr_office_write(campus_id, office_id)
);

drop policy if exists document_asset_access_logs_scoped_select on public.document_asset_access_logs;
create policy document_asset_access_logs_scoped_select on public.document_asset_access_logs
for select to authenticated
using (
  exists (
    select 1
    from public.document_assets d
    where d.id = document_asset_id
      and public.authz_scoped_campus_office_access(d.campus_id, d.office_id)
  )
);

drop policy if exists document_asset_access_logs_scoped_insert on public.document_asset_access_logs;
create policy document_asset_access_logs_scoped_insert on public.document_asset_access_logs
for insert to authenticated
with check (
  exists (
    select 1
    from public.document_assets d
    where d.id = document_asset_id
      and public.authz_scoped_campus_office_access(d.campus_id, d.office_id)
  )
);

commit;

