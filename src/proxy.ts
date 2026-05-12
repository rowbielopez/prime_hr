import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware-client";

function isProtectedPath(pathname: string) {
    return (
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/compliance") ||
        pathname.startsWith("/employees") ||
        pathname.startsWith("/recruitment") ||
        pathname.startsWith("/learning") ||
        pathname.startsWith("/performance") ||
        pathname.startsWith("/rewards")
    );
}

export async function proxy(request: NextRequest) {
    if (request.nextUrl.pathname === "/auth/callback") {
        return NextResponse.next({ request });
    }

    const response = NextResponse.next({ request });
    const supabase = createSupabaseMiddlewareClient(request, response);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user && isProtectedPath(request.nextUrl.pathname)) {
        const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", nextPath);
        return NextResponse.redirect(loginUrl);
    }

    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
