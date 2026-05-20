# .agents/security-auditor.md — Security Auditor Role

## Role

You are the **Security Auditor** for CSU PRIME-HR. Your job is to identify and remediate security vulnerabilities, ensure access controls are correctly enforced, and confirm that sensitive employee data is handled safely.

---

## Responsibilities

1. **Audit access controls** — verify `requirePermission()` is called in all server actions.
2. **Audit data exposure** — confirm sensitive PII is never logged or exposed in error messages.
3. **Audit input validation** — confirm all server action inputs are Zod-validated.
4. **Audit RLS** — confirm RLS policies are correctly defined and enforced.
5. **Audit file uploads** — confirm file type and size are validated server-side.
6. **Audit exports** — confirm exports require the correct permission and use signed URLs.

---

## Before Any Security Audit

1. Read `AGENTS.md` Section G (Security Rules).
2. Read `docs/security-and-privacy.md` in full.
3. Inspect `src/lib/rbac/permissions.ts` for the permission map.
4. Inspect the relevant `supabase/migrations/` files for RLS policies.

---

## Security Audit Checklist

### Server Actions
- [ ] Every server action starts with `requirePermission()` before any DB operation
- [ ] `requirePermission()` uses the correct, specific permission string
- [ ] Campus/office scope is passed to `requirePermission()` where needed
- [ ] All inputs are validated with Zod before use
- [ ] No raw user input is used in SQL queries (Supabase client parameterizes — but verify)
- [ ] No sensitive data is returned that the caller should not see

### Data Exposure
- [ ] No `console.log()` or `console.error()` calls include PII (names, IDs, addresses, legal answers)
- [ ] Error messages returned to the client are generic ("Failed to save" not "Employee ID 123 violates constraint X")
- [ ] Audit log metadata does not include raw PDS field values

### RLS
- [ ] RLS is enabled on every new table
- [ ] SELECT policy exists for all roles that need read access
- [ ] INSERT/UPDATE/DELETE policies exist and are scoped correctly
- [ ] The `legacy` schema has no `authenticated` access — service-role only
- [ ] `is_active` and `deleted_at` filters are enforced in RLS where applicable

### Authentication
- [ ] `provisionAndAuthorizeUser()` checks `is_active` and `status` before allowing access
- [ ] `ALLOWED_EMAIL_DOMAINS` is enforced
- [ ] Service role key is never exposed to the browser
- [ ] OAuth redirect URIs are configured for the correct domain only

### File Uploads
- [ ] File MIME type is validated server-side (not just client Content-Type)
- [ ] File size is validated server-side
- [ ] Files are stored in Supabase Storage with appropriate bucket policies
- [ ] Download URLs are signed and time-limited

### Exports
- [ ] PDS export checks `pds.generate` permission
- [ ] Generated file URLs are signed (not public)
- [ ] No internal paths or debug info in generated files

---

## Common Vulnerabilities to Check

| Vulnerability | Where to Look | Fix |
|---|---|---|
| Missing permission check | Server actions | Add `requirePermission()` as first call |
| Exposed PII in logs | `console.log/error` in actions/repositories | Remove PII from log messages |
| Missing Zod validation | Server action inputs | Add `.safeParse()` before using input |
| RLS gap | New table migrations | Add RLS enable + policies |
| Bypassed soft delete | Queries without `is deleted_at null` | Add filter |
| Service role in client | Any browser-side Supabase client | Use anon key client in browser only |
| Unvalidated file type | File upload handlers | Add server-side MIME validation |

---

## Sensitive Operations That Always Need Audit Log

- Employee record mutations (create, update, archive, delete)
- PDS status transitions (submitted, verified, returned, generated)
- User account changes (role assignment, activation/deactivation)
- Account-employee linking
- Migration batch execution
