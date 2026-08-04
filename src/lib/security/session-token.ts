import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "th_session";
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 12; // 12 ساعت

interface GeneratedSessionToken {
  cookieValue: string;
  secretHash: string;
}

export function generateSessionToken(sessionId: string): GeneratedSessionToken {
  const secret = randomBytes(32).toString("base64url");
  return {
    cookieValue: `${sessionId}.${secret}`,
    secretHash: hashSecret(secret),
  };
}

export function parseSessionCookie(cookieValue: string | undefined): { sessionId: string; secret: string } | null {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex <= 0) return null;
  const sessionId = cookieValue.slice(0, separatorIndex);
  const secret = cookieValue.slice(separatorIndex + 1);
  if (!sessionId || !secret) return null;
  return { sessionId, secret };
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function secretMatchesHash(secret: string, hash: string): boolean {
  const candidate = Buffer.from(hashSecret(secret));
  const expected = Buffer.from(hash);
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
