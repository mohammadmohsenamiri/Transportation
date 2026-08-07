"use client";

import { useSearchParams } from "next/navigation";

/**
 * Phase 13 — «بذر» اولیه یک فیلتر از query string، برای drill-down از فرانمای وضعیت.
 *
 * قرارداد عمداً یک‌طرفه و یک‌باره است:
 * - فقط به‌عنوان مقدار اولیه `useState` استفاده می‌شود، پس فقط در اولین رندر اثر دارد؛ تغییرات
 *   بعدی خود کاربر روی فیلتر هرگز بازنویسی نمی‌شوند.
 * - هیچ صفحه‌ای پس از تغییر فیلتر، URL را به‌روز نمی‌کند. این فاز فیلتر جدیدی اضافه نمی‌کند و
 *   رفتار موجود صفحات فهرست را تغییر نمی‌دهد؛ فقط راهی می‌دهد که KPI بتواند مقصد را از پیش تنظیم کند.
 * - مقدار خارج از allowlist بی‌صدا نادیده گرفته می‌شود (به «بدون فیلتر» برمی‌گردد) تا یک URL
 *   دست‌کاری‌شده هرگز به حالت نامعتبر UI منجر نشود.
 */
export function useSearchParamSeed<T extends string>(param: string, allowed: readonly T[]): T | "" {
  const searchParams = useSearchParams();
  const raw = searchParams.get(param);
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}
