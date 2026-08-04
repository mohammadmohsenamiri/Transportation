import { describe, expect, it } from "vitest";
import { isValidParentLevel } from "@/lib/domain/organization-rules";

describe("isValidParentLevel", () => {
  it("requires COUNTRY_OFFICE to have no parent", () => {
    expect(isValidParentLevel("COUNTRY_OFFICE", null)).toBe(true);
    expect(isValidParentLevel("COUNTRY_OFFICE", "COUNTRY_OFFICE")).toBe(false);
  });

  it("requires GROUP_OFFICE parent to be COUNTRY_OFFICE", () => {
    expect(isValidParentLevel("GROUP_OFFICE", "COUNTRY_OFFICE")).toBe(true);
    expect(isValidParentLevel("GROUP_OFFICE", null)).toBe(false);
    expect(isValidParentLevel("GROUP_OFFICE", "GROUP_OFFICE")).toBe(false);
    expect(isValidParentLevel("GROUP_OFFICE", "DISTRIBUTOR_OFFICE")).toBe(false);
  });

  it("requires DISTRIBUTOR_OFFICE parent to be GROUP_OFFICE", () => {
    expect(isValidParentLevel("DISTRIBUTOR_OFFICE", "GROUP_OFFICE")).toBe(true);
    expect(isValidParentLevel("DISTRIBUTOR_OFFICE", "COUNTRY_OFFICE")).toBe(false);
    expect(isValidParentLevel("DISTRIBUTOR_OFFICE", "WAREHOUSE")).toBe(false);
  });

  it("requires WAREHOUSE parent to be DISTRIBUTOR_OFFICE", () => {
    expect(isValidParentLevel("WAREHOUSE", "DISTRIBUTOR_OFFICE")).toBe(true);
    expect(isValidParentLevel("WAREHOUSE", "GROUP_OFFICE")).toBe(false);
    expect(isValidParentLevel("WAREHOUSE", null)).toBe(false);
  });
});
