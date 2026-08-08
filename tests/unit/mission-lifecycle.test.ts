import { describe, expect, it } from "vitest";
import {
  MISSION_TRANSITIONS,
  arrivalVarianceMinutes,
  assertTransitionAllowed,
  canTransition,
  nextVersion,
  resolveTargetStatus,
  validateCompletionTimes,
  validateFailureInput,
  validateNoteBody,
  validateReopenReason,
  type MissionAction,
} from "@/lib/domain/mission-lifecycle";
import {
  deriveMissionDisplayStatus,
  isTerminalPersistedStatus,
  type MissionPersistedStatus,
} from "@/lib/domain/mission-rules";
import { simulateMissionPosition } from "@/lib/domain/mission-simulation";
import { DomainError } from "@/lib/errors/domain-error";

const START = new Date("2026-08-01T06:00:00.000Z");
const ETA = new Date("2026-08-01T12:00:00.000Z");
const NOW = new Date("2026-08-01T18:00:00.000Z");

const ALL_STATUSES: MissionPersistedStatus[] = [
  "DRAFT",
  "SCHEDULED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "ARCHIVED",
];

const ALL_ACTIONS: MissionAction[] = [
  "publish",
  "cancel",
  "complete",
  "fail",
  "archive",
  "unarchive",
  "reopen",
  "softDelete",
];

function expectDomainError(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe(code);
    return;
  }
  throw new Error(`انتظار خطای ${code} می‌رفت ولی هیچ خطایی پرتاب نشد.`);
}

// ---------------------------------------------------------------------------
// L — جدول گذارها
// ---------------------------------------------------------------------------

describe("جدول گذارهای چرخه عمر مأموریت", () => {
  it("L-01: هر عملیات دقیقاً یک ردیف در جدول دارد", () => {
    for (const action of ALL_ACTIONS) {
      expect(MISSION_TRANSITIONS.filter((spec) => spec.action === action)).toHaveLength(1);
    }
    expect(MISSION_TRANSITIONS).toHaveLength(ALL_ACTIONS.length);
  });

  it("L-02: گذارهای مجاز طبق §۲٫۲ سند الزامات", () => {
    expect(canTransition("DRAFT", "publish")).toBe(true);
    expect(canTransition("DRAFT", "cancel")).toBe(true);
    expect(canTransition("SCHEDULED", "cancel")).toBe(true);
    expect(canTransition("SCHEDULED", "complete")).toBe(true);
    expect(canTransition("SCHEDULED", "fail")).toBe(true);
    expect(canTransition("COMPLETED", "archive")).toBe(true);
    expect(canTransition("FAILED", "archive")).toBe(true);
    expect(canTransition("CANCELLED", "archive")).toBe(true);
    expect(canTransition("ARCHIVED", "unarchive")).toBe(true);
    expect(canTransition("COMPLETED", "reopen")).toBe(true);
    expect(canTransition("FAILED", "reopen")).toBe(true);
    expect(canTransition("DRAFT", "softDelete")).toBe(true);
  });

  /** §۲٫۳ — هر کدام از این‌ها یک اشتباه عملیاتی واقعی است، نه یک حالت نظری. */
  it("L-03: گذارهای صراحتاً نامعتبر رد می‌شوند", () => {
    expect(canTransition("DRAFT", "complete")).toBe(false);
    expect(canTransition("COMPLETED", "complete")).toBe(false);
    expect(canTransition("CANCELLED", "fail")).toBe(false);
    expect(canTransition("CANCELLED", "reopen")).toBe(false);
    expect(canTransition("ARCHIVED", "reopen")).toBe(false);
    expect(canTransition("DRAFT", "archive")).toBe(false);
    expect(canTransition("SCHEDULED", "archive")).toBe(false);
    expect(canTransition("SCHEDULED", "publish")).toBe(false);
    expect(canTransition("COMPLETED", "publish")).toBe(false);
  });

  it("L-04: هر جفت (وضعیت، عملیات) خارج از جدول نامعتبر است — بررسی جامع", () => {
    for (const status of ALL_STATUSES) {
      for (const action of ALL_ACTIONS) {
        const spec = MISSION_TRANSITIONS.find((item) => item.action === action)!;
        expect(canTransition(status, action)).toBe(spec.from.includes(status));
      }
    }
  });

  it("L-05: assertTransitionAllowed خطای MISSION_INVALID_TRANSITION با نام فارسی وضعیت می‌دهد", () => {
    try {
      assertTransitionAllowed("CANCELLED", "reopen");
      throw new Error("باید خطا می‌داد");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe("MISSION_INVALID_TRANSITION");
      expect((error as DomainError).message).toContain("لغوشده");
    }
  });

  it("L-06: گذار مجاز خطا نمی‌دهد", () => {
    expect(() => assertTransitionAllowed("SCHEDULED", "complete")).not.toThrow();
  });
});

