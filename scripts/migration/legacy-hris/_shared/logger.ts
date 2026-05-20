/**
 * Minimal CLI logger. Pretty-prints with timestamps + a counter per phase.
 */
type Level = "info" | "warn" | "error" | "ok" | "debug";

const LEVEL_TAG: Record<Level, string> = {
    info: "[i]",
    warn: "[!]",
    error: "[x]",
    ok: "[+]",
    debug: "[.]",
};

function fmt(level: Level, scope: string, message: string) {
    const ts = new Date().toISOString();
    return `${ts} ${LEVEL_TAG[level]} ${scope.padEnd(18)} ${message}`;
}

export function createLogger(scope: string) {
    return {
        info: (m: string) => console.log(fmt("info", scope, m)),
        warn: (m: string) => console.warn(fmt("warn", scope, m)),
        error: (m: string) => console.error(fmt("error", scope, m)),
        ok: (m: string) => console.log(fmt("ok", scope, m)),
        debug: (m: string) => {
            if (process.env.LEGACY_DEBUG) console.log(fmt("debug", scope, m));
        },
    };
}
