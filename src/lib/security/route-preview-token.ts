import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { RoutePointInput } from "@/lib/validation/route";

const TOKEN_TTL_MS = 15 * 60 * 1000; // ۱۵ دقیقه

interface PreviewTokenPayload {
  actorUserId: string;
  checksum: string;
  pointCount: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET تنظیم نشده است.");
  }
  return secret;
}

export function computePointsChecksum(points: readonly RoutePointInput[]): string {
  const canonical = JSON.stringify(points.map((p) => [p.sequence, p.latitude, p.longitude, p.label ?? null]));
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * توکن پیش‌نمایش import مسیر: محتوای نقاط تأییدشده را با HMAC امضا می‌کند تا در مرحله confirm
 * بدون نیاز به ذخیره‌سازی سمت سرور، ۱) دستکاری نقاط پس از پیش‌نمایش ۲) استفاده توسط کاربر دیگر رد شود.
 */
export function createRoutePreviewToken(actorUserId: string, points: readonly RoutePointInput[]): string {
  const payload: PreviewTokenPayload = {
    actorUserId,
    checksum: computePointsChecksum(points),
    pointCount: points.length,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(payloadEncoded).digest("base64url");
  return `${payloadEncoded}.${signature}`;
}

export interface RoutePreviewTokenValidation {
  valid: boolean;
  reason?: "MALFORMED" | "SIGNATURE" | "EXPIRED" | "ACTOR_MISMATCH" | "POINTS_MISMATCH";
}

export function verifyRoutePreviewToken(
  token: string,
  actorUserId: string,
  points: readonly RoutePointInput[],
): RoutePreviewTokenValidation {
  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex <= 0) return { valid: false, reason: "MALFORMED" };

  const payloadEncoded = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = createHmac("sha256", getSecret()).update(payloadEncoded).digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, reason: "SIGNATURE" };
  }

  let payload: PreviewTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf-8")) as PreviewTokenPayload;
  } catch {
    return { valid: false, reason: "MALFORMED" };
  }

  if (Date.now() > payload.exp) return { valid: false, reason: "EXPIRED" };
  if (payload.actorUserId !== actorUserId) return { valid: false, reason: "ACTOR_MISMATCH" };
  if (payload.checksum !== computePointsChecksum(points)) return { valid: false, reason: "POINTS_MISMATCH" };

  return { valid: true };
}
