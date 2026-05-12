"use client";

import { useEffect, useMemo, useState } from "react";
import { LogOut, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(email: string): string {
    const local = email.split("@")[0] ?? "";
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) {
        return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
}

export function UserMenu() {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);
    const [email, setEmail] = useState<string | null>(null);
    const [signingOut, setSigningOut] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setEmail(data.user?.email ?? null);
        });
    }, [supabase]);

    async function handleSignOut() {
        setSigningOut(true);
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    const initials = email ? getInitials(email) : "?";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label="User menu"
                className="relative flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-transparent transition-all duration-150 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-primary/50"
            >
                {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="min-w-52">
                <DropdownMenuGroup>
                <DropdownMenuLabel>
                    <div className="flex items-center gap-2.5 py-0.5">
                        <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{email ?? "Loading…"}</p>
                            <p className="text-[10px] text-muted-foreground">CSU PRIME-HR</p>
                        </div>
                    </div>
                </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                    <User />
                    Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    variant="destructive"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    className="cursor-pointer"
                >
                    <LogOut />
                    {signingOut ? "Signing out…" : "Sign Out"}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
