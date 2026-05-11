-- 1) Activate app user by email
update public.app_users
set
  status = 'active',
  is_active = true
where email = 'rowbielopez@csu.edu.ph';

-- 2) Assign a role (pick one)
-- super_admin / central_hr_admin / campus_hr_officer / office_unit_head / committee_member / employee
insert into public.user_roles (user_id, role_id, campus_id, is_active, effective_from, effective_to)
select
  au.id,
  r.id,
  null,         -- set campus uuid here if using scoped role like campus_hr_officer
  true,
  current_date,
  null
from public.app_users au
join public.roles r on r.code = 'central_hr_admin'
where au.email = 'rowbielopez@csu.edu.ph'
on conflict (user_id, role_id, campus_id)
do update set
  is_active = true,
  effective_from = current_date,
  effective_to = null;