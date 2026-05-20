"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function subscribe() {
    return () => undefined;
}
function useIsClient() {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}

export type SearchableSelectOption = {
    value: string;
    label: string;
};

type SearchableSelectProps = {
    value: string | null;
    onValueChange: (value: string | null) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
};

export function SearchableSelect({
    value,
    onValueChange,
    options,
    placeholder = "Select option",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const isClient = useIsClient();

    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    const filtered = search.trim()
        ? options.filter(
            (o) =>
                o.label.toLowerCase().includes(search.toLowerCase()) ||
                o.value.toLowerCase().includes(search.toLowerCase()),
        )
        : options;

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const maxDropdownHeight = 300;
        const spaceBelow = viewportHeight - rect.bottom - 8;
        const spaceAbove = rect.top - 8;

        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
            // Open upward
            const height = Math.min(maxDropdownHeight, spaceAbove);
            setDropdownStyle({
                position: "fixed",
                bottom: viewportHeight - rect.top + 4,
                left: rect.left,
                width: rect.width,
                maxHeight: height,
                zIndex: 9999,
            });
        } else {
            // Open downward
            setDropdownStyle({
                position: "fixed",
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                maxHeight: Math.min(maxDropdownHeight, spaceBelow),
                zIndex: 9999,
            });
        }
    }, []);

    function openDropdown() {
        if (disabled) return;
        updatePosition();
        setSearch("");
        setOpen(true);
    }

    function closeDropdown() {
        setOpen(false);
        setSearch("");
    }

    function selectOption(optionValue: string) {
        onValueChange(optionValue);
        closeDropdown();
    }

    // Focus search input when dropdown opens
    useEffect(() => {
        if (open) {
            const frame = requestAnimationFrame(() => searchRef.current?.focus());
            return () => cancelAnimationFrame(frame);
        }
    }, [open]);

    // Close on click-outside or Escape
    useEffect(() => {
        if (!open) return;

        function handleMouseDown(e: MouseEvent) {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                dropdownRef.current?.contains(e.target as Node)
            )
                return;
            closeDropdown();
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                closeDropdown();
                triggerRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    // Reposition on scroll or resize while open
    useEffect(() => {
        if (!open) return;
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [open, updatePosition]);

    const dropdown =
        isClient && open
            ? createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="flex flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
                >
                    {/* Search row */}
                    <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
                        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    {/* Options list */}
                    <div className="overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                {emptyMessage}
                            </div>
                        ) : (
                            filtered.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => selectOption(option.value)}
                                    className={cn(
                                        "relative flex w-full cursor-default items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                        option.value === value && "bg-accent/50 font-medium",
                                    )}
                                >
                                    <span className="flex-1 text-left">{option.label}</span>
                                    {option.value === value && (
                                        <CheckIcon className="size-4 shrink-0 opacity-70" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body,
            )
            : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={openDropdown}
                className={cn(
                    "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors outline-none select-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    !selectedOption && "text-muted-foreground",
                    className,
                )}
            >
                <span className="flex-1 truncate text-left">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
            </button>
            {dropdown}
        </>
    );
}
