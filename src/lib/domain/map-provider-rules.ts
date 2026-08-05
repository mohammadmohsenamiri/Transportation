import type { MapProviderKind } from "@/generated/prisma/client";

export interface UrlTemplateValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * بررسی ساختاری baseline قالب URL کاشی نقشه (Phase 4).
 * این تابع فقط scheme، ساختار میزبان و placeholderهای لازم را بررسی می‌کند؛
 * سخت‌گیری کامل SSRF (allowlist hostname/CIDR قابل‌تنظیم، DNS rebinding) طبق
 * IMPLEMENTATION_PLAN به Phase 16 موکول شده است.
 */
export function validateTileUrlTemplate(
  urlTemplate: string,
  kind: MapProviderKind,
): UrlTemplateValidationResult {
  const trimmed = urlTemplate.trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: "آدرس باید با http:// یا https:// شروع شود." };
  }

  let hostname: string;
  try {
    const sanitizedForParsing = trimmed.replace(/\{[a-zA-Z]+\}/g, "0");
    const parsed = new URL(sanitizedForParsing);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, error: "فقط پروتکل http یا https مجاز است." };
    }
    hostname = parsed.hostname;
  } catch {
    return { valid: false, error: "قالب آدرس نامعتبر است." };
  }

  if (!hostname) {
    return { valid: false, error: "قالب آدرس باید شامل نام میزبان باشد." };
  }

  if (kind === "INTERNAL_WMTS") {
    // نسخه اول: قالب‌بندی درخواست WMTS پیاده‌سازی نشده؛ فقط اعتبارسنجی URL پایه انجام می‌شود.
    return { valid: true };
  }

  const hasZ = trimmed.includes("{z}");
  const hasX = trimmed.includes("{x}");
  const hasY = trimmed.includes("{y}") || trimmed.includes("{reverseY}");

  if (!hasZ || !hasX || !hasY) {
    return {
      valid: false,
      error:
        kind === "INTERNAL_TMS"
          ? "آدرس TMS باید شامل {z}، {x} و {y} یا {reverseY} باشد."
          : "آدرس باید شامل {z}، {x} و {y} باشد.",
    };
  }

  return { valid: true };
}

export function mapLibreScheme(kind: MapProviderKind, urlTemplate: string): "xyz" | "tms" {
  if (kind === "INTERNAL_TMS") return "tms";
  if (urlTemplate.includes("{reverseY}")) return "tms";
  return "xyz";
}
