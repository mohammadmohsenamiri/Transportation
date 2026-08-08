interface AttemptRecord {
  count: number;
  windowStartedAt: number;
}

const attempts = new Map<string, AttemptRecord>();

const WINDOW_MS = 15 * 60 * 1000; // ۱۵ دقیقه
const MAX_ATTEMPTS = 10;

/**
 * محدودکننده نرخ درون‌حافظه‌ای برای تلاش ورود؛ per-process است و در پایان فرآیند پاک می‌شود.
 * برای استقرار چندنمونه‌ای (Phase 16) باید با یک store مشترک (DB/Redis) جایگزین شود.
 */
export function isRateLimited(key: string): boolean {
  const record = attempts.get(key);
  if (!record) return false;
  if (Date.now() - record.windowStartedAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.windowStartedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }
  record.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

const quotas = new Map<string, AttemptRecord>();

/**
 * Phase 14 — سهمیه نوشتن برای عملیات مدیریتی (SEC-16).
 *
 * جدا از شمارنده ورود نگه داشته می‌شود چون معنایش فرق دارد: آنجا «تلاش ناموفق» شمرده می‌شود،
 * اینجا *هر* نوشتن. یک بار فراخوانی، یک واحد مصرف می‌کند و `false` یعنی سهمیه تمام شده است.
 * مثل شمارنده ورود، per-process است و برای استقرار چندنمونه‌ای باید به store مشترک منتقل شود.
 */
export function consumeQuota(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const record = quotas.get(key);

  if (!record || now - record.windowStartedAt > windowMs) {
    quotas.set(key, { count: 1, windowStartedAt: now });
    return true;
  }

  if (record.count >= max) return false;
  record.count += 1;
  return true;
}

export function clearQuota(key: string): void {
  quotas.delete(key);
}
