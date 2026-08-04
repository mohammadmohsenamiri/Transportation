import { describe, expect, it } from "vitest";
import { buildTree, findMatchingIds } from "@/features/organization/build-tree";
import type { OrganizationUnit } from "@/features/organization/types";

function unit(overrides: Partial<OrganizationUnit>): OrganizationUnit {
  return {
    id: "id",
    code: "CODE",
    name: "name",
    level: "COUNTRY_OFFICE",
    parentId: null,
    latitude: null,
    longitude: null,
    address: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    childCount: 0,
    ...overrides,
  };
}

const country = unit({ id: "country", code: "IR", name: "دفتر مرکزی ایران", level: "COUNTRY_OFFICE" });
const group = unit({
  id: "group",
  code: "IR-TEH",
  name: "دفتر گروه تهران",
  level: "GROUP_OFFICE",
  parentId: "country",
});
const warehouse = unit({
  id: "warehouse",
  code: "IR-TEH-W1",
  name: "انبار مرکزی تهران",
  level: "WAREHOUSE",
  parentId: "group",
});

describe("buildTree", () => {
  it("nests children under their parent", () => {
    const tree = buildTree([warehouse, country, group]);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.id).toBe("country");
    expect(tree[0]!.children[0]!.id).toBe("group");
    expect(tree[0]!.children[0]!.children[0]!.id).toBe("warehouse");
  });
});

describe("findMatchingIds", () => {
  it("returns an empty set (not null) when the query is empty — callers must treat empty separately", () => {
    const result = findMatchingIds([country, group, warehouse], "");
    expect(result.size).toBe(0);
  });

  it("matches by name or code and keeps ancestors visible", () => {
    const result = findMatchingIds([country, group, warehouse], "انبار مرکزی");
    expect(result.has("warehouse")).toBe(true);
    expect(result.has("group")).toBe(true);
    expect(result.has("country")).toBe(true);
  });

  it("is case-insensitive for codes", () => {
    const result = findMatchingIds([country, group, warehouse], "ir-teh-w1");
    expect(result.has("warehouse")).toBe(true);
  });

  it("returns an empty set when nothing matches", () => {
    const result = findMatchingIds([country, group, warehouse], "no-such-thing");
    expect(result.size).toBe(0);
  });
});
