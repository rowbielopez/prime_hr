begin;

-- Campus and office mutations were blocked: RLS had SELECT-only policies.
-- Align with application layer: only super_admin may change reference org structure.
-- (central_hr_admin retains user/role management per existing policies; read access unchanged.)

drop policy if exists campuses_super_admin_insert on public.campuses;
create policy campuses_super_admin_insert
on public.campuses
for insert
to authenticated
with check (public.has_active_role('super_admin'));

drop policy if exists campuses_super_admin_update on public.campuses;
create policy campuses_super_admin_update
on public.campuses
for update
to authenticated
using (public.has_active_role('super_admin'))
with check (public.has_active_role('super_admin'));

drop policy if exists offices_super_admin_insert on public.offices;
create policy offices_super_admin_insert
on public.offices
for insert
to authenticated
with check (public.has_active_role('super_admin'));

drop policy if exists offices_super_admin_update on public.offices;
create policy offices_super_admin_update
on public.offices
for update
to authenticated
using (public.has_active_role('super_admin'))
with check (public.has_active_role('super_admin'));

commit;
