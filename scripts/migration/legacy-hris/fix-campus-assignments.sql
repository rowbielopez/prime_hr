-- =============================================================================
-- fix-campus-assignments.sql
--
-- One-off data fix: update campus_id for all employees migrated by batch
--   9636d267-ebed-457a-b399-3617b3f10da6
-- that were incorrectly assigned to Carig (the --campus default) instead of
-- their actual legacy campus.
--
-- Run this in the Supabase SQL Editor (with service-role privileges).
-- Safe to re-run — it only touches rows from that specific batch.
-- =============================================================================

BEGIN;

-- Verification query (run first to see how many rows will be changed):
-- SELECT count(*), cm.campus_uuid
-- FROM public.legacy_record_map lrm
-- JOIN public.legacy_staging_employee_profile lsep
--     ON lsep._legacy_id = lrm.legacy_id AND lsep._batch_id = lrm.batch_id
-- JOIN (VALUES
--     ('1'::text,'92684136-372b-4f56-8dac-9936661893ad'::uuid),
--     ('2','4ba1e195-923d-47b0-8a44-acdbaf5db645'),
--     ('3','71df8f81-c498-4918-83ea-ab95524d1dbc'),
--     ('4','b122e0ca-2e44-4d0e-836a-6e780884fd20'),
--     ('5','e2b19aa1-d508-4cf6-9313-d129cd863bb5'),
--     ('6','d640fecb-060d-4f93-ad14-254de7e59fa1'),
--     ('7','ec328e21-8008-48b8-ade6-09c4d72d90e3'),
--     ('8','6fd08a66-5759-481e-a875-79db7173d9bd'),
--     ('9','7d066d56-d95c-409f-a149-27f83d961f8e'),
--     ('10','dc775bbe-9e63-4062-8db2-614707e47cea')
-- ) AS cm(legacy_id, campus_uuid) ON cm.legacy_id = lsep.payload->>'campus'
-- WHERE lrm.batch_id = '9636d267-ebed-457a-b399-3617b3f10da6'
--   AND lrm.target_table = 'employees'
-- GROUP BY cm.campus_uuid;

-- ── Step 1: Fix public.employees ──────────────────────────────────────────
WITH campus_map(legacy_id, campus_uuid) AS (
    VALUES
    ('1'::text,  '92684136-372b-4f56-8dac-9936661893ad'::uuid),  -- Andrews
    ('2',        '4ba1e195-923d-47b0-8a44-acdbaf5db645'),         -- Aparri
    ('3',        '71df8f81-c498-4918-83ea-ab95524d1dbc'),         -- Carig
    ('4',        'b122e0ca-2e44-4d0e-836a-6e780884fd20'),         -- Gonzaga
    ('5',        'e2b19aa1-d508-4cf6-9313-d129cd863bb5'),         -- Lal-lo  (legacy: "Lallo")
    ('6',        'd640fecb-060d-4f93-ad14-254de7e59fa1'),         -- Lasam
    ('7',        'ec328e21-8008-48b8-ade6-09c4d72d90e3'),         -- Piat
    ('8',        '6fd08a66-5759-481e-a875-79db7173d9bd'),         -- Sanchez Mira
    ('9',        '7d066d56-d95c-409f-a149-27f83d961f8e'),         -- Solana
    ('10',       'dc775bbe-9e63-4062-8db2-614707e47cea')          -- Central
)
UPDATE public.employees e
SET campus_id = cm.campus_uuid
FROM public.legacy_record_map lrm
JOIN public.legacy_staging_employee_profile lsep
    ON lsep._legacy_id = lrm.legacy_id
    AND lsep._batch_id = lrm.batch_id
JOIN campus_map cm ON cm.legacy_id = lsep.payload->>'campus'
WHERE lrm.batch_id = '9636d267-ebed-457a-b399-3617b3f10da6'
  AND lrm.target_table = 'employees'
  AND lrm.target_id = e.id;

-- ── Step 2: Fix public.employee_pds_profiles ──────────────────────────────
WITH campus_map(legacy_id, campus_uuid) AS (
    VALUES
    ('1'::text,  '92684136-372b-4f56-8dac-9936661893ad'::uuid),
    ('2',        '4ba1e195-923d-47b0-8a44-acdbaf5db645'),
    ('3',        '71df8f81-c498-4918-83ea-ab95524d1dbc'),
    ('4',        'b122e0ca-2e44-4d0e-836a-6e780884fd20'),
    ('5',        'e2b19aa1-d508-4cf6-9313-d129cd863bb5'),
    ('6',        'd640fecb-060d-4f93-ad14-254de7e59fa1'),
    ('7',        'ec328e21-8008-48b8-ade6-09c4d72d90e3'),
    ('8',        '6fd08a66-5759-481e-a875-79db7173d9bd'),
    ('9',        '7d066d56-d95c-409f-a149-27f83d961f8e'),
    ('10',       'dc775bbe-9e63-4062-8db2-614707e47cea')
)
UPDATE public.employee_pds_profiles p
SET campus_id = cm.campus_uuid
FROM public.legacy_record_map lrm
JOIN public.legacy_staging_employee_profile lsep
    ON lsep._legacy_id = lrm.legacy_id
    AND lsep._batch_id = lrm.batch_id
JOIN campus_map cm ON cm.legacy_id = lsep.payload->>'campus'
WHERE lrm.batch_id = '9636d267-ebed-457a-b399-3617b3f10da6'
  AND lrm.target_table = 'employee_pds_profiles'
  AND lrm.target_id = p.id;

-- ── Step 3: Fix public.employee_personal_information ──────────────────────
-- (no direct legacy_record_map entry — join via employees)
UPDATE public.employee_personal_information pi
SET campus_id = e.campus_id
FROM public.employees e
WHERE pi.employee_id = e.id
  AND EXISTS (
      SELECT 1
      FROM public.legacy_record_map lrm
      WHERE lrm.batch_id  = '9636d267-ebed-457a-b399-3617b3f10da6'
        AND lrm.target_table = 'employees'
        AND lrm.target_id = e.id
  );

-- Verification: expected output is 10 rows, one per campus, totalling ~1886 employees
SELECT c.name AS campus, count(e.id) AS employee_count
FROM public.employees e
JOIN public.campuses c ON c.id = e.campus_id
WHERE e.id IN (
    SELECT target_id
    FROM public.legacy_record_map
    WHERE batch_id = '9636d267-ebed-457a-b399-3617b3f10da6'
      AND target_table = 'employees'
)
GROUP BY c.name
ORDER BY c.name;

COMMIT;
