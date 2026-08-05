"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SystemTab {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

const tabs: SystemTab[] = [
  { id: "organization", label: "ساختار سازمانی", href: "/system/organization", enabled: true },
  { id: "vehicles", label: "خودروها", href: "/system/vehicles", enabled: true },
  { id: "vehicle-types", label: "انواع خودرو", href: "/system/vehicle-types", enabled: true },
  { id: "cargo-types", label: "انواع بار", href: "/system/cargo-types", enabled: true },
  { id: "map-providers", label: "Provider نقشه", href: "/system/map-providers", enabled: true },
  { id: "icons", label: "آیکن‌ها", href: "#", enabled: false },
  { id: "users", label: "کاربران", href: "#", enabled: false },
  { id: "audit", label: "گزارش تغییرات", href: "#", enabled: false },
];

export function SystemTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-panel-border)]">
      {tabs.map((tab) => {
        if (!tab.enabled) {
          return (
            <span
              key={tab.id}
              title="این بخش در فازهای بعدی پیاده‌سازی می‌شود"
              aria-disabled="true"
              className="shrink-0 cursor-not-allowed rounded-t-lg px-3.5 py-2.5 text-sm text-[var(--color-text-subtle)] opacity-50"
            >
              {tab.label}
            </span>
          );
        }

        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "shrink-0 rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
