"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/icons";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="بستن"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] shadow-2xl
          sm:inset-y-0 sm:inset-x-auto sm:end-0 sm:top-0 sm:h-full sm:max-h-full sm:w-full sm:max-w-md sm:rounded-none sm:border-t-0 sm:border-s"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-panel-border)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-[var(--color-text)] sm:text-base">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)]"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-panel-border)] px-4 py-3 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function SheetTrigger({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--color-primary-foreground)]"
    >
      <Icon name="plus" className="h-4 w-4" />
      {children}
    </button>
  );
}
