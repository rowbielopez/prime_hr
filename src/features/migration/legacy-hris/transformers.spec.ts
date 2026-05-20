import { describe, expect, it } from "vitest";
import {
    cleanString,
    decodeHtmlEntities,
    normalizeMobile,
    normalizeName,
    normalizeSex,
    normalizeZip,
    parseLegacyDate,
} from "./transformers";

describe("decodeHtmlEntities", () => {
    it("decodes named entities including Spanish accents", () => {
        expect(decodeHtmlEntities("Pe&Ntilde;a")).toBe("PeÑa");
        expect(decodeHtmlEntities("Jos&eacute;")).toBe("José");
        expect(decodeHtmlEntities("A &amp; B")).toBe("A & B");
    });
    it("decodes numeric entities", () => {
        expect(decodeHtmlEntities("&#241;")).toBe("ñ");
    });
});

describe("cleanString", () => {
    it("returns null for null sentinels", () => {
        expect(cleanString("N/A")).toBeNull();
        expect(cleanString("none")).toBeNull();
        expect(cleanString("  ")).toBeNull();
        expect(cleanString("-")).toBeNull();
    });
    it("trims and collapses whitespace", () => {
        expect(cleanString("  Juan   dela  Cruz ")).toBe("Juan dela Cruz");
    });
    it("decodes html entities", () => {
        expect(cleanString("Pe&Ntilde;a")).toBe("PeÑa");
    });
});

describe("parseLegacyDate", () => {
    it("parses ISO dates", () => {
        expect(parseLegacyDate("1990-05-12")).toBe("1990-05-12");
        expect(parseLegacyDate("1990-05-12 00:00:00")).toBe("1990-05-12");
    });
    it("parses slash dates", () => {
        expect(parseLegacyDate("5/12/1990")).toBe("1990-05-12");
        expect(parseLegacyDate("05/12/1990")).toBe("1990-05-12");
    });
    it("parses month-name formats", () => {
        expect(parseLegacyDate("12 January 1990")).toBe("1990-01-12");
        expect(parseLegacyDate("January 12, 1990")).toBe("1990-01-12");
    });
    it("returns null for unparseable input", () => {
        expect(parseLegacyDate("N/A")).toBeNull();
        expect(parseLegacyDate("not a date")).toBeNull();
        expect(parseLegacyDate("13/45/1990")).toBeNull();
    });
});

describe("normalizeMobile", () => {
    it("normalises 09xxxxxxxxx → +639xxxxxxxxx", () => {
        expect(normalizeMobile("09171234567")).toBe("+639171234567");
    });
    it("handles already-normalised numbers", () => {
        expect(normalizeMobile("+639171234567")).toBe("+639171234567");
    });
    it("handles 9xxxxxxxxx", () => {
        expect(normalizeMobile("9171234567")).toBe("+639171234567");
    });
    it("returns null for sentinels", () => {
        expect(normalizeMobile("N/A")).toBeNull();
    });
});

describe("normalizeZip", () => {
    it("zero-pads to 4 digits", () => {
        expect(normalizeZip("123")).toBe("0123");
        expect(normalizeZip("4500")).toBe("4500");
    });
    it("strips non-digits", () => {
        expect(normalizeZip("4500-A")).toBe("4500");
    });
});

describe("normalizeName", () => {
    it("title-cases all-caps", () => {
        expect(normalizeName("JUAN DELA CRUZ")).toBe("Juan Dela Cruz");
    });
    it("leaves mixed-case alone", () => {
        expect(normalizeName("Juan dela Cruz")).toBe("Juan dela Cruz");
    });
});

describe("normalizeSex", () => {
    it("maps to canonical values", () => {
        expect(normalizeSex("Male")).toBe("male");
        expect(normalizeSex("F")).toBe("female");
        expect(normalizeSex("MALE")).toBe("male");
        expect(normalizeSex("N/A")).toBeNull();
    });
});
