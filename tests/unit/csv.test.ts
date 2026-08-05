import { describe, expect, it } from "vitest";
import { parseCsv, sanitizeCsvInjection, stringifyCsv } from "@/lib/csv/csv";

describe("parseCsv", () => {
  it("parses a simple header + rows", () => {
    const rows = parseCsv("sequence,latitude,longitude,label\n1,35.6892,51.389,مبدا\n2,35.72,51.33,مقصد");
    expect(rows).toEqual([
      ["sequence", "latitude", "longitude", "label"],
      ["1", "35.6892", "51.389", "مبدا"],
      ["2", "35.72", "51.33", "مقصد"],
    ]);
  });

  it("strips a UTF-8 BOM", () => {
    const rows = parseCsv("﻿sequence,latitude,longitude,label\n1,1,1,a");
    expect(rows[0][0]).toBe("sequence");
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("supports quoted fields containing commas and escaped quotes", () => {
    const rows = parseCsv('1,2,3,"نقطه ""میانی"", با کاما"');
    expect(rows).toEqual([["1", "2", "3", 'نقطه "میانی", با کاما']]);
  });

  it("ignores a single trailing blank line", () => {
    const rows = parseCsv("a,b\n1,2\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("stringifyCsv", () => {
  it("round-trips simple rows", () => {
    const csv = stringifyCsv([
      ["sequence", "latitude", "longitude", "label"],
      ["1", "35.6892", "51.389", "مبدا"],
    ]);
    expect(parseCsv(csv)).toEqual([
      ["sequence", "latitude", "longitude", "label"],
      ["1", "35.6892", "51.389", "مبدا"],
    ]);
  });

  it("quotes fields containing commas or quotes", () => {
    const csv = stringifyCsv([["a,b", 'c"d']]);
    expect(csv).toBe('"a,b","c""d"');
  });
});

describe("sanitizeCsvInjection", () => {
  it("prefixes values starting with formula-trigger characters", () => {
    expect(sanitizeCsvInjection("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(sanitizeCsvInjection("+1234")).toBe("'+1234");
    expect(sanitizeCsvInjection("-1234")).toBe("'-1234");
    expect(sanitizeCsvInjection("@cmd")).toBe("'@cmd");
  });

  it("leaves normal text untouched", () => {
    expect(sanitizeCsvInjection("مبدا")).toBe("مبدا");
    expect(sanitizeCsvInjection("")).toBe("");
  });
});
