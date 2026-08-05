import { describe, expect, it } from "vitest";
import { validateTileUrlTemplate, mapLibreScheme } from "@/lib/domain/map-provider-rules";

describe("validateTileUrlTemplate", () => {
  it("accepts a valid XYZ template", () => {
    const result = validateTileUrlTemplate("https://tiles.internal.local/{z}/{x}/{y}.png", "INTERNAL_XYZ");
    expect(result.valid).toBe(true);
  });

  it("accepts a valid TMS template with {reverseY}", () => {
    const result = validateTileUrlTemplate("https://tiles.internal.local/{z}/{x}/{reverseY}.png", "INTERNAL_TMS");
    expect(result.valid).toBe(true);
  });

  it("rejects a non-http(s) scheme", () => {
    const result = validateTileUrlTemplate("ftp://tiles.internal.local/{z}/{x}/{y}.png", "INTERNAL_XYZ");
    expect(result.valid).toBe(false);
  });

  it("rejects javascript: and other dangerous schemes", () => {
    const result = validateTileUrlTemplate("javascript:alert(1)", "EXTERNAL_XYZ");
    expect(result.valid).toBe(false);
  });

  it("rejects a template missing {x}/{y}/{z}", () => {
    const result = validateTileUrlTemplate("https://tiles.internal.local/tiles.png", "INTERNAL_XYZ");
    expect(result.valid).toBe(false);
  });

  it("rejects a malformed URL", () => {
    const result = validateTileUrlTemplate("not a url at all", "INTERNAL_XYZ");
    expect(result.valid).toBe(false);
  });

  it("allows WMTS with just a valid base URL (no placeholder enforcement yet)", () => {
    const result = validateTileUrlTemplate("https://wmts.internal.local/service", "INTERNAL_WMTS");
    expect(result.valid).toBe(true);
  });

  it("still rejects an invalid scheme for WMTS", () => {
    const result = validateTileUrlTemplate("ftp://wmts.internal.local/service", "INTERNAL_WMTS");
    expect(result.valid).toBe(false);
  });
});

describe("mapLibreScheme", () => {
  it("returns tms for INTERNAL_TMS regardless of placeholders", () => {
    expect(mapLibreScheme("INTERNAL_TMS", "https://x/{z}/{x}/{y}.png")).toBe("tms");
  });

  it("returns tms when the template uses {reverseY} even for XYZ kind", () => {
    expect(mapLibreScheme("INTERNAL_XYZ", "https://x/{z}/{x}/{reverseY}.png")).toBe("tms");
  });

  it("returns xyz for a plain XYZ template", () => {
    expect(mapLibreScheme("INTERNAL_XYZ", "https://x/{z}/{x}/{y}.png")).toBe("xyz");
  });

  it("returns xyz for external providers by default", () => {
    expect(mapLibreScheme("EXTERNAL_XYZ", "https://tile.openstreetmap.org/{z}/{x}/{y}.png")).toBe("xyz");
  });
});
