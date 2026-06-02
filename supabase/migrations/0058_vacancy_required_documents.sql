begin;

-- Add required_documents column to recruitment_vacancies.
-- Stores an ordered list of document requirement keys that applicants
-- must submit when applying for the vacancy.

alter table public.recruitment_vacancies
  add column if not exists required_documents text[] not null default '{}';

comment on column public.recruitment_vacancies.required_documents is
  'List of document requirement keys (e.g. pds, tor_diploma, nbi_clearance) '
  'that applicants are required to submit for this vacancy. '
  'Empty array means no specific requirements are listed.';

commit;
