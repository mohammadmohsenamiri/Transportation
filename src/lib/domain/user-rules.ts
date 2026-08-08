import { DomainError } from "@/lib/errors/domain-error";

/**
 * Phase 14 — قواعد محض کاربر: وضعیت مشتق‌شده، اعتبارسنجی نام کاربری/رمز، و محمول «آخرین مدیر».
 *
 * بدون DB و بدون React تا مستقل آزمون‌پذیر بماند (CLAUDE.md §۲). بخش نژادیِ نگهبان آخرین مدیر
 * عمداً به‌صورت یک تابع محض روی مجموعه‌ی از پیش واکشی‌شده نوشته شده تا منطقش بدون پایگاه داده
 * آزمون شود؛ سریالی‌سازی واقعی (FOR UPDATE داخل تراکنش) کار لایه سرویس است.
 */

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";

export interface UserStatusInput {
  isActive: boolean;
  suspendedAt: Date | null;
  deletedAt: Date | null;
}

/**
 * وضعیت نمایشی کاربر — مشتق‌شده، نه ذخیره‌شده. ترتیب اهمیت دارد و اولین تطابق برنده است:
 * حذف‌شده بر تعلیق و تعلیق بر غیرفعال اولویت دارد.
 */
export function deriveUserStatus(user: UserStatusInput): UserStatus {
  if (user.deletedAt) return "DELETED";
  if (user.suspendedAt) return "SUSPENDED";
  if (!user.isActive) return "INACTIVE";
  return "ACTIVE";
}

/** فقط کاربر با وضعیت ACTIVE اجازه ورود دارد. */
export function canUserLogIn(user: UserStatusInput): boolean {
  return deriveUserStatus(user) === "ACTIVE";
}

// ---------------------------------------------------------------------------
// نام کاربری
// ---------------------------------------------------------------------------

/**
 * ۳ تا ۳۲ نویسه، شروع با حرف انگلیسی، فقط حرف/رقم/نقطه/خط‌تیره/زیرخط.
 * دلیل محدودیت به لاتین: نام کاربری در URL، لاگ و متن‌های LTR داخل رابط فارسی ظاهر می‌شود.
 */
const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{2,31}$/;

export function validateUsername(raw: string): string {
  const value = raw.trim();
  if (!USERNAME_PATTERN.test(value)) {
    throw new DomainError(
      "USER_USERNAME_INVALID",
      "نام کاربری باید ۳ تا ۳۲ نویسه باشد، با حرف انگلیسی شروع شود و فقط شامل حرف، رقم، نقطه، خط تیره و زیرخط باشد.",
      { username: "قالب نام کاربری نامعتبر است." },
    );
  }
  return value;
}

/** مقایسه یکتایی بدون حساسیت به بزرگی/کوچکی حروف (BR-U01). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// نام نمایشی
// ---------------------------------------------------------------------------

export function validateDisplayName(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const value = raw.trim();
  if (value.length === 0) return null;
  if (value.length > 64) {
    throw new DomainError("USER_DISPLAY_NAME_INVALID", "نام نمایشی نباید بیش از ۶۴ نویسه باشد.", {
      displayName: "نام نمایشی طولانی است.",
    });
  }
  return value;
}

// ---------------------------------------------------------------------------
// رمز عبور
// ---------------------------------------------------------------------------

/** حداقل ۸ — همان مقدار شیپ‌شده در changePasswordSchema؛ عمداً بالا برده نمی‌شود تا رمزهای موجود بی‌اعتبار نشوند. */
export const PASSWORD_MIN_LENGTH = 8;
/** سقف ۱۲۸ برای جلوگیری از DoS روی هزینه hash. */
export const PASSWORD_MAX_LENGTH = 128;

export function validatePassword(password: string, username: string): void {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new DomainError("USER_PASSWORD_WEAK", "رمز عبور باید بین ۸ تا ۱۲۸ نویسه باشد.", {
      password: "طول رمز عبور نامعتبر است.",
    });
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new DomainError("USER_PASSWORD_WEAK", "رمز عبور باید حداقل یک حرف و یک رقم داشته باشد.", {
      password: "رمز عبور باید حرف و رقم داشته باشد.",
    });
  }
  if (password.toLowerCase() === username.trim().toLowerCase()) {
    throw new DomainError("USER_PASSWORD_WEAK", "رمز عبور نمی‌تواند برابر نام کاربری باشد.", {
      password: "رمز عبور نباید همان نام کاربری باشد.",
    });
  }
}

// ---------------------------------------------------------------------------
// دلیل تعلیق / بازگشایی
// ---------------------------------------------------------------------------

export function validateReason(raw: string, field: "suspensionReason"): string {
  const value = raw.trim();
  if (value.length < 3 || value.length > 500) {
    throw new DomainError("USER_SUSPENSION_REASON_REQUIRED", "دلیل باید بین ۳ تا ۵۰۰ نویسه باشد.", {
      [field]: "دلیل الزامی است و باید بین ۳ تا ۵۰۰ نویسه باشد.",
    });
  }
  return value;
}

// ---------------------------------------------------------------------------
// نگهبان آخرین مدیر
// ---------------------------------------------------------------------------

/**
 * آیا این عملیات آخرین مدیرِ فعال را از دست می‌دهد؟
 *
 * محض و روی مجموعه‌ی از پیش واکشی‌شده کار می‌کند. لایه سرویس موظف است این بررسی را *داخل*
 * تراکنش و پس از اعمال تغییر، با قفل FOR UPDATE تکرار کند؛ بررسی پیش از تراکنش نژادی است و
 * دقیقاً همان شکستی را ممکن می‌کند که این قاعده برای جلوگیری از آن وجود دارد (BR-U08).
 */
export function wouldLeaveNoActiveAdmin(
  activeAdminIds: readonly string[],
  targetUserId: string,
  targetIsAdmin: boolean,
): boolean {
  if (!targetIsAdmin) return false;
  return activeAdminIds.length === 1 && activeAdminIds[0] === targetUserId;
}

export function assertRolesNotEmpty(roles: readonly string[]): void {
  if (roles.length === 0) {
    throw new DomainError("USER_ROLES_REQUIRED", "هر کاربر باید حداقل یک نقش داشته باشد.", {
      roles: "حداقل یک نقش انتخاب کنید.",
    });
  }
}
