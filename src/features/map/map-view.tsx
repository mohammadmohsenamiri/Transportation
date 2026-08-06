"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { Icon } from "@/components/ui/icons";
import { useActiveMapProvider, useOrgUnitsForMap } from "@/features/map/use-map-queries";
import { levelColor, levelDisplayLabel, levelOrder } from "@/features/map/level-styles";
import type { OrganizationLevelValue } from "@/features/organization/level-labels";
import type { OrgMapMarker } from "@/features/map/types";
import type { MapInteractionMode } from "@/features/map/maplibre-map-inner";
import { MissionMapCreatePanel, type MissionMapDestination } from "@/features/missions/mission-map-create-panel";

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

type PickStage = "origin" | "destination" | "details";

export interface MapViewProps {
  canCreateMission?: boolean;
}

export function MapView({ canCreateMission = false }: MapViewProps) {
  const router = useRouter();
  const providerQuery = useActiveMapProvider();
  const markersQuery = useOrgUnitsForMap();
  const [visibleLevels, setVisibleLevels] = useState<Set<OrganizationLevelValue>>(
    () => new Set(levelOrder),
  );
  const [tileDegraded, setTileDegraded] = useState(false);

  const [missionMode, setMissionMode] = useState(false);
  const [pickStage, setPickStage] = useState<PickStage>("origin");
  const [originMarker, setOriginMarker] = useState<OrgMapMarker | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<MissionMapDestination | null>(null);
  const [originSearch, setOriginSearch] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");

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

  const warehouseMatches = useMemo(() => {
    const warehouses = markers.filter((m) => m.level === "WAREHOUSE");
    if (!originSearch.trim()) return warehouses;
    const q = originSearch.trim().toLowerCase();
    return warehouses.filter((w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  }, [markers, originSearch]);

  function toggleLevel(level: OrganizationLevelValue) {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  function startMissionMode() {
    setMissionMode(true);
    setPickStage("origin");
    setOriginMarker(null);
    setDestinationPoint(null);
    setOriginSearch("");
    setManualLat("");
    setManualLng("");
  }

  function exitMissionMode() {
    setMissionMode(false);
  }

  function selectOrigin(marker: OrgMapMarker) {
    if (marker.level !== "WAREHOUSE") return;
    setOriginMarker(marker);
    setPickStage("destination");
  }

  function selectDestinationFromMarker(marker: OrgMapMarker) {
    setDestinationPoint({ organizationUnitId: marker.id, latitude: marker.latitude, longitude: marker.longitude, title: marker.name });
    setPickStage("details");
  }

  function selectDestinationFromMapPick(lngLat: { lat: number; lng: number }) {
    setDestinationPoint({ organizationUnitId: null, latitude: lngLat.lat, longitude: lngLat.lng, title: "نقطه انتخابی روی نقشه" });
    setPickStage("details");
  }

  function confirmManualDestination() {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    setDestinationPoint({ organizationUnitId: null, latitude: lat, longitude: lng, title: "مختصات واردشده" });
    setPickStage("details");
  }

  const interactionMode: MapInteractionMode = !missionMode || pickStage === "details" ? "view" : pickStage === "origin" ? "select-origin" : "select-destination";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)] sm:text-xl">نقشه عملیات</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            نمایش دفاتر و انبارهای ثبت‌شده روی نقشه داخلی سامانه
          </p>
        </div>
        {canCreateMission && !missionMode && (
          <button
            type="button"
            onClick={startMissionMode}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
          >
            <Icon name="missions" className="h-4 w-4" />
            ساخت مأموریت از نقشه
          </button>
        )}
        {missionMode && (
          <button
            type="button"
            onClick={exitMissionMode}
            className="rounded-xl border border-[var(--color-panel-border)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)]"
          >
            خروج از حالت ساخت مأموریت
          </button>
        )}
      </div>

      {!missionMode && (
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
      )}

      {missionMode && pickStage === "origin" && (
        <Panel className="p-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">مرحله ۱ از ۳ — انتخاب انبار مبدأ</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">روی یک marker انبار (سبز) روی نقشه Tap کنید یا از فهرست زیر جست‌وجو کنید.</p>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
            <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
            <input
              type="search"
              value={originSearch}
              onChange={(e) => setOriginSearch(e.target.value)}
              placeholder="جست‌وجوی انبار..."
              className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
            />
          </div>
          {warehouseMatches.length > 0 && (
            <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
              {warehouseMatches.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => selectOrigin(w)}
                    className="w-full rounded-lg px-2 py-1.5 text-start text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
                  >
                    {w.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {warehouseMatches.length === 0 && <p className="mt-2 text-xs text-[var(--color-text-muted)]">هیچ انباری یافت نشد.</p>}
        </Panel>
      )}

      {missionMode && pickStage === "destination" && (
        <Panel className="p-3">
          <p className="text-sm font-semibold text-[var(--color-text)]">مرحله ۲ از ۳ — انتخاب مقصد</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            روی نقطه دلخواه یا marker مقصد روی نقشه Tap کنید، یا مختصات را مستقیم وارد کنید. مبدأ: <span className="font-medium text-[var(--color-text)]">{originMarker?.name}</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-xs">
            <label className="text-xs font-medium text-[var(--color-text)]">
              عرض جغرافیایی
              <input value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs font-medium text-[var(--color-text)]">
              طول جغرافیایی
              <input value={manualLng} onChange={(e) => setManualLng(e.target.value)} className="ltr-inline mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-2 py-1.5 text-sm" />
            </label>
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={confirmManualDestination} className="rounded-xl border border-[var(--color-panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)]">
              تأیید مختصات
            </button>
            <button type="button" onClick={() => setPickStage("origin")} className="rounded-xl px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              بازگشت به انتخاب مبدأ
            </button>
          </div>
        </Panel>
      )}

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
              interactionMode={interactionMode}
              onMarkerSelect={pickStage === "origin" ? selectOrigin : pickStage === "destination" ? selectDestinationFromMarker : undefined}
              onMapPick={pickStage === "destination" ? selectDestinationFromMapPick : undefined}
              pinPoint={destinationPoint ? { latitude: destinationPoint.latitude, longitude: destinationPoint.longitude } : null}
            />
            {tileDegraded && (
              <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl bg-[var(--color-warning-bg)] px-3 py-2 text-xs text-[var(--color-warning)] shadow">
                بارگذاری برخی کاشی‌های نقشه ناموفق بود؛ Provider را از تنظیمات سامانه بررسی کنید.
              </div>
            )}
          </div>
        )}
      </Panel>

      {missionMode && pickStage === "details" && originMarker && destinationPoint && (
        <MissionMapCreatePanel
          origin={{ id: originMarker.id, name: originMarker.name, latitude: originMarker.latitude, longitude: originMarker.longitude }}
          destination={destinationPoint}
          onChangeOrigin={() => setPickStage("origin")}
          onChangeDestination={() => setPickStage("destination")}
          onClose={exitMissionMode}
          onCreated={(missionId) => router.push(`/missions/${missionId}`)}
        />
      )}

      {!missionMode && (
        <p className="text-xs text-[var(--color-text-subtle)]">
          موقعیت دفاتر و انبارها بر اساس مختصات ثبت‌شده در ساختار سازمانی است. برای مشاهده جزئیات هر نقطه روی آن ضربه بزنید یا کلیک کنید.
        </p>
      )}
    </div>
  );
}
