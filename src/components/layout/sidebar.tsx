"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2.5 border-b border-[var(--color-panel-border)] px-4 py-4", collapsed && "justify-center px-2")}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
          <Icon name="logo" className="h-5.5 w-5.5" />
        </span>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-[var(--color-text)]">آرمان حمل</p>
            <p className="truncate text-[11px] text-[var(--color-text-muted)]">سامانه مدیریت حمل‌ونقل</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
        {navItems.map((item) => {
          const active = item.enabled && pathname?.startsWith(item.href);
          const content = (
            <>
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && !item.enabled && (
                <span className="ms-auto shrink-0 rounded-full bg-[var(--color-bg-sunken)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-subtle)]">
                  به‌زودی
                </span>
              )}
            </>
          );

          if (!item.enabled) {
            return (
              <div
                key={item.id}
                title="این بخش در فازهای بعدی پیاده‌سازی می‌شود"
                aria-disabled="true"
                className={cn(
                  "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-subtle)] opacity-60",
                  collapsed && "justify-center px-0",
                )}
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-[var(--color-primary-bg)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)] hover:text-[var(--color-text)]",
              )}
            >
              {content}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 border-t border-[var(--color-panel-border)] px-4 py-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <Icon name="chevron-down" className={cn("h-4 w-4 rotate-90 transition-transform", collapsed && "-rotate-90")} />
        {!collapsed && "جمع کردن منو"}
      </button>
    </aside>
  );
}

export function MobileSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="بستن منو"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-[var(--color-bg-elevated)] shadow-2xl">
        <SidebarContent collapsed={false} onNavigate={onClose} />
      </div>
    </div>
  );
}
