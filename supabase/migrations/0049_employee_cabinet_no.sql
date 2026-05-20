begin;

-- Physical filing cabinet reference for the employee's 201 file
alter table public.employees
  add column if not exists cabinet_no text null;

commit;
