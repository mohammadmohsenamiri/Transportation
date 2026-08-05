import { describe, expect, it } from "vitest";
import { validateRouteCsvRows } from "@/lib/domain/route-csv";

const HEADER = ["sequence", "latitude", "longitude", "label"];

describe("validateRouteCsvRows", () => {
  it("rejects an empty file", () => {
    const result = validateRouteCsvRows([]);
    expect(result.headerError).toBeTruthy();
  });

  it("rejects a mismatched header", () => {
    const result = validateRouteCsvRows([["a", "b", "c", "d"], ["1", "1", "1", ""]]);
    expect(result.headerError).toBeTruthy();
  });

  it("parses and sorts valid rows by sequence", () => {
    const result = validateRouteCsvRows([
      HEADER,
      ["2", "35.7219", "51.3347", "نقطه میانی"],
      ["1", "35.6892", "51.389", "مبدا"],
      ["3", "35.84", "50.9391", "مقصد"],
    ]);
    expect(result.headerError).toBeNull();
    expect(result.rowErrors).toEqual([]);
    expect(result.points.map((p) => p.sequence)).toEqual([1, 2, 3]);
    expect(result.points[0].label).toBe("مبدا");
  });

  it("treats a blank label as null", () => {
    const result = validateRouteCsvRows([HEADER, ["1", "1", "1", ""], ["2", "2", "2", "x"]]);
    expect(result.points[0].label).toBeNull();
  });

  it("rejects out-of-range latitude/longitude", () => {
    const result = validateRouteCsvRows([HEADER, ["1", "91", "1", ""], ["2", "1", "181", ""]]);
    expect(result.rowErrors).toHaveLength(2);
    expect(result.rowErrors[0].row).toBe(2);
    expect(result.rowErrors[1].row).toBe(3);
  });

  it("rejects a non-positive-integer sequence", () => {
    const result = validateRouteCsvRows([HEADER, ["0", "1", "1", ""], ["1.5", "1", "1", ""]]);
    expect(result.rowErrors).toHaveLength(2);
  });

  it("rejects duplicate sequence values", () => {
    const result = validateRouteCsvRows([HEADER, ["1", "1", "1", "a"], ["1", "2", "2", "b"]]);
    expect(result.rowErrors.some((e) => e.message.includes("تکراری"))).toBe(true);
  });

  it("rejects consecutive duplicate coordinates after sorting", () => {
    const result = validateRouteCsvRows([HEADER, ["1", "35.5", "51.5", "a"], ["2", "35.5", "51.5", "b"]]);
    expect(result.rowErrors.some((e) => e.message.includes("متوالی"))).toBe(true);
  });

  it("requires at least two valid points", () => {
    const result = validateRouteCsvRows([HEADER, ["1", "35.5", "51.5", "a"]]);
    expect(result.rowErrors.some((e) => e.message.includes("حداقل دو نقطه"))).toBe(true);
  });

  it("rejects rows with the wrong number of columns", () => {
    const result = validateRouteCsvRows([HEADER, ["1", "35.5", "51.5"]]);
    expect(result.rowErrors.some((e) => e.message.includes("ستون"))).toBe(true);
  });
});
