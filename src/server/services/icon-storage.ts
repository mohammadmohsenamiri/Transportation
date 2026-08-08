import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { DomainError } from "@/lib/errors/domain-error";

/**
 * Phase 14 — آداپتور ذخیره‌سازی آیکن روی فایل‌سیستم.
 *
 * محل ذخیره‌سازی عمداً **بیرون از `public/`** است: Next.js محتویات `public/` را به‌صورت استاتیک و
 * **پیش از** middleware سرو می‌کند، پس فایل آنجا بدون احراز هویت، بدون CSP و بدون امکان ممیزی
 * در دسترس همه قرار می‌گرفت (ADR-P14-03).
 *
 * نام فایل کاملاً سمت سرور از UUID ساخته می‌شود؛ نام ارسالی کاربر هرگز وارد مسیر نمی‌شود، پس
 * path traversal ساختاراً ناممکن است نه فیلترشده (SEC-11).
 */

const ICON_ROOT = path.resolve(process.env.ICON_STORAGE_ROOT ?? path.join(process.cwd(), "storage", "icons"));

/** فقط «{uuid}.{png|svg}» — هر شکل دیگری یعنی رکورد خراب یا تلاش برای دستکاری. */
const STORAGE_PATH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|svg)$/i;

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function ensureRoot(): Promise<void> {
  await mkdir(ICON_ROOT, { recursive: true });
}

/**
 * دو نگهبان مستقل: الگوی نام و سپس ادعای در‌بر‌گیری مسیر.
 * الگو به‌تنهایی traversal را ناممکن می‌کند؛ ادعای دوم هر تغییر آینده‌ای که الگو را شل کند
 * می‌گیرد.
 */
export function resolveIconPath(storagePath: string): string {
  if (!STORAGE_PATH_PATTERN.test(storagePath)) {
    throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");
  }
  const full = path.resolve(ICON_ROOT, storagePath);
  if (!full.startsWith(ICON_ROOT + path.sep)) {
    throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");
  }
  return full;
}

export async function writeIconFile(storagePath: string, bytes: Uint8Array): Promise<void> {
  await ensureRoot();
  await writeFile(resolveIconPath(storagePath), bytes);
}

/** `null` یعنی فایل روی دیسک نیست — فراخوان باید آن را «غایب» تلقی کند، نه خطا (BR-I02). */
export async function readIconFile(storagePath: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveIconPath(storagePath));
  } catch {
    return null;
  }
}

export async function deleteIconFile(storagePath: string): Promise<void> {
  await unlink(resolveIconPath(storagePath));
}

export function iconStorageRoot(): string {
  return ICON_ROOT;
}
