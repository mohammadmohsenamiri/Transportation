"use client";

import type { JalaliDateTime } from "@/lib/dates/jalali";
import type { Shipment } from "@/features/shipments/types";
import type { Vehicle } from "@/features/fleet/types";
import type { RouteSummary } from "@/features/routes/types";
import type { MissionEstimateResult } from "@/features/missions/types";

function formatKm(meters: number): string {
  return `${(meters / 1000).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} کیلومتر`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes.toLocaleString("fa-IR")} دقیقه`;
  return `${hours.toLocaleString("fa-IR")} ساعت و ${minutes.toLocaleString("fa-IR")} دقیقه`;
}

export interface ShipmentPickerListProps {
  shipments: Shipment[];
  selectedIds: string[];
  compatibleShipmentIds: Set<string>;
  onToggle: (shipmentId: string) => void;
}

export function ShipmentPickerList({ shipments, selectedIds, compatibleShipmentIds, onToggle }: ShipmentPickerListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {shipments.map((shipment) => {
        const isCompatible = compatibleShipmentIds.has(shipment.id);
        const checked = selectedIds.includes(shipment.id);
        return (
          <li key={shipment.id}>
            <label
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
                checked
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]"
                  : isCompatible
                    ? "border-[var(--color-panel-border)] hover:bg-[var(--color-bg-sunken)]"
                    : "border-[var(--color-panel-border)] opacity-40"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && !isCompatible}
                  onChange={() => onToggle(shipment.id)}
                  className="h-4 w-4 rounded"
                />
                <div>
                  <p className="font-medium text-[var(--color-text)]">{shipment.title}</p>
                  <p className="ltr-inline text-xs text-[var(--color-text-muted)]">{shipment.trackingCode}</p>
                </div>
              </div>
              <div className="text-end text-xs text-[var(--color-text-muted)]">
                <p>{shipment.originWarehouseName}</p>
                <p>← {shipment.destinationTitle}</p>
              </div>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export interface VehiclePickerListProps {
  vehicles: Vehicle[];
  selectedId: string;
  onSelect: (vehicleId: string) => void;
}

export function VehiclePickerList({ vehicles, selectedId, onSelect }: VehiclePickerListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {vehicles.map((vehicle) => (
        <li key={vehicle.id}>
          <label
            className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm ${
              selectedId === vehicle.id ? "border-[var(--color-primary)] bg-[var(--color-primary-bg)]" : "border-[var(--color-panel-border)] hover:bg-[var(--color-bg-sunken)]"
            }`}
          >
            <div className="flex items-center gap-3">
              <input type="radio" name="vehicle" checked={selectedId === vehicle.id} onChange={() => onSelect(vehicle.id)} className="h-4 w-4" />
              <div>
                <p className="ltr-inline font-medium text-[var(--color-text)]">{vehicle.identifier}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{vehicle.vehicleTypeName}</p>
              </div>
            </div>
            <p className="tabular-nums text-xs text-[var(--color-text-muted)]">{vehicle.avgSpeedKmh.toLocaleString("fa-IR")} km/h</p>
          </label>
        </li>
      ))}
    </ul>
  );
}

export interface RouteStepPanelProps {
  routes: RouteSummary[];
  routeId: string | null;
  onRouteChange: (routeId: string | null) => void;
  routeMismatch: { originDistance: number; destinationDistance: number } | null;
  toleranceAcknowledged: boolean;
  onToleranceChange: (acknowledged: boolean) => void;
}

export function RouteStepPanel({ routes, routeId, onRouteChange, routeMismatch, toleranceAcknowledged, onToleranceChange }: RouteStepPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-medium text-[var(--color-text)]">
        مسیر (اختیاری)
        <select
          value={routeId ?? ""}
          onChange={(e) => onRouteChange(e.target.value || null)}
          className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        >
          <option value="">بدون مسیر (خط مستقیم)</option>
          {routes.map((route) => (
            <option key={route.id} value={route.id}>
              {route.name} ({formatKm(route.totalDistanceMeters)})
            </option>
          ))}
        </select>
      </label>
      {routeMismatch && (
        <div className="rounded-xl bg-[var(--color-warning-bg)] p-3 text-xs text-[var(--color-warning)]">
          <p>
            ابتدا/انتهای مسیر انتخاب‌شده با مبدأ/مقصد مأموریت مطابقت ندارد (فاصله تا مبدأ: {formatKm(routeMismatch.originDistance)}، فاصله تا مقصد:{" "}
            {formatKm(routeMismatch.destinationDistance)}).
          </p>
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={toleranceAcknowledged} onChange={(e) => onToleranceChange(e.target.checked)} className="h-4 w-4 rounded" />
            با وجود این عدم تطابق ادامه می‌دهم.
          </label>
        </div>
      )}
    </div>
  );
}

export interface MissionReviewStepProps {
  origin: { title: string } | null;
  destination: { title: string } | null;
  vehicleIdentifier: string;
  startAt: JalaliDateTime;
  routeName: string | null;
  shipmentTitles: string[];
  notes: string;
  onNotesChange: (value: string) => void;
  estimate?: MissionEstimateResult;
  estimatePending: boolean;
  onRunEstimate: () => void;
  serverError: string | null;
}

export function MissionReviewStep({
  origin,
  destination,
  vehicleIdentifier,
  startAt,
  routeName,
  shipmentTitles,
  notes,
  onNotesChange,
  estimate,
  estimatePending,
  onRunEstimate,
  serverError,
}: MissionReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مرسوله‌ها</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{shipmentTitles.join("، ")}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مبدأ ← مقصد</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">
            {origin?.title} ← {destination?.title}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">خودرو</dt>
          <dd className="ltr-inline mt-0.5 text-[var(--color-text)]">{vehicleIdentifier}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">زمان حرکت</dt>
          <dd className="tabular-nums mt-0.5 text-[var(--color-text)]">
            {startAt.year}/{startAt.month}/{startAt.day} — {String(startAt.hour).padStart(2, "0")}:{String(startAt.minute).padStart(2, "0")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--color-text-muted)]">مسیر</dt>
          <dd className="mt-0.5 text-[var(--color-text)]">{routeName ?? "بدون مسیر (خط مستقیم)"}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-[var(--color-panel-border)] p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text)]">تخمین سفر</p>
          <button type="button" onClick={onRunEstimate} disabled={estimatePending} className="text-xs text-[var(--color-primary)] disabled:opacity-50">
            {estimatePending ? "در حال محاسبه..." : "محاسبه دوباره"}
          </button>
        </div>
        {estimate ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="tabular-nums text-lg font-bold text-[var(--color-text)]">{formatKm(estimate.distanceMeters)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">فاصله{estimate.isFallbackDirect ? " (خط مستقیم)" : ""}</p>
            </div>
            <div>
              <p className="tabular-nums text-lg font-bold text-[var(--color-text)]">{formatDuration(estimate.durationSeconds)}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">زمان سفر تقریبی</p>
            </div>
            <div>
              <p className="tabular-nums text-lg font-bold text-[var(--color-text)]">
                {estimate.estimatedFuelLiters !== null ? `${estimate.estimatedFuelLiters.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} L` : "—"}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">سوخت تقریبی</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">برای مشاهده تخمین، «محاسبه دوباره» را بزنید.</p>
        )}
      </div>

      <label className="text-xs font-medium text-[var(--color-text)]">
        توضیحات (اختیاری)
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-[var(--color-panel-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-text)]"
        />
      </label>

      {serverError && <p className="text-xs text-[var(--color-danger)]">{serverError}</p>}
    </div>
  );
}

export { formatKm, formatDuration };
