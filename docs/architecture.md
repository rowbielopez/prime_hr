# CSU PRIME-HR — Architecture

## Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js (App Router, Server Components) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + Google OAuth |
| File Storage | Supabase Storage |
| UI | shadcn/ui + Tailwind CSS |
| Validation | Zod |
| Language | TypeScript (strict mode) |

---

## Source Folder Structure

```
src/
  app/                          # Next.js App Router pages
    (protected)/                # Auth-gated layout (requirePermission applied at action level)
      admin/                    # User + org management
      compliance/               # Compliance monitoring
      dashboard/                # Main dashboard
      employees/                # Employee master records
      learning/                 # L&D
      pds/                      # Self-service PDS workspace (/pds)
      performance/              # Performance reviews
      recruitment/              # Recruitment pipeline
      rewards/                  # Rewards and recognition
    auth/                       # OAuth callback handler
    login/                      # Login page
    forbidden/                  # Forbidden access page
  components/
    ui/                         # shadcn/ui primitives (Button, Input, Dialog, etc.)
    foundation/                 # Shared layout: PageHeader, ContentSection, etc.
    features/<domain>/          # Domain-specific UI components
  features/<domain>/            # Domain logic
    <domain>.actions.ts         # "use server" mutations (Zod-validated, permission-checked)
    repository/                 # DB read functions (no mutations here)
      <domain>.repository.ts
      <domain>.types.ts         # (Optional) repository-local types
    schemas/                    # Zod schemas for input validation
    types.ts                    # Client-safe types (no server-only imports)
  lib/
    constants/
      roles.ts                  # AppRole enum: super_admin, central_hr_admin, etc.
    rbac/
      permissions.ts            # AppPermission type + role-to-permission map
      scopes.ts                 # Scope helpers
    supabase/
      server.ts                 # createSupabaseServerClient()
      browser.ts                # createSupabaseBrowserClient()
      admin.ts                  # createSupabaseAdminClient() (service-role — never in page routes or actions)
      middleware-client.ts      # createSupabaseMiddlewareClient() (middleware only)
    db/
      types.ts                  # Generated Supabase TypeScript types
    env.ts                      # Environment variable validation
    utils.ts                    # Shared utilities (cn, etc.)
  server/
    pds/                        # PDS-specific server utilities
supabase/
  migrations/                   # Numbered SQL migration files (0001–0047+)
  seed.sql                      # Reference/lookup data only
  config.toml                   # Local Supabase config
scripts/
  migration/legacy-hris/        # Node.js migration runner scripts
```

---

## Routing

All protected pages are under `src/app/(protected)/`. The layout at `src/app/(protected)/layout.tsx` provides the application shell (sidebar, header).

Routes:
- `/dashboard` — Home dashboard
- `/employees` — Employee list
- `/employees/[employeeId]` — Employee detail (profile, linked account, documents)
- `/employees/[employeeId]/pds` — HR admin PDS view
- `/employees/[employeeId]/pds/edit` — HR admin PDS edit
- `/pds` — Self-service PDS workspace
- `/recruitment` — Recruitment module
- `/compliance` — Compliance module
- `/learning` — L&D module
- `/performance` — Performance module
- `/rewards` — Rewards module
- `/admin` — Admin: users, organization

---

## Data Access Pattern

```
Page (Server Component)
  └── repository function (DB read, server-only)
        └── Supabase client (createSupabaseServerClient)
        
Form action (Server Action)
  └── requirePermission()        ← auth + RBAC check
  └── Zod schema validation
  └── DB mutation via Supabase
  └── writeAuditLog()            ← audit trail
  └── revalidatePath()
```

Repository functions are **read-only** — they only `select`. All mutations live in `*.actions.ts` files marked `"use server"`.

---

## Authentication and Authorization

- **Auth provider:** Supabase Auth + Google OAuth
- **Provisioning:** `src/features/auth/server/provision-and-authorize-user.ts` — runs on every sign-in, creates or updates `app_users` record, auto-links employee by email
- **RBAC:** `src/lib/rbac/permissions.ts` maps roles to permissions. `requirePermission()` at `src/features/auth/server/require-permission.ts` enforces access at the action level.
- **Employee linkage:** `app_users.employee_id` links a system account to an employee record. HR admin can manually link via the employee detail page.

---

## Component Conventions

- **Server Components** (default): async, fetch data, no hooks/state
- **Client Components** (`"use client"`): only when state, events, or transitions are needed
- All base UI from `src/components/ui/` (shadcn/ui)
- Layout primitives from `src/components/foundation/` (PageHeader, ContentSection, etc.)
- Domain UI in `src/components/features/<domain>/`

---

## State Management

No global state library. State is managed by:
- Server Components for initial data
- React `useState` and `useTransition` in Client Components
- `router.refresh()` after mutations to re-fetch Server Component data
- `revalidatePath()` in Server Actions to invalidate Next.js cache

---

## Pending Architecture Questions

- PDS PDF/XLSX export: rendering engine (React-PDF, Puppeteer, or server-side XLSX) not yet decided.
- Leave management module: not yet designed.
- Appointments/service record module: pending requirements.
