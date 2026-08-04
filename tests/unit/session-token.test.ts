import { describe, it, expect } from "vitest";
import {
  generateSessionToken,
  parseSessionCookie,
  secretMatchesHash,
} from "@/lib/security/session-token";

describe("session token", () => {
  it("round-trips the session id through the cookie value", () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const { cookieValue, secretHash } = generateSessionToken(sessionId);

    const parsed = parseSessionCookie(cookieValue);
    expect(parsed?.sessionId).toBe(sessionId);
    expect(secretMatchesHash(parsed!.secret, secretHash)).toBe(true);
  });

  it("rejects a tampered secret", () => {
    const { secretHash } = generateSessionToken("session-id");
    expect(secretMatchesHash("wrong-secret", secretHash)).toBe(false);
  });

  it("returns null for malformed or missing cookies", () => {
    expect(parseSessionCookie(undefined)).toBeNull();
    expect(parseSessionCookie("")).toBeNull();
    expect(parseSessionCookie("no-separator")).toBeNull();
  });
});
