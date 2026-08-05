"use client";

import { useShipmentHistory } from "@/features/shipments/use-shipment-queries";

const actionLabel: Record<string, string> = {
  "shipment.created": "ایجاد شد",
  "shipment.updated": "ویرایش شد",
  "shipment.deleted": "حذف شد",
};

export function ShipmentHistory({ shipmentId }: { shipmentId: string }) {
  const { data, isLoading } = useShipmentHistory(shipmentId);

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
