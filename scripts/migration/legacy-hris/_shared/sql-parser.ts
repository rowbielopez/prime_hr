/**
 * mysqldump SQL parser.
 *
 * Scope: parses INSERT INTO statements produced by `mysqldump --extended-insert`
 * (the format used by `public/hris.sql`). Ignores everything else
 * (CREATE TABLE, ALTER, DROP, lock statements, comments).
 *
 * Why a hand-rolled parser: third-party MySQL parsers are heavy and most
 * stream JSON parsers can't handle MySQL escape rules. The file is ~7.5 MB
 * so a single-pass in-memory walk is acceptable.
 *
 * Output: a stream of `{ table, columns, row }` events.
 */
import { readFileSync } from "node:fs";

export interface InsertRow {
    table: string;
    columns: string[];
    /** Raw decoded values in the same order as `columns`. */
    row: Array<string | number | null>;
}

export interface InsertEventHandler {
    onRow: (row: InsertRow) => void;
    onTableSeen?: (table: string, columns: string[]) => void;
}

const WS = new Set([" ", "\t", "\n", "\r"]);

function isWs(c: string) {
    return WS.has(c);
}

function decodeString(raw: string): string {
    let out = "";
    for (let i = 0; i < raw.length; i++) {
        const c = raw[i];
        if (c !== "\\") {
            out += c;
            continue;
        }
        const next = raw[++i];
        switch (next) {
            case "n":
                out += "\n";
                break;
            case "r":
                out += "\r";
                break;
            case "t":
                out += "\t";
                break;
            case "0":
                out += "\0";
                break;
            case "b":
                out += "\b";
                break;
            case "Z":
                out += "\x1a";
                break;
            case "\\":
                out += "\\";
                break;
            case "'":
                out += "'";
                break;
            case '"':
                out += '"';
                break;
            case "%":
                out += "\\%";
                break;
            case "_":
                out += "\\_";
                break;
            default:
                // Unknown escape — keep next char literally (MySQL behaviour).
                out += next ?? "";
        }
    }
    return out;
}

class Parser {
    private pos = 0;
    constructor(private readonly src: string) { }

    private peek(offset = 0): string {
        return this.src[this.pos + offset] ?? "";
    }

    private startsWithIgnoreCase(s: string): boolean {
        return this.src.substr(this.pos, s.length).toUpperCase() === s.toUpperCase();
    }

    private skipWhitespaceAndComments() {
        while (this.pos < this.src.length) {
            const c = this.peek();
            if (isWs(c)) {
                this.pos++;
                continue;
            }
            if (c === "-" && this.peek(1) === "-") {
                // line comment
                while (this.pos < this.src.length && this.peek() !== "\n") this.pos++;
                continue;
            }
            if (c === "/" && this.peek(1) === "*") {
                this.pos += 2;
                while (
                    this.pos < this.src.length &&
                    !(this.peek() === "*" && this.peek(1) === "/")
                ) {
                    this.pos++;
                }
                this.pos += 2;
                continue;
            }
            break;
        }
    }

    /** Read a backtick-quoted identifier `…`. Returns the inner text. */
    private readIdentifier(): string {
        if (this.peek() !== "`") {
            throw new Error(`expected backtick identifier at pos ${this.pos}`);
        }
        this.pos++;
        let out = "";
        while (this.pos < this.src.length) {
            const c = this.peek();
            if (c === "`") {
                if (this.peek(1) === "`") {
                    out += "`";
                    this.pos += 2;
                    continue;
                }
                this.pos++;
                return out;
            }
            out += c;
            this.pos++;
        }
        throw new Error("unterminated identifier");
    }

    /** Read a column list `(c1, c2, …)` after an INSERT INTO `tbl`. */
    private readColumnList(): string[] {
        this.skipWhitespaceAndComments();
        if (this.peek() !== "(") return [];
        this.pos++;
        const cols: string[] = [];
        while (true) {
            this.skipWhitespaceAndComments();
            cols.push(this.readIdentifier());
            this.skipWhitespaceAndComments();
            const c = this.peek();
            if (c === ",") {
                this.pos++;
                continue;
            }
            if (c === ")") {
                this.pos++;
                return cols;
            }
            throw new Error(`expected , or ) at pos ${this.pos}, got ${c}`);
        }
    }

