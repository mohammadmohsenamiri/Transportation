import type { NextRequest } from "next/server";
import { DomainError } from "@/lib/errors/domain-error";
import { MAX_ICON_FILE_SIZE_BYTES } from "@/lib/domain/icon-rules";

export interface IconMultipart {
  filename: string;
  declaredMimeType: string;
  size: number;
  bytes: Uint8Array;
  /**
   * فیلدهای متنی همراه فایل. عمداً یک نگاشت عمومی است چون `upload` به `name`/`category` نیاز
   * دارد و `replace` به `version` — یک اینترفیس با هر سه فیلد، هر route را وادار می‌کرد فیلدهای
   * بی‌ربط را هم بپذیرد.
   */
  fields: Record<string, string>;
}

/**
 * خواندن یک‌باره بدنه multipart.
 *
 * بدنه request فقط یک‌بار قابل مصرف است، پس فایل و فیلدهای متنی با هم برداشته می‌شوند. کنترل
 * حجم پیش از `arrayBuffer()` انجام می‌شود تا یک فایل ۵۰۰ مگابایتی هرگز کامل در حافظه ننشیند؛
 * `size` گزارش‌شده توسط مرورگر قابل اعتماد نیست، اما برای رد کردن زودهنگام کافی است و
 * `validateIconFile` بعداً طول واقعی بایت‌ها را دوباره می‌سنجد (SEC-08).
 */
export async function readIconMultipart(request: NextRequest): Promise<IconMultipart> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new DomainError("ICON_FILE_REQUIRED", "درخواست باید از نوع multipart باشد.");
  }

  const form = await request.formData().catch(() => null);
  if (!form) throw new DomainError("ICON_FILE_REQUIRED", "بدنه درخواست خوانده نشد.");

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new DomainError("ICON_FILE_REQUIRED", "فایلی انتخاب نشده است.", { file: "یک فایل انتخاب کنید." });
  }

  if (file.size > MAX_ICON_FILE_SIZE_BYTES) {
    throw new DomainError("ICON_TOO_LARGE", "حجم فایل بیش از حد مجاز است.", {
      file: "حداکثر حجم مجاز ۲ مگابایت است.",
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const fields: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") fields[key] = value;
  }

  return { filename: file.name, declaredMimeType: file.type, size: bytes.length, bytes, fields };
}