describe("تعیین وضعیت مقصد", () => {
  it("L-07: مقصد ثابت مستقیم از جدول می‌آید", () => {
    expect(resolveTargetStatus("complete", { persistedStatus: "SCHEDULED", statusBeforeArchive: null })).toBe(
      "COMPLETED",
    );
    expect(resolveTargetStatus("reopen", { persistedStatus: "FAILED", statusBeforeArchive: null })).toBe("SCHEDULED");
  });

  it("L-08: unarchive دقیقاً وضعیت پیش از بایگانی را برمی‌گرداند", () => {
    for (const previous of ["COMPLETED", "FAILED", "CANCELLED"] as const) {
      expect(resolveTargetStatus("unarchive", { persistedStatus: "ARCHIVED", statusBeforeArchive: previous })).toBe(
        previous,
      );
    }
  });

  it("L-09: unarchive بدون وضعیت ثبت‌شده پیشین رد می‌شود", () => {
    expectDomainError(
      () => resolveTargetStatus("unarchive", { persistedStatus: "ARCHIVED", statusBeforeArchive: null }),
      "MISSION_INVALID_TRANSITION",
    );
  });
});

// ---------------------------------------------------------------------------
// L — گاردهای زمان تکمیل
// ---------------------------------------------------------------------------

describe("گاردهای زمان تکمیل", () => {
  const mission = { startAt: START };

  it("LR-01: زمان رسیدن در آینده رد می‌شود", () => {
    expectDomainError(
      () => validateCompletionTimes(mission, { actualArrivalAt: new Date(NOW.getTime() + 1000) }, NOW),
      "MISSION_ARRIVAL_IN_FUTURE",
    );
  });

  it("E3: یک ثانیه در آینده هم رد می‌شود؛ دقیقاً «اکنون» پذیرفته می‌شود", () => {
    expect(() => validateCompletionTimes(mission, { actualArrivalAt: NOW }, NOW)).not.toThrow();
    expectDomainError(
      () => validateCompletionTimes(mission, { actualArrivalAt: new Date(NOW.getTime() + 1) }, NOW),
      "MISSION_ARRIVAL_IN_FUTURE",
    );
  });

  it("LR-02: رسیدن پیش از زمان شروع رد می‌شود", () => {
    expectDomainError(
      () => validateCompletionTimes(mission, { actualArrivalAt: new Date(START.getTime() - 1) }, NOW),
      "MISSION_ARRIVAL_BEFORE_START",
    );
  });

  it("E1: رسیدن دقیقاً برابر زمان شروع پذیرفته می‌شود (مقایسه ≥)", () => {
    expect(() => validateCompletionTimes(mission, { actualArrivalAt: START }, NOW)).not.toThrow();
  });

  /** LR-03 — مهم‌ترین قاعده این بخش: دیرکرد و زودکرد داده‌اند، نه خطا. */
  it("LR-03: رسیدن زودتر یا دیرتر از تخمین، هر دو پذیرفته می‌شوند", () => {
    const early = new Date(ETA.getTime() - 5 * 60 * 60 * 1000);
    const late = new Date(ETA.getTime() + 5 * 60 * 60 * 1000);
    expect(() => validateCompletionTimes(mission, { actualArrivalAt: early }, NOW)).not.toThrow();
    expect(() => validateCompletionTimes(mission, { actualArrivalAt: late }, NOW)).not.toThrow();
  });

  it("E2: رسیدن دقیقاً برابر تخمین پذیرفته می‌شود", () => {
    expect(() => validateCompletionTimes(mission, { actualArrivalAt: ETA }, NOW)).not.toThrow();
  });

  it("LR-04: زمان حرکت واقعی باید بین شروع و رسیدن باشد", () => {
    const arrival = new Date("2026-08-01T11:00:00.000Z");

    expect(() =>
      validateCompletionTimes(
        mission,
        { actualArrivalAt: arrival, actualDepartureAt: new Date("2026-08-01T07:00:00.000Z") },
        NOW,
      ),
    ).not.toThrow();

    expectDomainError(
      () =>
        validateCompletionTimes(
          mission,
          { actualArrivalAt: arrival, actualDepartureAt: new Date(START.getTime() - 1) },
          NOW,
        ),
      "MISSION_DEPARTURE_WINDOW_INVALID",
    );

    expectDomainError(
      () =>
        validateCompletionTimes(
          mission,
          { actualArrivalAt: arrival, actualDepartureAt: new Date(arrival.getTime() + 1) },
          NOW,
        ),
      "MISSION_DEPARTURE_WINDOW_INVALID",
    );
  });

  it("LR-04: مرزهای دقیق حرکت (برابر شروع و برابر رسیدن) پذیرفته می‌شوند", () => {
    const arrival = new Date("2026-08-01T11:00:00.000Z");
    expect(() =>
      validateCompletionTimes(mission, { actualArrivalAt: arrival, actualDepartureAt: START }, NOW),
    ).not.toThrow();
    expect(() =>
      validateCompletionTimes(mission, { actualArrivalAt: arrival, actualDepartureAt: arrival }, NOW),
    ).not.toThrow();
  });

  it("زمان حرکت اختیاری است", () => {
    expect(() => validateCompletionTimes(mission, { actualArrivalAt: ETA, actualDepartureAt: null }, NOW)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// L — گاردهای شکست و بازگشایی
// ---------------------------------------------------------------------------

describe("گاردهای شکست", () => {
  const mission = { startAt: START };
  const base = { failedAt: ETA, failureReason: "خرابی گیربکس در میانه مسیر", failureClassification: "VEHICLE_BREAKDOWN" as const };

  it("LR-06: زمان شکست در آینده یا پیش از شروع رد می‌شود", () => {
    expectDomainError(
      () => validateFailureInput(mission, { ...base, failedAt: new Date(NOW.getTime() + 1) }, NOW),
      "MISSION_FAILURE_TIME_IN_FUTURE",
    );
    expectDomainError(
      () => validateFailureInput(mission, { ...base, failedAt: new Date(START.getTime() - 1) }, NOW),
      "MISSION_FAILURE_BEFORE_START",
    );
  });

  it("LR-07: علت شکست باید ۳ تا ۵۰۰ نویسه باشد و trim شود", () => {
    expect(validateFailureInput(mission, { ...base, failureReason: "  خرابی موتور  " }, NOW)).toBe("خرابی موتور");
    expectDomainError(() => validateFailureInput(mission, { ...base, failureReason: "ab" }, NOW), "MISSION_REASON_INVALID");
    expectDomainError(
      () => validateFailureInput(mission, { ...base, failureReason: "x".repeat(501) }, NOW),
      "MISSION_REASON_INVALID",
    );
    expectDomainError(
      () => validateFailureInput(mission, { ...base, failureReason: "     " }, NOW),
      "MISSION_REASON_INVALID",
    );
  });

  it("LR-07: طبقه‌بندی خارج از مجموعه مجاز رد می‌شود", () => {
    expectDomainError(
      () =>
        validateFailureInput(
          mission,
          { ...base, failureClassification: "SOMETHING_ELSE" as never },
          NOW,
        ),
      "MISSION_FAILURE_CLASSIFICATION_INVALID",
    );
  });

  it("LR-11: دلیل بازگشایی همان قاعده طول را دارد", () => {
    expect(validateReopenReason("  تکمیل اشتباه ثبت شده بود  ")).toBe("تکمیل اشتباه ثبت شده بود");
    expectDomainError(() => validateReopenReason("ab"), "MISSION_REASON_INVALID");
  });

  it("V-10: بدنه یادداشت ۱ تا ۲۰۰۰ نویسه", () => {
    expect(validateNoteBody("  سلام  ")).toBe("سلام");
    expectDomainError(() => validateNoteBody("   "), "MISSION_NOTE_INVALID");
    expectDomainError(() => validateNoteBody("x".repeat(2001)), "MISSION_NOTE_INVALID");
  });
});

// ---------------------------------------------------------------------------
// D — وضعیت نمایشی
// ---------------------------------------------------------------------------

describe("اولویت وضعیت ثبت‌شده بر وضعیت ساعت‌محور", () => {
  const base = { startAt: START, estimatedArrivalAt: ETA };

  it("D-01: رفتار موجود برای SCHEDULED دست‌نخورده است", () => {
    expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "SCHEDULED" }, new Date(START.getTime() - 1))).toBe(
      "WAITING",
    );
    expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "SCHEDULED" }, START)).toBe("IN_PROGRESS");
    expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "SCHEDULED" }, ETA)).toBe("ARRIVED");
  });

  it("D-02: COMPLETED و FAILED در هر لحظه‌ای همان‌اند — مستقل از ساعت", () => {
    for (const viewTime of [new Date(START.getTime() - 86400000), START, ETA, NOW]) {
      expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "COMPLETED" }, viewTime)).toBe("COMPLETED");
      expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "FAILED" }, viewTime)).toBe("FAILED");
    }
  });

  /** E8 — دقیقاً موردی که کل فاز برای آن وجود دارد. */
  it("E8: مأموریتی که ساعتش «رسیده» می‌گفت ولی ناموفق ثبت شده، FAILED است", () => {
    const afterEta = new Date(ETA.getTime() + 3600000);
    expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "SCHEDULED" }, afterEta)).toBe("ARRIVED");
    expect(deriveMissionDisplayStatus({ ...base, persistedStatus: "FAILED" }, afterEta)).toBe("FAILED");
  });

  /** E12 — پیمایش خط زمان به گذشته وضعیت ثبت‌شده را عوض نمی‌کند. */
  it("E12: پیمایش خط زمان به پیش از رسیدن واقعی، همچنان COMPLETED می‌دهد", () => {
    expect(
      deriveMissionDisplayStatus({ ...base, persistedStatus: "COMPLETED" }, new Date(START.getTime() - 10000)),
    ).toBe("COMPLETED");
  });

  it("D-03: هر شش وضعیت ثبت‌شده خروجی معتبر می‌دهند و هرگز throw نمی‌کنند (I-13)", () => {
    for (const persistedStatus of ALL_STATUSES) {
      expect(() => deriveMissionDisplayStatus({ ...base, persistedStatus }, NOW)).not.toThrow();
    }
  });

  it("D-04: پیش‌بینی وضعیت‌های پایانی ثبت‌شده", () => {
    expect(isTerminalPersistedStatus("COMPLETED")).toBe(true);
    expect(isTerminalPersistedStatus("FAILED")).toBe(true);
    expect(isTerminalPersistedStatus("CANCELLED")).toBe(true);
    expect(isTerminalPersistedStatus("ARCHIVED")).toBe(true);
    expect(isTerminalPersistedStatus("DRAFT")).toBe(false);
    expect(isTerminalPersistedStatus("SCHEDULED")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S — انجماد شبیه‌سازی
// ---------------------------------------------------------------------------

describe("انجماد شبیه‌سازی برای وضعیت‌های پایانی تازه", () => {
  const snapshot = {
    startAt: START,
    estimatedArrivalAt: ETA,
    speedKmh: 60,
    cancelledAt: null,
    origin: { latitude: 35.7, longitude: 51.4 },
    destination: { latitude: 36.3, longitude: 52.0 },
  };

  it("SF-01: مأموریت تکمیل‌شده در زمان رسیدن واقعی منجمد می‌شود", () => {
    const actualArrivalAt = new Date("2026-08-01T09:00:00.000Z");
    const atFreeze = simulateMissionPosition(
      { ...snapshot, persistedStatus: "COMPLETED", actualArrivalAt },
      actualArrivalAt,
    );
    const muchLater = simulateMissionPosition(
      { ...snapshot, persistedStatus: "COMPLETED", actualArrivalAt },
      new Date(actualArrivalAt.getTime() + 10 * 3600000),
    );

    expect(muchLater.position).toEqual(atFreeze.position);
    expect(muchLater.status).toBe("COMPLETED");
  });

  it("SF-02: مأموریت ناموفق در زمان شکست منجمد می‌شود", () => {
    const failedAt = new Date("2026-08-01T08:00:00.000Z");
    const atFreeze = simulateMissionPosition({ ...snapshot, persistedStatus: "FAILED", failedAt }, failedAt);
    const muchLater = simulateMissionPosition(
      { ...snapshot, persistedStatus: "FAILED", failedAt },
      new Date(failedAt.getTime() + 10 * 3600000),
    );

    expect(muchLater.position).toEqual(atFreeze.position);
    expect(muchLater.status).toBe("FAILED");
  });

  it("SF-03: پیش از لحظه انجماد، موقعیت هنوز واقعی است — انجماد فقط سقف است نه ثابت", () => {
    const actualArrivalAt = new Date("2026-08-01T10:00:00.000Z");
    const early = simulateMissionPosition(
      { ...snapshot, persistedStatus: "COMPLETED", actualArrivalAt },
      new Date("2026-08-01T07:00:00.000Z"),
    );
    const atFreeze = simulateMissionPosition(
      { ...snapshot, persistedStatus: "COMPLETED", actualArrivalAt },
      actualArrivalAt,
    );
    expect(early.position).not.toEqual(atFreeze.position);
  });

  it("انجماد لغو (رفتار شیپ‌شده) دست‌نخورده است", () => {
    const cancelledAt = new Date("2026-08-01T08:30:00.000Z");
    const atFreeze = simulateMissionPosition({ ...snapshot, persistedStatus: "CANCELLED", cancelledAt }, cancelledAt);
    const later = simulateMissionPosition(
      { ...snapshot, persistedStatus: "CANCELLED", cancelledAt },
      new Date(cancelledAt.getTime() + 3600000),
    );
    expect(later.position).toEqual(atFreeze.position);
  });
});

// ---------------------------------------------------------------------------
// متفرقه
// ---------------------------------------------------------------------------

describe("توابع کمکی", () => {
  it("CC-01: نسخه دقیقاً یک واحد افزایش می‌یابد", () => {
    expect(nextVersion(0)).toBe(1);
    expect(nextVersion(41)).toBe(42);
  });

  it("اختلاف رسیدن: مثبت یعنی دیرکرد، منفی یعنی زودکرد، بدون رسیدن واقعی یعنی null", () => {
    expect(arrivalVarianceMinutes({ estimatedArrivalAt: ETA, actualArrivalAt: null })).toBeNull();
    expect(
      arrivalVarianceMinutes({ estimatedArrivalAt: ETA, actualArrivalAt: new Date(ETA.getTime() + 152 * 60000) }),
    ).toBe(152);
    expect(
      arrivalVarianceMinutes({ estimatedArrivalAt: ETA, actualArrivalAt: new Date(ETA.getTime() - 30 * 60000) }),
    ).toBe(-30);
    expect(arrivalVarianceMinutes({ estimatedArrivalAt: ETA, actualArrivalAt: ETA })).toBe(0);
  });
});
