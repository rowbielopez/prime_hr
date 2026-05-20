/**
 * Standalone Supabase admin client for migration scripts.
 *
 * Avoids importing `src/lib/supabase/admin.ts` because that path pulls in
 * Next.js runtime env validation. CLI scripts read env from `.env.local` via
 * dotenv-style preloading or process env directly.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(filename: string) {
    const filepath = resolve(process.cwd(), filename);
    if (!existsSync(filepath)) return;
    const content = readFileSync(filepath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
    if (cached) return cached;

    // Load env files in order; later files do not override earlier ones.
    loadEnvFile(".env.local");
    loadEnvFile(".env");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local before running migration scripts.",
        );
    }

    cached = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
        db: { schema: "public" },
    });

    return cached;
}
