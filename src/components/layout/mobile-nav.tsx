"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { mobileNavItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] pb-[env(safe-area-inset-bottom)] lg:hidden">
      {mobileNavItems.map((item) => {
        const active = item.enabled && pathname?.startsWith(item.href);
        const className = cn(
          "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
          item.enabled
            ? active
              ? "text-[var(--color-primary)]"
              : "text-[var(--color-text-muted)]"
            : "cursor-not-allowed text-[var(--color-text-subtle)] opacity-60",
        );

        if (!item.enabled) {
          return (
            <div key={item.id} className={className} aria-disabled="true" title="این بخش در فازهای بعدی پیاده‌سازی می‌شود">
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </div>
          );
        }

        return (
          <Link key={item.id} href={item.href} className={className}>
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
