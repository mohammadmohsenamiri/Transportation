import { Icon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="flex items-center gap-3 border-b border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] px-3 py-2.5 sm:px-5">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="باز کردن منو"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-sunken)] lg:hidden"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2 sm:flex">
        <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
        <input
          type="search"
          placeholder="جست‌وجو در مأموریت‌ها، مرسوله‌ها، خودروها و ..."
          className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
        />
      </div>

      <div className="ms-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-xs font-medium text-[var(--color-text)]">چهارشنبه ۲۴ اردیبهشت ۱۴۰۴</span>
          <span className="tabular-nums ltr-inline text-[11px] text-[var(--color-text-muted)]">۱۰:۳۰:۴۵</span>
        </div>

        <ThemeToggle />

        <button
          type="button"
          aria-label="اعلان‌ها"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          <Icon name="bell" className="h-4.5 w-4.5" />
          <span className="tabular-nums absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white">
            ۷
          </span>
        </button>

        <div className="flex items-center gap-2 border-s border-[var(--color-panel-border)] ps-2 sm:ps-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-bg)] text-sm font-semibold text-[var(--color-primary)]">
            م‌ا
          </span>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-xs font-semibold text-[var(--color-text)]">مهدی احمدی</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">مدیر عملیات</span>
          </div>
        </div>
      </div>
    </header>
  );
}
