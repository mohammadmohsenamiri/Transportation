const filters = ["مبدأ", "مقصد", "نوع خودرو", "وضعیت نمایشی", "زمان شروع", "ETA"];

export function FilterBar() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <span
          key={filter}
          className="cursor-default rounded-full border border-[var(--color-panel-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
        >
          {filter}
        </span>
      ))}
      <span className="text-[11px] text-[var(--color-text-subtle)]">فیلترها در این پیش‌نمایش غیرفعال هستند</span>
    </div>
  );
}
