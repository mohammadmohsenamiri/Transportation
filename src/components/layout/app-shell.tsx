"use client";

import { useState } from "react";
import { DesktopSidebar, MobileSidebarDrawer } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileBottomNav } from "@/components/layout/mobile-nav";
import { PreviewBanner } from "@/components/ui/preview-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <DesktopSidebar />
      <MobileSidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <PreviewBanner />
        <Header onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 px-3 py-4 sm:px-5 sm:py-6">{children}</main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
