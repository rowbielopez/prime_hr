begin;

-- Recreate the public_vacancies view to include required_documents.
-- The view was first defined in 0056 before the required_documents column
-- was added in 0058.  Applying this migration after 0058 makes the column
-- visible to the public /careers detail page without changing any security
-- boundary — internal-only fields (id, campus_id, remarks, etc.) remain
-- intentionally omitted.

drop view if exists public.public_vacancies;
create view public.public_vacancies
with (security_invoker = false)
as
select
  v.public_slug,
  v.title,
  v.description,
  v.qualification_notes,
  v.plantilla_item_no,
  v.employment_type,
  v.item_count,
  v.posted_at,
  v.closing_at,
  v.updated_at,
  v.required_documents,
  c.name  as campus_name,
  o.name  as office_name
from public.recruitment_vacancies v
join  public.campuses c on c.id = v.campus_id
left join public.offices o on o.id = v.office_id
where v.status     = 'open'
  and v.deleted_at is null
  and (v.closing_at is null or v.closing_at >= current_date)
  and v.public_slug is not null;

comment on view public.public_vacancies is
  'Anon-readable projection of currently-open vacancies for the public /careers page. '
  'Runs as view owner to bypass base-table RLS; no internal-only columns are exposed.';

grant select on public.public_vacancies to anon, authenticated;

commit;
