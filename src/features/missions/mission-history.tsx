"use client";

import { useMissionHistory } from "@/features/missions/use-mission-queries";

const actionLabel: Record<string, string> = {
  "mission.created": "پیش‌نویس ایجاد شد",
  "mission.updated": "ویرایش شد",
  "mission.published": "منتشر شد",
  "mission.cancelled": "لغو شد",
  "mission.duplicated": "از مأموریت دیگری تکثیر شد",
  "mission.deleted": "حذف شد",
};

export function MissionHistory({ missionId }: { missionId: string }) {
  const { data, isLoading } = useMissionHistory(missionId);

  if (isLoading) {
    return <p className="text-xs text-[var(--color-text-muted)]">در حال بارگذاری تاریخچه...</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">هنوز رویدادی ثبت نشده است.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((entry) => (
        <li key={entry.id} className="flex items-start gap-2.5 text-xs">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
          <div>
            <p className="text-[var(--color-text)]">{actionLabel[entry.action] ?? entry.action}</p>
            <p className="tabular-nums ltr-inline mt-0.5 text-[var(--color-text-subtle)]">
              {new Date(entry.occurredAt).toLocaleString("fa-IR")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
