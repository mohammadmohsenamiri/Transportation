import { NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/lib/http/api-auth";
import { RoleCode } from "@/lib/permissions/roles";
import {
  archiveMission,
  completeMission,
  failMission,
  reopenMission,
  unarchiveMission,
  type MissionDTO,
} from "@/server/services/mission-service";
import {
  completeMissionSchema,
  failMissionSchema,
  missionVersionOnlySchema,
  reopenMissionSchema,
} from "@/lib/validation/mission-lifecycle";
import { missionLifecycleErrorResponse, missionValidationErrorResponse } from "@/lib/http/mission-errors";
import { DomainError } from "@/lib/errors/domain-error";

/**
 * Phase 15 — بدنه مشترک پنج route گذار چرخه عمر.
 *
 * هر پنج مسیر شکل یکسانی دارند: گیت نقش پیش از خواندن بدنه، سپس Zod، سپس سرویس. نگه‌داشتن آن
 * در یک جا مانع از این می‌شود که یکی از آن‌ها به‌مرور گیت نقش یا اعتبارسنجی نسخه را از دست بدهد.
 *
 * **مجاز: `ADMIN` و `MISSION_PLANNER`** (ADR-P15-06). `STATUS_VIEWER` سمت سرور رد می‌شود، نه فقط
 * با پنهان‌کردن دکمه — پنهان‌کردن UI هیچ‌گاه کنترل امنیتی حساب نمی‌شود.
 */
const LIFECYCLE_ROLES = [RoleCode.ADMIN, RoleCode.MISSION_PLANNER];

export type LifecycleAction = "complete" | "fail" | "archive" | "unarchive" | "reopen";

export function createMissionTransitionHandler(action: LifecycleAction) {
  return async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ): Promise<NextResponse> {
    const result = await requireActor(LIFECYCLE_ROLES);
    if ("response" in result) return result.response;

    const { id } = await params;
    const body = await request.json().catch(() => null);

    try {
      return NextResponse.json(await dispatch(action, id, body, result.actor));
    } catch (error) {
      if (error instanceof DomainError) return missionLifecycleErrorResponse(error);
      if (error instanceof ValidationSignal) return error.response;
      throw error;
    }
  };
}

/** حامل پاسخ ۴۲۲ از دل `dispatch` تا مرز route، بدون تکرار try/catch در هر شاخه. */
class ValidationSignal extends Error {
  constructor(readonly response: NextResponse) {
    super("validation");
  }
}

async function dispatch(
  action: LifecycleAction,
  id: string,
  body: unknown,
  actor: Parameters<typeof completeMission>[2],
): Promise<MissionDTO> {
  if (action === "complete") {
    const parsed = completeMissionSchema.safeParse(body);
    if (!parsed.success) throw new ValidationSignal(missionValidationErrorResponse(parsed.error));
    return completeMission(
      id,
      {
        version: parsed.data.version,
        actualArrivalAt: new Date(parsed.data.actualArrivalAt),
        actualDepartureAt: parsed.data.actualDepartureAt ? new Date(parsed.data.actualDepartureAt) : null,
      },
      actor,
    );
  }

  if (action === "fail") {
    const parsed = failMissionSchema.safeParse(body);
    if (!parsed.success) throw new ValidationSignal(missionValidationErrorResponse(parsed.error));
    return failMission(
      id,
      {
        version: parsed.data.version,
        failedAt: new Date(parsed.data.failedAt),
        failureReason: parsed.data.failureReason,
        failureClassification: parsed.data.failureClassification,
      },
      actor,
    );
  }

  if (action === "reopen") {
    const parsed = reopenMissionSchema.safeParse(body);
    if (!parsed.success) throw new ValidationSignal(missionValidationErrorResponse(parsed.error));
    return reopenMission(id, { version: parsed.data.version, reopenReason: parsed.data.reopenReason }, actor);
  }

  const parsed = missionVersionOnlySchema.safeParse(body);
  if (!parsed.success) throw new ValidationSignal(missionValidationErrorResponse(parsed.error));
  return action === "archive"
    ? archiveMission(id, parsed.data.version, actor)
    : unarchiveMission(id, parsed.data.version, actor);
}
