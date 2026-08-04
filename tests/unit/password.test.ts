import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash).not.toBe("Sup3rSecret!");
    expect(await verifyPassword(hash, "Sup3rSecret!")).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });

  it("returns false instead of throwing for a malformed hash", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });
});
