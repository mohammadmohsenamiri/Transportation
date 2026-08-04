# وضعیت فازهای پیاده‌سازی

آخرین به‌روزرسانی اولیه: 2026-08-04

| فاز | عنوان | وضعیت | یادداشت |
|---:|---|---|---|
| 0 | Bootstrap و قراردادهای پایه | NOT_STARTED | اولین فاز اجرایی |
| 1 | PostgreSQL، Auth، RBAC و Audit | NOT_STARTED | — |
| 2 | Design System و Shell | NOT_STARTED | — |
| 3 | ساختار سازمانی چهارسطحی | NOT_STARTED | — |
| 4 | Catalogها، خودرو و آیکن | NOT_STARTED | — |
| 5 | Provider نقشه و Map Foundation | NOT_STARTED | — |
| 6 | Route Management | NOT_STARTED | — |
| 7 | Shipment Management | NOT_STARTED | — |
| 8 | Mission Planning | NOT_STARTED | — |
| 9 | Position Engine و Time Reconstruction | NOT_STARTED | — |
| 10 | Map Operations Workspace | NOT_STARTED | — |
| 11 | Time Scrubber | NOT_STARTED | — |
| 12 | فرانمای وضعیت | NOT_STARTED | — |
| 13 | Hardening، عملیات و ظرفیت | NOT_STARTED | — |
| 14 | UAT و Release Candidate | NOT_STARTED | — |

## مقادیر مجاز وضعیت

- `NOT_STARTED`
- `IN_PROGRESS`
- `BLOCKED`
- `DONE`

## قالب به‌روزرسانی فاز

برای هر فاز، زیر جدول بخشی با موارد زیر اضافه شود:

```text
### Phase N — <title>
Status:
Started:
Completed:
Branch/PR/Commit:
Migrations:
Key files:
Tests executed:
Manual verification:
Known limitations:
Decisions added/changed:
```

فاز فقط پس از گذر از Definition of Done در `CLAUDE.md` به `DONE` تغییر می‌کند.
