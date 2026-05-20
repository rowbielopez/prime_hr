/**
 * Pure data-cleaning transformers for legacy HRIS payloads.
 *
 * Rules (locked in by tests in transformers.spec.ts):
 *   - HTML entities are decoded (the dump has `&Ntilde;`, `&aacute;`, …).
 *   - "N/A", "n/a", "none", "-", "" → null (sentinel cleanup).
 *   - Dates: accept ISO, MySQL `YYYY-MM-DD`, and common PH formats
 *     (`M/D/YYYY`, `MM-DD-YYYY`, `D Month YYYY`). Returns ISO date or null.
 *   - Mobile numbers: normalise to `+63XXXXXXXXXX` when recognisable.
 *   - Zip codes: trim and zero-pad to 4 digits.
 *   - Names: trim, collapse whitespace, fix common all-caps surnames.
 */

const NULL_SENTINELS = new Set(["", "n/a", "na", "none", "null", "-", "—", "n.a."]);

const HTML_ENTITIES: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&nbsp;": " ",
    "&Ntilde;": "Ñ",
    "&ntilde;": "ñ",
    "&aacute;": "á",
    "&eacute;": "é",
    "&iacute;": "í",
    "&oacute;": "ó",
    "&uacute;": "ú",
    "&Aacute;": "Á",
    "&Eacute;": "É",
    "&Iacute;": "Í",
    "&Oacute;": "Ó",
    "&Uacute;": "Ú",
};

export function decodeHtmlEntities(input: string): string {
    const out = input.replace(/&[A-Za-z]+;|&#\d+;/g, (m) => {
        if (HTML_ENTITIES[m]) return HTML_ENTITIES[m];
        const num = /^&#(\d+);$/.exec(m);
        if (num) return String.fromCharCode(Number(num[1]));
        return m;
    });
    return out;
}

export function cleanString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    let s = String(value);
    s = decodeHtmlEntities(s);
    s = s.replace(/\s+/g, " ").trim();
    if (NULL_SENTINELS.has(s.toLowerCase())) return null;
    return s.length === 0 ? null : s;
}

const MONTHS: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
};

function toIsoDate(y: number, m: number, d: number): string | null {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    if (y < 1900 || y > 2100) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (
        dt.getUTCFullYear() !== y ||
        dt.getUTCMonth() !== m - 1 ||
        dt.getUTCDate() !== d
    ) {
        return null;
    }
    return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d
        .toString()
        .padStart(2, "0")}`;
}

/** Parses many PH date formats into an ISO `YYYY-MM-DD`, or null if unparseable. */
export function parseLegacyDate(raw: unknown): string | null {
    const s = cleanString(raw);
    if (!s) return null;
    // ISO / MySQL: YYYY-MM-DD optionally followed by time
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (iso) return toIsoDate(+iso[1], +iso[2], +iso[3]);

    // MM/DD/YYYY  or  M/D/YYYY  or  MM-DD-YYYY
    const slash = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(s);
    if (slash) {
        const m = +slash[1];
        const d = +slash[2];
        let y = +slash[3];
        if (y < 100) y += y < 50 ? 2000 : 1900;
        return toIsoDate(y, m, d);
    }

    // "12 January 2020" or "January 12, 2020"
    const word1 = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
    if (word1) {
        const m = MONTHS[word1[2].toLowerCase()];
        if (m) return toIsoDate(+word1[3], m, +word1[1]);
    }
    const word2 = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
    if (word2) {
        const m = MONTHS[word2[1].toLowerCase()];
        if (m) return toIsoDate(+word2[3], m, +word2[2]);
    }
    return null;
}

/**
 * Normalises PH mobile numbers to +63XXXXXXXXXX. Returns the original cleaned
 * value if normalisation is not possible (validator will flag it).
 */
export function normalizeMobile(raw: unknown): string | null {
    const s = cleanString(raw);
    if (!s) return null;
    const digits = s.replace(/\D+/g, "");
    if (digits.length === 11 && digits.startsWith("09")) {
        return `+63${digits.slice(1)}`;
    }
    if (digits.length === 10 && digits.startsWith("9")) {
        return `+63${digits}`;
    }
    if (digits.length === 12 && digits.startsWith("639")) {
        return `+${digits}`;
    }
    if (s.startsWith("+") && digits.length >= 11) return `+${digits}`;
    return s;
}

export function normalizeZip(raw: unknown): string | null {
    const s = cleanString(raw);
    if (!s) return null;
    const digits = s.replace(/\D+/g, "");
    if (digits.length === 0) return null;
    if (digits.length > 4) return digits.slice(0, 4);
    return digits.padStart(4, "0");
}

/** Title-cases an ALL-CAPS surname while preserving Ñ and apostrophes. */
export function normalizeName(raw: unknown): string | null {
    const s = cleanString(raw);
    if (!s) return null;
    if (s !== s.toUpperCase()) return s; // already mixed case
    return s
        .toLowerCase()
        .replace(/(^|[\s\-'])(\w)/g, (_m, sep, ch) => sep + ch.toUpperCase());
}

/** Coerces 'M'/'F'/'Male'/'Female' to 'male' | 'female' | null. */
export function normalizeSex(raw: unknown): "male" | "female" | null {
    const s = cleanString(raw);
    if (!s) return null;
    const c = s.toLowerCase();
    if (c.startsWith("m")) return "male";
    if (c.startsWith("f")) return "female";
    return null;
}
