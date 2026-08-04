import { Icon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export interface HeaderUser {
  displayName: string;
  roleLabel: string;
  initials: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
  user: HeaderUser;
  logoutAction?: () => Promise<void>;
  showNotifications?: boolean;
  showClock?: boolean;
}

export function Header({
  onMenuClick,
  user,
  logoutAction,
  showNotifications = true,
  showClock = true,
}: HeaderProps) {
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
        {showClock && (
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-xs font-medium text-[var(--color-text)]">چهارشنبه ۲۴ اردیبهشت ۱۴۰۴</span>
            <span className="tabular-nums ltr-inline text-[11px] text-[var(--color-text-muted)]">۱۰:۳۰:۴۵</span>
          </div>
        )}

        <ThemeToggle />

        {showNotifications && (
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
        )}

        <div className="flex items-center gap-2 border-s border-[var(--color-panel-border)] ps-2 sm:ps-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-bg)] text-sm font-semibold text-[var(--color-primary)]">
            {user.initials}
          </span>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-xs font-semibold text-[var(--color-text)]">{user.displayName}</span>
            <span className="text-[11px] text-[var(--color-text-muted)]">{user.roleLabel}</span>
          </div>
          {logoutAction && (
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="خروج از حساب کاربری"
                title="خروج"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" aria-hidden="true">
                  <path
                    d="M15 17.25 20.25 12 15 6.75M20.25 12H9M9 3.75H5.25A1.5 1.5 0 0 0 3.75 5.25v13.5A1.5 1.5 0 0 0 5.25 20.25H9"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
