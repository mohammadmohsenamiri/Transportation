import { DomainError } from "@/lib/errors/domain-error";
import { analyzeSvg, looksLikeSvg } from "@/lib/domain/svg-analyzer";

/**
 * Phase 14 — قواعد محض آیکن: اعتبارسنجی فایل و زنجیره تعیین آیکن.
 * بدون I/O؛ بایت‌ها به‌عنوان ورودی داده می‌شوند تا کل منطق بدون فایل‌سیستم آزمون شود.
 */

export type IconMimeType = "image/png" | "image/svg+xml";

/** سقف ۲ مگابایت طبق API_SECURITY_OFFLINE_OPERATIONS.md §۶. */
export const MAX_ICON_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MIN_ICON_DIMENSION_PX = 16;
export const MAX_ICON_DIMENSION_PX = 512;

const EXTENSION_BY_MIME: Record<IconMimeType, string> = {
  "image/png": ".png",
  "image/svg+xml": ".svg",
};

const MIME_BY_EXTENSION: Record<string, IconMimeType> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

export function extensionForMime(mimeType: IconMimeType): string {
  return EXTENSION_BY_MIME[mimeType];
}

// ---------------------------------------------------------------------------
// ابعاد PNG — بدون هیچ dependency
// ---------------------------------------------------------------------------

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * عرض/ارتفاع را از قطعه IHDR می‌خواند (بایت‌های ۱۶ تا ۲۳، big-endian).
 * `null` یعنی این بایت‌ها PNG معتبر نیستند.
 *
 * عمداً یک کتابخانه پردازش تصویر اضافه نشده: این کار ۱۰ خط است و افزودن یک وابستگی بومی،
 * استقرار آفلاین و ساخت کانتینر را برای سود ناچیز پیچیده می‌کند.
 */
export function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }
  const ihdr = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (ihdr !== "IHDR") return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

// ---------------------------------------------------------------------------
// اعتبارسنجی فایل — به همان ترتیب مستندشده در 02-REQUIREMENTS §۴.۲
// ---------------------------------------------------------------------------

export interface IconFileMeta {
  filename: string;
  declaredMimeType: string;
  size: number;
}

export interface ValidatedIconFile {
  mimeType: IconMimeType;
  width: number | null;
  height: number | null;
}

function extensionOf(filename: string): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot === -1 ? "" : lower.slice(dot);
}

/**
 * کل زنجیره اعتبارسنجی. اولین شکست کوتاه می‌کند و هیچ بایتی نوشته نمی‌شود.
 * MIME اعلام‌شده بررسی *و* هرگز به‌تنهایی باور نمی‌شود؛ آنچه واقعاً نوع را تعیین می‌کند
 * بازرسی محتواست (magic bytes برای PNG، ریشه `<svg>` برای SVG).
 */
export function validateIconFile(meta: IconFileMeta, bytes: Uint8Array): ValidatedIconFile {
  const extension = extensionOf(meta.filename);
  const mimeFromExtension = MIME_BY_EXTENSION[extension];

  if (!mimeFromExtension) {
    throw new DomainError("ICON_INVALID_EXTENSION", "فقط فایل با پسوند PNG یا SVG مجاز است.", {
      file: "پسوند فایل مجاز نیست.",
    });
  }
  if (meta.declaredMimeType !== "image/png" && meta.declaredMimeType !== "image/svg+xml") {
    throw new DomainError("ICON_INVALID_MIME", "نوع فایل ارسالی مجاز نیست.", { file: "نوع فایل مجاز نیست." });
  }
  if (meta.declaredMimeType !== mimeFromExtension) {
    throw new DomainError("ICON_TYPE_MISMATCH", "پسوند فایل با نوع اعلام‌شده آن هم‌خوانی ندارد.", {
      file: "پسوند و نوع فایل یکسان نیستند.",
    });
  }
  if (meta.size <= 0 || bytes.length === 0) {
    throw new DomainError("ICON_EMPTY", "فایل خالی است.", { file: "فایل خالی است." });
  }
  if (meta.size > MAX_ICON_FILE_SIZE_BYTES) {
    throw new DomainError("ICON_TOO_LARGE", "حجم آیکن نباید بیش از ۲ مگابایت باشد.", {
      file: "حجم فایل بیش از حد مجاز است.",
    });
  }

  if (mimeFromExtension === "image/png") {
    const dimensions = readPngDimensions(bytes);
    if (!dimensions) {
      throw new DomainError("ICON_CONTENT_MISMATCH", "محتوای فایل یک تصویر PNG معتبر نیست.", {
        file: "محتوای فایل با نوع اعلام‌شده مطابقت ندارد.",
      });
    }
    const { width, height } = dimensions;
    if (
      width < MIN_ICON_DIMENSION_PX ||
      width > MAX_ICON_DIMENSION_PX ||
      height < MIN_ICON_DIMENSION_PX ||
      height > MAX_ICON_DIMENSION_PX
    ) {
      throw new DomainError(
        "ICON_DIMENSIONS_INVALID",
        "ابعاد آیکن باید بین ۱۶ تا ۵۱۲ پیکسل باشد.",
        { file: "ابعاد تصویر خارج از محدوده مجاز است." },
      );
    }
    return { mimeType: "image/png", width, height };
  }

  const source = new TextDecoder().decode(bytes);
  if (!looksLikeSvg(source)) {
    throw new DomainError("ICON_CONTENT_MISMATCH", "محتوای فایل یک سند SVG معتبر نیست.", {
      file: "محتوای فایل با نوع اعلام‌شده مطابقت ندارد.",
    });
  }
  const findings = analyzeSvg(source);
  if (findings.length > 0) {
    const constructs = [...new Set(findings.map((finding) => finding.construct))].join("، ");
    throw new DomainError(
      "ICON_SVG_UNSAFE",
      `فایل SVG شامل ساختار غیرمجاز است و پذیرفته نشد: ${constructs}`,
      { file: `ساختار غیرمجاز: ${constructs}` },
    );
  }
  // SVG ابعاد ذاتی تضمین‌شده ندارد؛ null معتبر است.
  return { mimeType: "image/svg+xml", width: null, height: null };
}

// ---------------------------------------------------------------------------
// تعیین آیکن
// ---------------------------------------------------------------------------

/**
 * زنجیره: آیکن خودِ موجودیت ← آیکن نوع ← پیش‌فرض داخلی (`null`).
 *
 * آیکن حذف‌شده یا ناموجود «غایب» تلقی می‌شود و زنجیره ادامه می‌یابد — هرگز خطا و هرگز تصویر
 * شکسته (BR-I02). به همین دلیل نقشه در هیچ حالتی نشانگرهایش را از دست نمی‌دهد.
 */
export function resolveIcon(
  entityIconId: string | null | undefined,
  typeIconId: string | null | undefined,
  usableIconIds: ReadonlySet<string>,
): string | null {
  if (entityIconId && usableIconIds.has(entityIconId)) return entityIconId;
  if (typeIconId && usableIconIds.has(typeIconId)) return typeIconId;
  return null;
}

export function validateIconName(raw: string): string {
  const value = raw.trim();
  if (value.length < 1 || value.length > 64) {
    throw new DomainError("ICON_NAME_INVALID", "نام آیکن باید بین ۱ تا ۶۴ نویسه باشد.", {
      name: "نام آیکن نامعتبر است.",
    });
  }
  return value;
}
