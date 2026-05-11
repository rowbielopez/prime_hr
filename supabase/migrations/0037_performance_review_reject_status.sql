begin;

-- Reviewer "reject" outcome + terminal record state (review stopped without approval)
do $enum$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'perf_record_status' and e.enumlabel = 'rejected'
  ) then
    alter type public.perf_record_status add value 'rejected';
  end if;
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'perf_review_decision' and e.enumlabel = 'reject'
  ) then
    alter type public.perf_review_decision add value 'reject';
  end if;
end
$enum$;

create or replace function public.validate_performance_record_transition()
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
  if old.status = 'draft' and new.status in ('submitted', 'withdrawn') then return new; end if;
  if old.status = 'submitted' and new.status in ('under_review', 'needs_revision', 'withdrawn', 'rejected') then return new; end if;
  if old.status = 'under_review' and new.status in ('approved', 'needs_revision', 'rejected') then return new; end if;
  if old.status = 'needs_revision' and new.status in ('submitted', 'withdrawn') then return new; end if;
  if old.status = 'approved' and new.status = 'finalized' then return new; end if;
  raise exception 'Invalid performance record status transition: % -> %', old.status, new.status;
end;
$$;

commit;
