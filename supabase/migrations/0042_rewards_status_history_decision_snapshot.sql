begin;

alter table public.rewards_nomination_status_history
  add column if not exists review_count integer null,
  add column if not exists recommend_count integer null,
  add column if not exists request_revision_count integer null,
  add column if not exists reject_count integer null,
  add column if not exists average_score numeric(6,2) null;

create or replace function public.touch_rewards_nomination_lifecycle()
returns trigger
language plpgsql
as $$
declare
  v_review_count integer;
  v_recommend_count integer;
  v_request_revision_count integer;
  v_reject_count integer;
  v_average_score numeric(6,2);
begin
  if tg_op = 'INSERT' then
    return new;
  end if;
  if old.status <> new.status then
    if new.status = 'submitted' and new.submitted_at is null then new.submitted_at := now(); end if;
    if new.status in ('recommended', 'rejected', 'needs_revision') and new.reviewed_at is null then new.reviewed_at := now(); end if;
    if new.status = 'approved' and new.approved_at is null then new.approved_at := now(); end if;
    if new.status = 'awarded' and new.awarded_at is null then new.awarded_at := now(); end if;

    if new.status in ('recommended', 'needs_revision', 'rejected', 'approved', 'awarded') then
      select
        count(*)::integer,
        count(*) filter (where decision = 'recommend')::integer,
        count(*) filter (where decision = 'request_revision')::integer,
        count(*) filter (where decision = 'reject')::integer,
        avg(score)::numeric(6,2)
      into v_review_count, v_recommend_count, v_request_revision_count, v_reject_count, v_average_score
      from public.rewards_nomination_reviews
      where nomination_id = new.id;
    else
      v_review_count := null;
      v_recommend_count := null;
      v_request_revision_count := null;
      v_reject_count := null;
      v_average_score := null;
    end if;

    insert into public.rewards_nomination_status_history(
      nomination_id,
      from_status,
      to_status,
      changed_by_user_id,
      review_count,
      recommend_count,
      request_revision_count,
      reject_count,
      average_score
    )
    values (
      new.id,
      old.status,
      new.status,
      public.current_app_user_id(),
      v_review_count,
      v_recommend_count,
      v_request_revision_count,
      v_reject_count,
      v_average_score
    );
  end if;
  return new;
end;
$$;

commit;

