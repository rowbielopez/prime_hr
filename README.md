# CSU PRIME-HR

Next.js app with Supabase (Postgres, Auth, RLS). See `docs/` for architecture notes.

## Local development

1. **Dependencies:** Node 20+, Docker (for Supabase local stack).

2. **Supabase (local):**
   - Copy `supabase/.env.example` → `supabase/.env` and set **Google OAuth** client ID and secret (Web client; redirect URI must include `http://127.0.0.1:54321/auth/v1/callback` — confirm port with `supabase status` after start).
   - `npm run db:start` (or `npx supabase start`)
   - `npm run db:reset` applies migrations and seed when you need a clean DB.

3. **Next.js env:**
   - Copy `.env.example` → `.env.local`.
   - Fill keys from `npx supabase status` (API URL, `anon` key, `service_role` key) and set `ALLOWED_EMAIL_DOMAINS` for your test accounts.

4. **Run the app:** `npm run dev` → [http://localhost:3000](http://localhost:3000)

5. **Checks before pushing:** `npm run verify` (typecheck, lint, production build).
aaaaaa
## Scripts

| Script        | Purpose                          |
|---------------|----------------------------------|
| `npm run dev` | Next.js dev server               |
| `npm run db:start` / `db:stop` | Local Supabase stack   |
| `npm run db:reset` | Migrations + seed (local)  |
| `npm run verify`   | typecheck + lint + build   |

## Deploy

Hosted Supabase + Vercel: configure project env vars and Supabase Auth URL allow-list for your deployment origin (see prior deployment review). Local `config.toml` does not apply to hosted projects unless you push config via CLI.
