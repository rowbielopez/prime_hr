-- 0055_employee_request_trigger_patch.sql
-- Patches the employee request self-update guard trigger to also protect
-- the internal_notes and completed_at columns added in migration 0054.
-- Without this patch, employees could write those HR-only fields via the
-- Supabase REST API while making a valid status transition.

begin;

create or replace function public.guard_employee_request_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.authz_campus_hr_office_write(new.campus_id, new.office_id) then
    return new;
  end if;

  if not public.employee_request_is_self(old.employee_id) then
    raise exception 'employee request update not allowed';
  end if;

  if new.employee_id is distinct from old.employee_id
    or new.campus_id is distinct from old.campus_id
    or new.office_id is distinct from old.office_id
    or new.related_record_id is distinct from old.related_record_id
    or new.hr_remarks is distinct from old.hr_remarks
    or new.internal_notes is distinct from old.internal_notes
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by_user_id is distinct from old.reviewed_by_user_id
    or new.completed_at is distinct from old.completed_at
    or new.deleted_at is distinct from old.deleted_at then
    raise exception 'employee request protected fields cannot be changed';
  end if;

  if old.status in ('draft', 'returned_for_revision') and new.status in ('draft', 'submitted') then
    return new;
  end if;

  if old.status in ('draft', 'submitted') and new.status = 'cancelled' then
    if new.request_type is distinct from old.request_type
      or new.subject is distinct from old.subject
      or new.description is distinct from old.description
      or new.field_to_correct is distinct from old.field_to_correct
      or new.current_value is distinct from old.current_value
      or new.requested_value is distinct from old.requested_value
      or new.related_module is distinct from old.related_module
      or new.submitted_at is distinct from old.submitted_at then
      raise exception 'employee request content cannot be changed while cancelling';
    end if;

    if new.cancelled_at is null then
      raise exception 'cancelled_at is required when cancelling a request';
    end if;

    return new;
  end if;

  raise exception 'employee request status transition not allowed';
end;
$$;

commit;
