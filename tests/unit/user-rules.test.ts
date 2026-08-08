import { describe, expect, it } from "vitest";
import {
  canUserLogIn,
  deriveUserStatus,
  normalizeUsername,
  validateDisplayName,
  validatePassword,
  validateReason,
  validateUsername,
  wouldLeaveNoActiveAdmin,
  assertRolesNotEmpty,
} from "@/lib/domain/user-rules";

const D = new Date("2026-08-08T00:00:00Z");

describe("deriveUserStatus", () => {
  it("U-01: حذف‌شده بر همه چیز اولویت دارد", () => {
    expect(deriveUserStatus({ deletedAt: D, suspendedAt: D, isActive: false })).toBe("DELETED");
    expect(deriveUserStatus({ deletedAt: D, suspendedAt: null, isActive: true })).toBe("DELETED");
  });

  it("U-02: تعلیق بر غیرفعال اولویت دارد", () => {
    expect(deriveUserStatus({ deletedAt: null, suspendedAt: D, isActive: false })).toBe("SUSPENDED");
    expect(deriveUserStatus({ deletedAt: null, suspendedAt: D, isActive: true })).toBe("SUSPENDED");
  });

  it("U-03: فقط isActive=false یعنی غیرفعال", () => {
    expect(deriveUserStatus({ deletedAt: null, suspendedAt: null, isActive: false })).toBe("INACTIVE");
  });

  it("U-04: حالت پایه فعال است", () => {
    expect(deriveUserStatus({ deletedAt: null, suspendedAt: null, isActive: true })).toBe("ACTIVE");
  });

  it("U-05: تابع تام است — هر هشت ترکیب پرچم‌ها بدون خطا مقدار معتبر می‌دهد", () => {
    const valid = new Set(["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"]);
    for (const deletedAt of [null, D]) {
      for (const suspendedAt of [null, D]) {
        for (const isActive of [true, false]) {
          expect(valid.has(deriveUserStatus({ deletedAt, suspendedAt, isActive }))).toBe(true);
        }
      }
    }
  });

  it("U-05b: فقط کاربر فعال می‌تواند وارد شود", () => {
    expect(canUserLogIn({ deletedAt: null, suspendedAt: null, isActive: true })).toBe(true);
    expect(canUserLogIn({ deletedAt: null, suspendedAt: D, isActive: true })).toBe(false);
    expect(canUserLogIn({ deletedAt: D, suspendedAt: null, isActive: true })).toBe(false);
    expect(canUserLogIn({ deletedAt: null, suspendedAt: null, isActive: false })).toBe(false);
  });
});

describe("validateUsername", () => {
  it("U-06: قالب‌های معتبر پذیرفته می‌شوند", () => {
    expect(validateUsername("abc")).toBe("abc");
    expect(validateUsername("a_b-c.d")).toBe("a_b-c.d");
    expect(validateUsername("a".repeat(32))).toHaveLength(32);
    expect(validateUsername("  planner_01  ")).toBe("planner_01");
  });

  it("U-07: شروع با رقم رد می‌شود", () => {
    expect(() => validateUsername("1abc")).toThrowError(/نام کاربری/);
  });

  it("U-08: مرزهای طول", () => {
    expect(() => validateUsername("ab")).toThrow();
    expect(validateUsername("abc")).toBe("abc");
    expect(() => validateUsername("a".repeat(33))).toThrow();
  });

  it("U-09: فارسی و فاصله رد می‌شوند", () => {
    expect(() => validateUsername("کاربر")).toThrow();
    expect(() => validateUsername("a b")).toThrow();
    expect(() => validateUsername("a@b")).toThrow();
  });

  it("U-09b: نرمال‌سازی برای یکتایی بدون حساسیت به بزرگی حروف", () => {
    expect(normalizeUsername("  Planner1 ")).toBe("planner1");
  });
});

describe("validatePassword", () => {
  it("U-10: مرزهای طول", () => {
    expect(() => validatePassword("Abc1234", "u")).toThrow();
    expect(() => validatePassword("Abc12345", "u")).not.toThrow();
    expect(() => validatePassword(`A1${"x".repeat(126)}`, "u")).not.toThrow();
    expect(() => validatePassword(`A1${"x".repeat(127)}`, "u")).toThrow();
  });

  it("U-11: باید هم حرف و هم رقم داشته باشد", () => {
    expect(() => validatePassword("12345678", "u")).toThrow();
    expect(() => validatePassword("abcdefgh", "u")).toThrow();
  });

  it("U-12: نباید برابر نام کاربری باشد (بدون حساسیت به بزرگی حروف)", () => {
    expect(() => validatePassword("admin1ok", "Admin1OK")).toThrow();
  });
});

describe("validateDisplayName / validateReason", () => {
  it("نام نمایشی خالی به null تبدیل می‌شود", () => {
    expect(validateDisplayName(null)).toBeNull();
    expect(validateDisplayName("   ")).toBeNull();
  });

  it("نام نمایشی فارسی پذیرفته می‌شود", () => {
    expect(validateDisplayName(" زهرا محمدی ")).toBe("زهرا محمدی");
  });

  it("نام نمایشی بلندتر از ۶۴ رد می‌شود", () => {
    expect(() => validateDisplayName("م".repeat(65))).toThrow();
  });

  it("دلیل تعلیق مرزهای ۳ تا ۵۰۰ دارد", () => {
    expect(() => validateReason("ab", "suspensionReason")).toThrow();
    expect(validateReason("abc", "suspensionReason")).toBe("abc");
    expect(() => validateReason("x".repeat(501), "suspensionReason")).toThrow();
  });
});

describe("wouldLeaveNoActiveAdmin", () => {
  it("U-13: تنها مدیر، هدف عملیات", () => {
    expect(wouldLeaveNoActiveAdmin(["u1"], "u1", true)).toBe(true);
  });

  it("U-14: دو مدیر، یکی هدف", () => {
    expect(wouldLeaveNoActiveAdmin(["u1", "u2"], "u1", true)).toBe(false);
  });

  it("U-15: هدفِ غیرمدیر هرگز مانع نمی‌شود", () => {
    expect(wouldLeaveNoActiveAdmin(["u1"], "u2", false)).toBe(false);
  });

  it("U-16: مجموعه خالی — محمول وضعیت شکسته موجود را پنهان نمی‌کند", () => {
    expect(wouldLeaveNoActiveAdmin([], "u1", true)).toBe(false);
  });
});

describe("assertRolesNotEmpty", () => {
  it("فهرست خالی نقش رد می‌شود", () => {
    expect(() => assertRolesNotEmpty([])).toThrow();
    expect(() => assertRolesNotEmpty(["ADMIN"])).not.toThrow();
  });
});
