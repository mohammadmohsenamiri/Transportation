"use client";

import { useState } from "react";
import { DesktopSidebar, MobileSidebarDrawer } from "@/components/layout/sidebar";
import { Header, type HeaderUser } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-nav";
import { PreviewBanner } from "@/components/ui/preview-banner";
import type { NavItem } from "@/components/layout/nav-items";

interface AppShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  mobileNavItems: NavItem[];
  user: HeaderUser;
  showPreviewBanner?: boolean;
  logoutAction?: () => Promise<void>;
}

export function AppShell({
  children,
  navItems,
  mobileNavItems,
  user,
  showPreviewBanner = false,
  logoutAction,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <DesktopSidebar items={navItems} />
      <MobileSidebarDrawer items={navItems} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        {showPreviewBanner && <PreviewBanner />}
        <Header
          onMenuClick={() => setDrawerOpen(true)}
          user={user}
          logoutAction={logoutAction}
          showNotifications={showPreviewBanner}
          showClock={showPreviewBanner}
        />
        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
        <MobileBottomNav items={mobileNavItems} />
      </div>
    </div>
  );
}
