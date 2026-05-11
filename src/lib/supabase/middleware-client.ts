import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseClientConfig } from "@/lib/supabase/config";

/** Supabase client for Next.js middleware (cookie read/write on request/response). */
export function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  const { url, anonKey } = getSupabaseClientConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
