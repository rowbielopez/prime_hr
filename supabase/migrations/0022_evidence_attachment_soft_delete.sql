begin;

alter table public.compliance_evidence_attachments
  add column if not exists deleted_by_user_id uuid null references public.app_users(id),
  add column if not exists storage_deleted_at timestamptz null;

create index if not exists idx_compliance_evidence_attachments_deleted_at
  on public.compliance_evidence_attachments (deleted_at);

create index if not exists idx_compliance_evidence_attachments_storage_deleted_at
  on public.compliance_evidence_attachments (storage_deleted_at);

commit;
