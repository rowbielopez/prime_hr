begin;

-- 1) Attachment attribution and storage bucket metadata.
alter table public.compliance_evidence_attachments
  add column if not exists storage_bucket text not null default 'compliance-evidence',
  add column if not exists uploaded_by_user_id uuid null references public.app_users(id);

-- 2) Dedupe by evidence + bucket + object path (only when an object path is present).
create unique index if not exists uq_compliance_evidence_attachments_storage_object
  on public.compliance_evidence_attachments (evidence_id, storage_bucket, storage_path)
  where deleted_at is null and storage_path is not null;

-- 3) Private storage bucket for evidence files.
insert into storage.buckets (id, name, public)
values ('compliance-evidence', 'compliance-evidence', false)
on conflict (id) do update set public = excluded.public;

commit;
