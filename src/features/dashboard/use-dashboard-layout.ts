"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DASHBOARD_WIDGET_IDS,
  DEFAULT_WIDGET_ORDER,
  type DashboardWidgetId,
} from "@/features/dashboard/widget-catalog";

/**
 * Phase 13 — چیدمان فرانما (ترتیب و نمایان‌بودن widgetها).
 *
 * تصمیم persist طبق ADR-029: *چیدمان* در `localStorage` بین نشست‌ها می‌ماند (دقیقاً مثل theme)،
 * چون یک ترجیح نمایشی محض است و هیچ ریسک کهنگی داده ندارد. در مقابل، *بازه زمانی و حالت
 * زنده/تاریخی* عمداً persist نمی‌شوند و همیشه به «زنده» برمی‌گردند — همان استدلال ADR-028 برای
 * موتور زمان‌بندی: اپراتور هرگز نباید بی‌صدا روی داده تاریخی نشست قبل بماند.
 *
 * پیاده‌سازی با `useSyncExternalStore` است، نه `useState` + `useEffect`: خواندن `localStorage`
 * در بدنه effect هم قانون `react-hooks/set-state-in-effect` را نقض می‌کند و هم بین SSR و
 * hydration ناسازگاری می‌سازد. `getServerSnapshot` مقدار پیش‌فرض را می‌دهد و React پس از
 * hydration خودش با مقدار واقعی دوباره رندر می‌کند.
 */

const STORAGE_KEY = "armanhaml-dashboard-layout";
const LAYOUT_VERSION = 1;

export interface DashboardLayout {
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
}

interface StoredLayout {
  version: number;
  order: string[];
  hidden: string[];
}

const DEFAULT_LAYOUT: DashboardLayout = Object.freeze({
  order: [...DEFAULT_WIDGET_ORDER],
  hidden: [],
}) as DashboardLayout;

function isKnownWidget(id: string): id is DashboardWidgetId {
  return (DASHBOARD_WIDGET_IDS as readonly string[]).includes(id);
}

/**
 * چیدمان ذخیره‌شده را با فهرست فعلی widgetها آشتی می‌دهد:
 * شناسه‌های ناشناس (widget حذف‌شده) دور ریخته و widgetهای جدیدِ افزوده‌شده در نسخه بعدی برنامه
 * به انتهای ترتیب الحاق می‌شوند. بنابراین ارتقای نسخه هرگز چیدمان کاربر را خراب نمی‌کند.
 */
export function reconcileLayout(stored: Partial<StoredLayout> | null): DashboardLayout {
  if (!stored || stored.version !== LAYOUT_VERSION) return DEFAULT_LAYOUT;

  const storedOrder = Array.isArray(stored.order) ? stored.order.filter(isKnownWidget) : [];
  const seen = new Set(storedOrder);
  const order = [...storedOrder, ...DEFAULT_WIDGET_ORDER.filter((id) => !seen.has(id))];
  const hidden = Array.isArray(stored.hidden) ? stored.hidden.filter(isKnownWidget) : [];

  return { order, hidden };
}

// ---------------------------------------------------------------------------
// external store
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

// snapshot باید referentially stable باشد وگرنه useSyncExternalStore حلقه بی‌نهایت می‌سازد؛
// بنابراین نتیجه parse بر اساس رشته خام cache می‌شود و فقط با تغییر واقعی رشته دوباره ساخته می‌شود.
let cachedRaw: string | null = null;
let cachedLayout: DashboardLayout = DEFAULT_LAYOUT;

function readLayout(): DashboardLayout {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // حالت‌هایی مثل مرورگر با storage غیرفعال یا حالت ناشناس محدود — به پیش‌فرض برمی‌گردیم.
    return DEFAULT_LAYOUT;
  }

  if (raw === cachedRaw) return cachedLayout;
  cachedRaw = raw;

  if (!raw) {
    cachedLayout = DEFAULT_LAYOUT;
    return cachedLayout;
  }

  try {
    cachedLayout = reconcileLayout(JSON.parse(raw) as Partial<StoredLayout>);
  } catch {
    cachedLayout = DEFAULT_LAYOUT;
  }
  return cachedLayout;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeLayout(next: DashboardLayout) {
  try {
    const payload: StoredLayout = { version: LAYOUT_VERSION, order: next.order, hidden: next.hidden };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // نوشتن ناموفق (سهمیه پر یا storage غیرفعال) نباید فرانما را از کار بیندازد؛ تغییر فقط
    // ماندگار نمی‌شود. cache را هم‌زمان به‌روز می‌کنیم تا UI همان نشست پاسخگو بماند.
  }
  cachedRaw = null;
  cachedLayout = next;
  listeners.forEach((listener) => listener());
}

function getServerSnapshot(): DashboardLayout {
  return DEFAULT_LAYOUT;
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export interface DashboardLayoutController {
  layout: DashboardLayout;
  /** widgetهای نمایان، به ترتیب چیدمان کاربر. */
  visibleWidgets: DashboardWidgetId[];
  isHidden: (id: DashboardWidgetId) => boolean;
  toggleVisibility: (id: DashboardWidgetId) => void;
  moveEarlier: (id: DashboardWidgetId) => void;
  moveLater: (id: DashboardWidgetId) => void;
  reset: () => void;
  isCustomized: boolean;
}

export function useDashboardLayout(): DashboardLayoutController {
  const layout = useSyncExternalStore(subscribe, readLayout, getServerSnapshot);

  const toggleVisibility = useCallback(
    (id: DashboardWidgetId) => {
      const hidden = layout.hidden.includes(id)
        ? layout.hidden.filter((widget) => widget !== id)
        : [...layout.hidden, id];
      writeLayout({ order: layout.order, hidden });
    },
    [layout],
  );

  const move = useCallback(
    (id: DashboardWidgetId, delta: number) => {
      const index = layout.order.indexOf(id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= layout.order.length) return;
      const order = [...layout.order];
      [order[index], order[target]] = [order[target], order[index]];
      writeLayout({ order, hidden: layout.hidden });
    },
    [layout],
  );

  const moveEarlier = useCallback((id: DashboardWidgetId) => move(id, -1), [move]);
  const moveLater = useCallback((id: DashboardWidgetId) => move(id, 1), [move]);

  const reset = useCallback(() => {
    writeLayout({ order: [...DEFAULT_WIDGET_ORDER], hidden: [] });
  }, []);

  const isCustomized =
    layout.hidden.length > 0 || layout.order.some((id, index) => id !== DEFAULT_WIDGET_ORDER[index]);

  return {
    layout,
    visibleWidgets: layout.order.filter((id) => !layout.hidden.includes(id)),
    isHidden: (id) => layout.hidden.includes(id),
    toggleVisibility,
    moveEarlier,
    moveLater,
    reset,
    isCustomized,
  };
}
