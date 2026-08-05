"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icons";
import { useActiveMapProvider, useOrgUnitsForMap } from "@/features/map/use-map-queries";
import { levelColor, levelDisplayLabel, levelOrder } from "@/features/map/level-styles";
import type { OrganizationLevelValue } from "@/features/organization/level-labels";

const MapLibreMapInner = dynamic(
  () => import("@/features/map/maplibre-map-inner").then((mod) => mod.MapLibreMapInner),
  { ssr: false, loading: () => <MapLoadingState /> },
);

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
      در حال بارگذاری نقشه...
    </div>
  );
}

function DegradedState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon name="alert" className="h-8 w-8 text-[var(--color-warning)]" />
      <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
      <p className="max-w-sm text-xs text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

export function MapView() {
  const providerQuery = useActiveMapProvider();
  const markersQuery = useOrgUnitsForMap();
  const [visibleLevels, setVisibleLevels] = useState<Set<OrganizationLevelValue>>(
    () => new Set(levelOrder),
  );
  const [tileDegraded, setTileDegraded] = useState(false);

  const markers = useMemo(() => markersQuery.data ?? [], [markersQuery.data]);
  const countByLevel = useMemo(() => {
    const counts: Record<OrganizationLevelValue, number> = {
      COUNTRY_OFFICE: 0,
      GROUP_OFFICE: 0,
      DISTRIBUTOR_OFFICE: 0,
      WAREHOUSE: 0,
    };
    for (const marker of markers) counts[marker.level] += 1;
    return counts;
  }, [markers]);

  function toggleLevel(level: OrganizationLevelValue) {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">نقشه عملیات</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          نمایش دفاتر و انبارهای ثبت‌شده روی نقشه داخلی سامانه
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {levelOrder.map((level) => {
          const active = visibleLevels.has(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              aria-pressed={active}
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium transition-opacity"
              style={{ opacity: active ? 1 : 0.4 }}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: levelColor[level] }} />
              {levelDisplayLabel[level]}
              <span className="tabular-nums text-[var(--color-text-subtle)]">({countByLevel[level]})</span>
            </button>
          );
        })}
      </div>

      <Panel className="h-[480px] overflow-hidden sm:h-[560px]">
        {providerQuery.isLoading || markersQuery.isLoading ? (
          <MapLoadingState />
        ) : providerQuery.isError || markersQuery.isError ? (
          <DegradedState
            title="بارگذاری داده نقشه ناموفق بود"
            description="در دریافت اطلاعات Provider نقشه یا گره‌های سازمانی خطایی رخ داد. لطفاً بعداً دوباره تلاش کنید."
          />
        ) : !providerQuery.data ? (
          <DegradedState
            title="Provider نقشه تنظیم نشده است"
            description="هیچ Provider نقشه فعالی ثبت نشده. یک Provider داخلی از «تنظیمات سامانه ← Provider نقشه» اضافه کنید."
          />
        ) : (
          <div className="relative h-full w-full">
            <MapLibreMapInner
              provider={providerQuery.data}
              markers={markers}
              visibleLevels={visibleLevels}
              onTileError={() => setTileDegraded(true)}
            />
            {tileDegraded && (
              <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)] shadow">
                بارگذاری برخی کاشی‌های نقشه ناموفق بود؛ Provider را از تنظیمات سامانه بررسی کنید.
              </div>
            )}
          </div>
        )}
      </Panel>

      <p className="text-xs text-[var(--color-text-subtle)]">
        موقعیت دفاتر و انبارها بر اساس مختصات ثبت‌شده در ساختار سازمانی است. برای مشاهده جزئیات هر نقطه روی آن ضربه بزنید یا کلیک کنید.
      </p>
    </div>
  );
}
