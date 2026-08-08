/**
 * Phase 14 — تحلیل امنیتی SVG آپلودی.
 *
 * ⚠️ این ماژول **خط دفاع دوم** است، نه اول. کنترل اصلی طبق ADR-P14-04 این است که SVG آپلودی
 * فقط از طریق `<img src>` رندر شود (هرگز inline) و با هدر
 * `Content-Security-Policy: default-src 'none'; sandbox` سرو شود؛ اسکریپت داخل SVG که از راه
 * `<img>` بارگذاری شود در هیچ مرورگر امروزی اجرا نمی‌شود.
 *
 * دلیل این ترتیب: sanitizerهای دست‌نویس SVG سابقه طولانی bypass دارند. اگر این تحلیلگر تنها
 * مانع بود، یک bypass یعنی XSS ذخیره‌شده. با این طراحی، حتی عبور یک فایل مخرب از اینجا هم
 * قابل بهره‌برداری نیست.
 *
 * سیاست: **reject، نه strip**. تغییر بی‌صدای فایل مدیر، تصویری متفاوت از خواسته او تولید می‌کند
 * بدون اینکه بفهمد؛ پیام خطا سازه متخلف را نام می‌برد تا بتواند منبع را اصلاح کند.
 */

export interface SvgFinding {
  /** نام سازه غیرمجاز — در پیام خطا به مدیر نشان داده می‌شود. */
  construct: string;
  detail: string;
}

const FORBIDDEN_ELEMENTS = ["script", "foreignobject", "iframe", "embed", "object"] as const;

/** تنها data URI مجاز — تصویر PNG جاسازی‌شده. هر نوع دیگری می‌تواند حامل payload باشد. */
const ALLOWED_DATA_URI_PREFIX = "data:image/png;base64,";

function isExternalReference(target: string): boolean {
  const value = target.trim();
  if (value.length === 0) return false;
  if (value.startsWith("#")) return false; // ارجاع داخلی به همان سند — مجاز
  if (value.startsWith(ALLOWED_DATA_URI_PREFIX)) return false;
  return true;
}

export function analyzeSvg(source: string): SvgFinding[] {
  const findings: SvgFinding[] = [];
  const lower = source.toLowerCase();

  // DOCTYPE با زیرمجموعه داخلی یا ENTITY → XXE و «billion laughs»
  if (lower.includes("<!entity") || /<!doctype[^>]*\[/i.test(source)) {
    findings.push({ construct: "DOCTYPE/ENTITY", detail: "امکان حمله XXE یا انفجار موجودیت" });
  }

  for (const element of FORBIDDEN_ELEMENTS) {
    // فاصله اختیاری پس از `<` تا ترفندهایی مثل «< script» هم گرفته شوند.
    if (new RegExp(`<\\s*${element}\\b`, "i").test(source)) {
      findings.push({ construct: `<${element}>`, detail: "عنصر غیرمجاز در SVG" });
    }
  }

  if (/\son[a-z]+\s*=/i.test(source)) {
    findings.push({ construct: "on* attribute", detail: "کنترل‌کننده رویداد (مثل onload)" });
  }

  if (/javascript\s*:/i.test(lower)) {
    findings.push({ construct: "javascript:", detail: "نشانی اسکریپتی" });
  }

  for (const match of source.matchAll(/(?:xlink:href|href)\s*=\s*["']([^"']*)["']/gi)) {
    const target = match[1];
    if (isExternalReference(target)) {
      findings.push({ construct: "href", detail: `ارجاع بیرونی: ${target.trim().slice(0, 40)}` });
    }
  }

  if (/@import/i.test(lower) || /expression\s*\(/i.test(lower)) {
    findings.push({ construct: "CSS", detail: "@import یا expression() در سبک" });
  }

  for (const match of lower.matchAll(/url\(\s*['"]?([^'")]+)/g)) {
    if (isExternalReference(match[1])) {
      findings.push({ construct: "url()", detail: `منبع بیرونی در CSS: ${match[1].trim().slice(0, 40)}` });
    }
  }

  return findings;
}

/** ریشه سند باید واقعاً `<svg>` باشد — بخشی از بررسی «محتوا با نوع اعلام‌شده می‌خواند؟». */
export function looksLikeSvg(source: string): boolean {
  return /<svg[\s>]/i.test(source);
}