    /** Read a single VALUE: NULL, number, or 'string'. */
    private readValue(): string | number | null {
        this.skipWhitespaceAndComments();
        const c = this.peek();
        if (c === "'") {
            this.pos++;
            const start = this.pos;
            let out = "";
            while (this.pos < this.src.length) {
                const ch = this.src[this.pos];
                if (ch === "\\") {
                    this.pos += 2;
                    continue;
                }
                if (ch === "'") {
                    // Could be escaped via doubled '': common in MySQL too.
                    if (this.src[this.pos + 1] === "'") {
                        this.pos += 2;
                        continue;
                    }
                    out = decodeString(this.src.slice(start, this.pos));
                    this.pos++;
                    return out;
                }
                this.pos++;
            }
            throw new Error("unterminated string");
        }
        if (c === "N" && this.startsWithIgnoreCase("NULL")) {
            this.pos += 4;
            return null;
        }
        // numeric (int / float / negative)
        const start = this.pos;
        if (c === "-" || c === "+") this.pos++;
        while (
            this.pos < this.src.length &&
            /[0-9.eE+-]/.test(this.src[this.pos])
        ) {
            this.pos++;
        }
        const raw = this.src.slice(start, this.pos);
        if (raw === "" || raw === "-" || raw === "+") {
            throw new Error(`expected value at pos ${start}`);
        }
        const n = Number(raw);
        return Number.isFinite(n) ? n : raw;
    }

    /** Read a `(v1, v2, …)` tuple. */
    private readTuple(): Array<string | number | null> {
        if (this.peek() !== "(") {
            throw new Error(`expected ( at pos ${this.pos}`);
        }
        this.pos++;
        const out: Array<string | number | null> = [];
        while (true) {
            out.push(this.readValue());
            this.skipWhitespaceAndComments();
            const c = this.peek();
            if (c === ",") {
                this.pos++;
                continue;
            }
            if (c === ")") {
                this.pos++;
                return out;
            }
            throw new Error(`expected , or ) at pos ${this.pos}, got ${c}`);
        }
    }

    /** Skip until the next statement terminator `;` not inside a string. */
    private skipStatement() {
        while (this.pos < this.src.length) {
            const c = this.peek();
            if (c === "'") {
                // skip a string literal entirely
                this.pos++;
                while (this.pos < this.src.length) {
                    const ch = this.src[this.pos];
                    if (ch === "\\") {
                        this.pos += 2;
                        continue;
                    }
                    if (ch === "'") {
                        this.pos++;
                        break;
                    }
                    this.pos++;
                }
                continue;
            }
            if (c === "`") {
                this.pos++;
                while (this.pos < this.src.length && this.peek() !== "`") this.pos++;
                this.pos++;
                continue;
            }
            if (c === "-" && this.peek(1) === "-") {
                while (this.pos < this.src.length && this.peek() !== "\n") this.pos++;
                continue;
            }
            if (c === "/" && this.peek(1) === "*") {
                this.pos += 2;
                while (
                    this.pos < this.src.length &&
                    !(this.peek() === "*" && this.peek(1) === "/")
                ) {
                    this.pos++;
                }
                this.pos += 2;
                continue;
            }
            if (c === ";") {
                this.pos++;
                return;
            }
            this.pos++;
        }
    }

    parse(handler: InsertEventHandler) {
        const seenTables = new Set<string>();
        while (this.pos < this.src.length) {
            this.skipWhitespaceAndComments();
            if (this.pos >= this.src.length) break;
            if (this.startsWithIgnoreCase("INSERT")) {
                // Consume `INSERT INTO`
                this.pos += "INSERT".length;
                this.skipWhitespaceAndComments();
                if (!this.startsWithIgnoreCase("INTO")) {
                    this.skipStatement();
                    continue;
                }
                this.pos += "INTO".length;
                this.skipWhitespaceAndComments();
                const table = this.readIdentifier();
                const columns = this.readColumnList();
                this.skipWhitespaceAndComments();
                if (!this.startsWithIgnoreCase("VALUES")) {
                    this.skipStatement();
                    continue;
                }
                this.pos += "VALUES".length;
                if (!seenTables.has(table)) {
                    seenTables.add(table);
                    handler.onTableSeen?.(table, columns);
                }
                while (true) {
                    this.skipWhitespaceAndComments();
                    const values = this.readTuple();
                    handler.onRow({ table, columns, row: values });
                    this.skipWhitespaceAndComments();
                    const c = this.peek();
                    if (c === ",") {
                        this.pos++;
                        continue;
                    }
                    if (c === ";") {
                        this.pos++;
                        break;
                    }
                    if (c === "") break;
                    throw new Error(`expected , or ; after tuple at pos ${this.pos}`);
                }
            } else {
                this.skipStatement();
            }
        }
    }
}

export function parseMysqlDumpFile(path: string, handler: InsertEventHandler) {
    const src = readFileSync(path, "utf8");
    const parser = new Parser(src);
    parser.parse(handler);
}

export function parseMysqlDumpString(src: string, handler: InsertEventHandler) {
    const parser = new Parser(src);
    parser.parse(handler);
}
