"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/panel";
import { formatJalaliDateTime } from "@/lib/dates/display";
import { useAuditActions, useAuditEntries } from "@/features/audit/use-audit-queries";
import { auditEntityLabel, type AuditEntry } from "@/features/audit/types";

const controlClass =
  "rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]";

const entityTypes = [
  "User",
  "IconAsset",
  "SystemSetting",
  "OrganizationUnit",
  "VehicleType",
  "Vehicle",
  "CargoType",
  "Shipment",
  "Mission",
  "Route",
  "MapProvider",
];

export function AuditLogView() {
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, isError } = useAuditEntries({ action, entityType, page });
  const { data: actions } = useAuditActions();

  const entries = data?.items ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          aria-label="پالایش بر اساس کنش"
          className={controlClass}
        >
          <option value="">همه کنش‌ها</option>
          {(actions ?? []).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={(event) => {
            setEntityType(event.target.value);
            setPage(1);
          }}
          aria-label="پالایش بر اساس نوع موجودیت"
          className={controlClass}
        >
          <option value="">همه موجودیت‌ها</option>
          {entityTypes.map((item) => (
            <option key={item} value={item}>
              {auditEntityLabel(item)}
            </option>
          ))}
        </select>
      </div>

      <Panel className="min-w-0 overflow-hidden">
        {isLoading && <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">در حال بارگذاری…</p>}
        {isError && <p className="p-6 text-center text-sm text-[var(--color-danger)]">گزارش تغییرات بارگذاری نشد.</p>}
        {!isLoading && !isError && entries.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">رویدادی با این شرایط ثبت نشده است.</p>
        )}

        {entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-start text-sm">
              <thead className="bg-[var(--color-bg-sunken)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">زمان</th>
                  <th className="px-4 py-3 text-start font-medium">کاربر</th>
                  <th className="px-4 py-3 text-start font-medium">کنش</th>
                  <th className="px-4 py-3 text-start font-medium">موجودیت</th>
                  <th className="px-4 py-3 text-start font-medium">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <AuditRow
                    key={entry.id}
                    entry={entry}
                    expanded={expanded === entry.id}
                    onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between gap-2 text-sm text-[var(--color-text-muted)]">
          <span>
            {data.total.toLocaleString("fa-IR")} رویداد — صفحه {page.toLocaleString("fa-IR")} از{" "}
            {totalPages.toLocaleString("fa-IR")}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="rounded-lg border border-[var(--color-panel-border)] px-3 py-1.5 disabled:opacity-40"
            >
              قبلی
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-[var(--color-panel-border)] px-3 py-1.5 disabled:opacity-40"
            >
              بعدی
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = entry.beforeJson !== null || entry.afterJson !== null;

  return (
    <>
      <tr className="border-t border-[var(--color-panel-border)]">
        <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">
          {formatJalaliDateTime(entry.occurredAt)}
        </td>
        <td className="px-4 py-3 text-[var(--color-text)]" dir="ltr">
          {entry.actorUsername ?? "—"}
        </td>
        <td className="px-4 py-3 text-[var(--color-text)]" dir="ltr">
          {entry.action}
        </td>
        <td className="px-4 py-3 text-[var(--color-text-muted)]">{auditEntityLabel(entry.entityType)}</td>
        <td className="px-4 py-3">
          {hasDetails ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              className="rounded-lg px-2 py-1 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]"
            >
              {expanded ? "بستن" : "نمایش"}
            </button>
          ) : (
            <span className="text-xs text-[var(--color-text-subtle)]">—</span>
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="border-t border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)]">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBlock title="پیش از تغییر" value={entry.beforeJson} />
              <DetailBlock title="پس از تغییر" value={entry.afterJson} />
            </div>
            {entry.ipAddress && (
              <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
                نشانی IP: <span dir="ltr">{entry.ipAddress}</span>
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function DetailBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[var(--color-text-muted)]">{title}</p>
      <pre
        dir="ltr"
        className="mt-1 max-h-48 overflow-auto rounded-lg bg-[var(--color-bg)] p-2 text-xs text-[var(--color-text)]"
      >
        {value === null || value === undefined ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
