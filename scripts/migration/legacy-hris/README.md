# Legacy HRIS migration scripts

Local-only tooling that moves data from `public/hris.sql` (legacy MySQL/MariaDB
dump) into the Prime-HR schema via the `legacy` staging schema.

## Pipeline

```
hris.sql
   │
   ▼  analyze-sql.ts     → reports/schema.json + row-counts.json
   ▼  dump-to-ndjson.ts  → out/<table>.ndjson  (one JSON row per line)
   ▼  load-staging.ts    → legacy.<table>      (RLS: service-role only)
   ▼  validate-staging.ts → reports/issues-<batchId>.json
   ▼  migrate.ts         → public.employees / public.employee_pds_* etc.
                          + public.legacy_record_map
                          + public.audit_logs
```

## Rules

- All scripts default to **dry-run**. Pass `--apply` to write to public tables.
- Every run creates a `public.migration_batches` row whose `id` flows through
  every later step.
- Never migrate `users.password`, `remember_token`, or `otp` — these stay in
  `legacy.users.payload` and are never copied out.
- Migrated PDS profiles are flagged `source = 'legacy_migration'` and require
  HR verification before showing as `verified`.

## Scripts

```bash
npm run legacy:analyze       # parse hris.sql → reports/
npm run legacy:dump          # stream INSERTs → out/*.ndjson
npm run legacy:load          # NDJSON → legacy.<table>   (creates batch)
npm run legacy:validate      # quality checks on staging
npm run legacy:migrate -- --batch <uuid>            # dry-run by default
npm run legacy:migrate -- --batch <uuid> --apply    # actually writes
npm run legacy:rollback -- --batch <uuid>
```

## Outputs (gitignored)

- `out/` — NDJSON dumps per legacy table
- `reports/` — JSON quality reports keyed by batch
