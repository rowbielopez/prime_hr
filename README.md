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

---

## AI-Assisted Development Instructions

This repository uses a structured AI instruction system. Before making any changes, read the appropriate file.

| File / Folder | Purpose |
|---|---|
| `AGENTS.md` | **Start here.** Primary AI instruction file — project overview, architecture rules, coding standards, database rules, security rules |
| `.github/copilot-instructions.md` | GitHub Copilot-specific instructions (auto-loaded by Copilot) |
| `CLAUDE.md` | Claude Code / Claude agent instructions (references `AGENTS.md`) |
| `docs/` | Architecture, database schema, PDS integration, UI standards, security, testing, roadmap |
| `.agents/` | Specialized role reference files (architect, database, UI/UX, PDS, security, QA) |
| `docs/copilot-prompt-library.md` | Ready-to-use prompts for common development workflows |

### Quick Rules

- **Always read `AGENTS.md` first** before writing any code.
- **Never assume database column names** — inspect `supabase/migrations/` first.
- **Never do destructive database changes** without explicit instruction and confirmation.
- **Run `npm run verify`** (typecheck + lint + build) before marking any task complete.
- **Do not change database or core logic** without reviewing the relevant `docs/` file first.

