"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { useMissionDetail } from "@/features/missions/use-mission-queries";
import { useActiveMapProvider } from "@/features/map/use-map-queries";
import { MissionWizard } from "@/features/missions/mission-wizard";
import { MissionHistory } from "@/features/missions/mission-history";
import { MissionCancelDialog } from "@/features/missions/mission-cancel-dialog";
import { MissionDuplicateDialog } from "@/features/missions/mission-duplicate-dialog";
import { missionDisplayStatusLabel, missionDisplayStatusTone } from "@/features/missions/status-labels";
import type { DrawPoint } from "@/features/routes/route-draw-map-inner";

const RouteDrawMapInner = dynamic(
  () => import("@/features/routes/route-draw-map-inner").then((mod) => mod.RouteDrawMapInner),
  { ssr: false, loading: () => <MapLoadingState /> },
);

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-text-muted)]">
      در حال بارگذاری نقشه...
    </div>
  );
}

function noop() {}

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes.toLocaleString("fa-IR")} دقیقه`;
  return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
}

export function MissionDetailView({ missionId, canManage }: { missionId: string; canManage: boolean }) {
  const router = useRouter();
  const { data: mission, isLoading, isError } = useMissionDetail(missionId);
  const providerQuery = useActiveMapProvider();

  const [editing, setEditing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  if (isLoading) return <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>;
  if (isError || !mission) return <p className="p-4 text-sm text-[var(--color-danger)]">مأموریت یافت نشد.</p>;

  if (editing) {
    return <MissionWizard editMission={mission} />;
  }

  const previewPoints: DrawPoint[] = [
    { sequence: 1, latitude: mission.originLatitude, longitude: mission.originLongitude, label: "مبدأ" },
    { sequence: 2, latitude: mission.destinationLatitude, longitude: mission.destinationLongitude, label: "مقصد" },
  ];

  const canCancel = mission.persistedStatus === "DRAFT" || mission.persistedStatus === "SCHEDULED";
  const canEdit = canManage && mission.persistedStatus === "DRAFT";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/missions"
            aria-label="بازگشت به فهرست مأموریت‌ها"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <Icon name="chevron-left" className="h-5 w-5 rotate-180" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="ltr-inline text-lg font-bold text-[var(--color-text)] sm:text-xl">{mission.code}</h1>
              <StatusBadge tone={missionDisplayStatusTone[mission.displayStatus]} label={missionDisplayStatusLabel[mission.displayStatus]} />
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {mission.originTitle} ← {mission.destinationTitle}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
              >
                <Icon name="pencil" className="h-4 w-4" />
                ویرایش
              </button>
            )}
            <button
              type="button"
              onClick={() => setDuplicateOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-sunken)]"
            >
              <Icon name="copy" className="h-4 w-4" />
              تکثیر
            </button>
            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-panel-border)] px-3 py-2 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
              >
                <Icon name="alert" className="h-4 w-4" />
                لغو مأموریت
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-3">
          <p className="text-xs text-[var(--color-text-muted)]">خودرو</p>
          <p className="ltr-inline mt-1 text-sm font-medium text-[var(--color-text)]">{mission.vehicleIdentifier}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-xs text-[var(--color-text-muted)]">زمان حرکت</p>
          <p className="tabular-nums mt-1 text-sm font-medium text-[var(--color-text)]">{new Date(mission.startAt).toLocaleString("fa-IR")}</p>
        </Panel>
        <Panel className="p-3">
          <p className="text-xs text-[var(--color-text-muted)]">فاصله / زمان سفر</p>
          <p className="tabular-nums mt-1 text-sm font-medium text-[var(--color-text)]">
            {formatKm(mission.distanceMeters)} · {formatDuration(mission.estimatedDurationSeconds)}
          </p>
        </Panel>
        <Panel className="p-3">
          <p className="text-xs text-[var(--color-text-muted)]">زمان تقریبی رسیدن</p>
          <p className="tabular-nums mt-1 text-sm font-medium text-[var(--color-text)]">{new Date(mission.estimatedArrivalAt).toLocaleString("fa-IR")}</p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Panel className="h-[320px] overflow-hidden sm:h-[380px]">
            {providerQuery.isLoading ? (
              <MapLoadingState />
            ) : !providerQuery.data ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
                Provider نقشه تنظیم نشده است.
              </div>
            ) : (
              <RouteDrawMapInner provider={providerQuery.data} points={previewPoints} editable={false} onMapClick={noop} onPointDragEnd={noop} onCenterChange={noop} />
            )}
          </Panel>

          <Panel className="p-4">
            <h2 className="text-sm font-bold text-[var(--color-text)]">مرسوله‌ها</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {mission.shipments.map((shipment) => (
                <li key={shipment.id} className="flex items-center justify-between rounded-xl border border-[var(--color-panel-border)] p-2.5 text-sm">
                  <span className="text-[var(--color-text)]">{shipment.title}</span>
                  <span className="ltr-inline text-xs text-[var(--color-text-muted)]">{shipment.trackingCode}</span>
                </li>
              ))}
              {mission.shipments.length === 0 && <li className="text-sm text-[var(--color-text-muted)]">مرسوله‌ای ثبت نشده است.</li>}
            </ul>
            {mission.notes && (
              <div className="mt-3">
                <p className="text-xs text-[var(--color-text-muted)]">توضیحات</p>
                <p className="mt-0.5 text-sm text-[var(--color-text)]">{mission.notes}</p>
              </div>
            )}
            {mission.cancellationReason && (
              <div className="mt-3 rounded-xl bg-[var(--color-danger-bg)] p-3">
                <p className="text-xs text-[var(--color-danger)]">دلیل لغو</p>
                <p className="mt-0.5 text-sm text-[var(--color-danger)]">{mission.cancellationReason}</p>
              </div>
            )}
          </Panel>
        </div>

        <Panel className="p-4">
          <h2 className="text-sm font-bold text-[var(--color-text)]">تاریخچه</h2>
          <div className="mt-3">
            <MissionHistory missionId={mission.id} />
          </div>
        </Panel>
      </div>

      <MissionCancelDialog
        missionId={mission.id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => setCancelOpen(false)}
      />
      <MissionDuplicateDialog
        missionId={mission.id}
        open={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={(newId) => {
          setDuplicateOpen(false);
          router.push(`/missions/${newId}`);
        }}
      />
    </div>
  );
}
