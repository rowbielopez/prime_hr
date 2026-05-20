/**
 * Masks a sensitive identifier (TIN, GSIS, PhilHealth, Pag-IBIG) so only the
 * last few characters remain visible. Returns `null` for nullish input and
 * an "Unset" placeholder when the caller prefers that.
 */
export function maskId(value: string | null | undefined, visible = 4): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length <= visible) return trimmed;
    const dots = "•".repeat(Math.min(8, trimmed.length - visible));
    return `${dots}${trimmed.slice(-visible)}`;
}

export function maskIdOrPlaceholder(
    value: string | null | undefined,
    placeholder = "—",
    visible = 4,
): string {
    return maskId(value, visible) ?? placeholder;
}
