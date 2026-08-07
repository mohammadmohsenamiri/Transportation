# Phase 13 — Situation Dashboard — Pre-Implementation Dependency Review

**Post-implementation notice:** the product owner requested direct implementation before any numbered pack document was written, so this review is the **only** planning artifact for Phase 13 — no `00-README.md` … `13-PROMPT.md` were ever produced. Phase 13 shipped based on this document plus the existing binding docs (`docs/IMPLEMENTATION_PLAN.md` Phase 13, `docs/PROJECT_SPEC.md` §11, `docs/UX_MAP_AND_DESIGN_SYSTEM.md` §5). Every resolution recorded below was carried into the implementation and is restated formally as **ADR-029** in `docs/DECISIONS.md`; see `docs/PHASE_STATUS.md` Phase 13 for what was actually built. This directory is a historical record, not a complete binding spec.

**Status: Review artifact, produced before `00-README.md`.** This document is not part of the numbered 16-document pack; it is the architect's audit of the existing codebase that the pack's decisions are grounded in, per the explicit request that opened this thread. Every gap found here gets a decisive resolution — not an open question — so the implementation engineer never has to re-derive it.

Reviewed sources: `docs/IMPLEMENTATION_PLAN.md` (Phase 13 section), `docs/PROJECT_SPEC.md` (§9, §11, §12), `docs/UX_MAP_AND_DESIGN_SYSTEM.md` (§1–§4, §5 "فرانمای وضعیت", §10, §11), `docs/DECISIONS.md` (all ADRs), `docs/PHASE_STATUS.md`, `docs/phase-09-simulation-engine/00-README.md`, `docs/phase-10-operational-map/00-README.md`, `docs/phase-11-interaction-layer/00-README.md`, `docs/phase-12-timeline-engine/00-README.md`, plus the live source tree (`src/server/services/*`, `src/app/api/v1/**/summary/route.ts`, `src/lib/domain/mission-rules.ts`, `src/lib/domain/mission-simulation.ts`, `src/features/map/*`, `src/features/missions/*`, `src/features/shipments/*`, `src/features/fleet/*`, `src/components/ui/kpi-card.tsx`, `src/app/globals.css`, `prisma/schema.prisma`).

---

## 1. Terminology cross-check

| Term (binding source) | Status |
|---|---|
| "فرانمای وضعیت" = Situation/Status Overview, `/dashboard` (`UX_MAP_AND_DESIGN_SYSTEM.md` §11, §5) | Confirmed, use verbatim as the page title. |
| "نمای پایش" for Map | **Stale.** ADR-025 kept the shipped title "نقشه عملیات" instead. Any dashboard copy or drill-down label that names the map must say **"نقشه عملیات"**, never "نمای پایش". |
| "نمای زنده محاسباتی" / "بازسازی زمانی" (Live / Historical, `UX_MAP_AND_DESIGN_SYSTEM.md` §11, shipped in Phase 10–12) | Confirmed, reuse verbatim for dashboard Live/Historical badge — do not invent new wording. `CLAUDE.md` §5 explicitly bans "موقعیت زنده"/"live position" framing; the same restraint applies to any dashboard copy describing computed statistics ("آخرین محاسبه" / "به‌روزرسانی خودکار", never "زنده" alone without qualifier). |
| Mission status vocabulary | **Two parallel vocabularies exist — see §3.2.** Must be disambiguated per-widget in `03-DOMAIN.md`. |
| "آماده به کار" / "خارج از سرویس" (Vehicle readiness, `UX_MAP_AND_DESIGN_SYSTEM.md` §11) | Confirmed labels for `VehicleReadiness` (`READY` / `OUT_OF_SERVICE`, only two values — no "in-mission" readiness state exists in the schema; see §3.4). |
| "دفتر" (Office) / "انبار" (Warehouse) | `OrganizationLevel` = `COUNTRY_OFFICE` | `GROUP_OFFICE` | `DISTRIBUTOR_OFFICE` | `WAREHOUSE`, labels in `src/features/organization/level-labels.ts`. "Office Summary" (user's feature list) = the three office levels combined or broken out; "Warehouse Summary" = `WAREHOUSE` only. Must be spelled out explicitly — no service aggregates by level today (§3.5). |

## 2. Design-system audit (grounds §"Dashboard Design Requirements")

- **Design tokens already exist and are theme-complete**: `src/app/globals.css` defines `--color-bg`, `--color-panel`, `--color-panel-border`, `--color-panel-glow`, `--color-text[-muted|-subtle]`, `--color-primary[-foreground]`, `--color-accent`, and six semantic tones (`success`/`warning`/`danger`/`info`/`purple`/`primary`) each with a `-bg` wash variant, for both `:root` (light) and `:root[data-theme="dark"]`. **The pack must mandate exclusive reuse of these tokens — zero new hardcoded colors** — the same rule already followed by every prior phase.
- **`--color-panel-glow` already exists and is unused by any shipped component.** This is the project's own reserved hook for the "glow" effect `UX_MAP_AND_DESIGN_SYSTEM.md` §1 calls for ("پنل‌های لایه‌ای با عمق ظریف... و glow محدود"). The dashboard is the natural first consumer.
- **Glass morphism is asymmetric between themes as currently defined**: dark mode's `--color-panel` is already a translucent `rgba(17, 25, 45, 0.72)` (blur-ready); light mode's `--color-panel` is opaque `#ffffff`. A literal "glass" treatment cannot be theme-symmetric without either (a) making light-mode panels translucent too (readability risk over a light `--color-bg`) or (b) treating "glass" as a dark-mode-forward aesthetic and giving light mode a flatter "modern, not glassy" card treatment. **This is resolved as ADR-P13 in the pack — not left open** (see `04-ARCHITECTURE.md` when written).
- **`KpiCard` (`src/components/ui/kpi-card.tsx`) already exists**, already token-driven, already has a `tone` system and a unit test (`tests/unit/kpi-card.test.tsx`). It currently binds to `KpiFixture` from `src/demo/fixtures.ts` (Phase 0 prototype data). **Reuse-and-generalize, not rebuild**: the pack must specify widening its prop type to a real DTO shape while preserving the exact rendered markup/classes so the existing unit test's assertions on label/value text remain valid in spirit.
- **`prefers-reduced-motion` is already handled globally** (`globals.css` lines 164–174) — any dashboard-specific animation (counter count-up, skeleton shimmer, widget transitions) inherits this for free as long as it uses standard CSS `animation`/`transition`, not JS-driven motion that ignores the media query.
- **No chart library is installed** (`package.json` has no `recharts`/`d3`/`victory`/etc.), consistent with `CLAUDE.md`'s no-CDN, no-unnecessary-dependency rule. **Charts must be hand-built inline SVG components** (the same approach already used for `src/components/ui/icons.tsx`), not a new npm dependency.
- **No dashboard-relevant icons exist yet** (`refresh`, `chart-bar`/`chart-pie`, `grid`/`layout`, `expand`, `warehouse`/`office` distinct from the generic `organization` icon). New icon names must be added to `icons.tsx` following the existing pattern.

## 3. Statistics services audit — the core finding

### 3.1 Existing summary endpoints are role-inconsistent and cannot be reused as-is

| Endpoint | Service | Roles allowed today |
|---|---|---|
| `GET /api/v1/missions/summary` | `getMissionSummary()` | `ADMIN`, `MISSION_PLANNER` |
| `GET /api/v1/vehicles/summary` | `getFleetSummary()` | `ADMIN` only |
| `GET /api/v1/shipments/summary` | `getShipmentSummary()` | `ADMIN`, `MISSION_PLANNER` |
| `GET /api/v1/routes/summary` | `getRouteSummary()` | `ADMIN`, `MISSION_PLANNER`, `STATUS_VIEWER` |

`PROJECT_SPEC.md` line 49 ("مشاهده داشبورد و نقشه") grants dashboard viewing to **all three roles**, including `STATUS_VIEWER` — the role whose entire purpose is read-only status monitoring. Three of the four existing summary endpoints exclude it entirely.

**Resolution:** these four endpoints are **not** the dashboard's data source. Phase 13 introduces its own dedicated statistics service/endpoint(s), gated to all three roles, that either wraps these existing service functions (where their shape is already correct) or replaces them with corrected logic (see §3.2). The existing endpoints are left untouched — they continue to serve whatever they already serve (e.g., the Admin fleet page) — per `CLAUDE.md`'s rule against unnecessary rewrites.

### 3.2 The status-vocabulary split — the single most consequential finding

Two **different, non-overlapping** mission status vocabularies coexist in the codebase today:

1. **Persisted status** (`mission.persistedStatus` column): `DRAFT` | `SCHEDULED` | `CANCELLED` | `ARCHIVED`. This is what `getMissionSummary()` counts by, and what the `/missions` list page's existing `statusFilter` dropdown filters by (`MissionPersistedStatusValue`, in `src/features/missions/types.ts`).
2. **Computed display status** (`deriveMissionDisplayStatus()` in `src/lib/domain/mission-rules.ts`): `DRAFT` | `WAITING` | `IN_PROGRESS` | `ARRIVED` | `CANCELLED` | `ARCHIVED`. This is derived from `persistedStatus` **plus the current instant** (`now >= startAt` and `now >= estimatedArrivalAt`), and it is what Phase 9's `mission-simulation.ts`, Phase 10's `map-scene-service.ts` (`status: simulation.status`), and Phase 11's `mission-interaction-rules.ts` (`MissionFilterState.status: MissionDisplayStatusValue`) all use. A `SCHEDULED` mission is `WAITING` before its `startAt`, `IN_PROGRESS` between `startAt` and `estimatedArrivalAt`, and `ARRIVED` after — **this transition happens with no database write**, purely as a function of the clock (or, since Phase 12, the Timeline Engine's `viewTime`).

`docs/IMPLEMENTATION_PLAN.md`'s Phase 13 scope explicitly asks for "مأموریت‌های منتشرشده/در حال حرکت" (published/moving) separately from "مأموریت‌های پایان‌یافته" (finished) — **these are computed-status concepts** (`IN_PROGRESS` vs `ARRIVED`), not persisted-status ones (both are `SCHEDULED` in the DB). `getMissionSummary()` structurally cannot answer this question; it only sees `SCHEDULED` as one bucket.

The user's requested feature list ("Completed Missions", "Running Missions", "Pending Missions", "Cancelled Missions") maps onto the computed vocabulary as:

| User's term | Computed status | Persisted status prerequisite |
|---|---|---|
| Pending Missions | `WAITING` (or, if the intent is "not yet published", `DRAFT`) | — must be disambiguated in `03-DOMAIN.md`, see below |
| Running Missions | `IN_PROGRESS` | `SCHEDULED` |
| Completed Missions | `ARRIVED` | `SCHEDULED` |
| Cancelled Missions | `CANCELLED` | `CANCELLED` |

**Resolution:** the dashboard's mission statistics **must** be computed the same way `map-scene-service.ts` computes them — by loading `SCHEDULED` missions and calling the Phase 9 `simulateMissionPosition()` pure function per mission at the dashboard's `viewTime` (default: now) — **not** a flat `prisma.mission.count()` by `persistedStatus`. This is a real, non-trivial compute cost identical in shape to `getMapScene()`'s existing batch loop; `05-IMPLEMENTATION.md` must specify whether the dashboard reuses `getMapScene()`'s output directly (cheapest, guarantees identical numbers to what the map shows for the same `viewTime`, but pulls the full per-mission geometry/DTO the dashboard doesn't need) or a lighter-weight sibling function that runs the same simulation loop but returns only status counts. **"Pending" is explicitly defined as `WAITING`** (a `SCHEDULED` mission whose `startAt` is still in the future) — `DRAFT` missions get their own separate counter, not folded into "Pending", because a `DRAFT` mission has no `startAt` guarantee and per `CLAUDE.md` is not yet an operational commitment.

### 3.3 Shipment status is persisted-only and already matches the required vocabulary

`ShipmentStatus` (`WAITING_FOR_DISPATCH` | `IN_TRANSIT` | `DELIVERED`, likely plus `CANCELLED`/soft-delete equivalents — confirm exact enum in `05-DATABASE.md` cross-check) has **no** computed/simulated variant — a shipment's status is a direct operational field set by the mission-simulation-adjacent flows already shipped in Phase 6/7. `getShipmentSummary()`'s `{ total, waitingForDispatch, inTransit, delivered }` shape is **directly reusable** for the dashboard (only its role gate needs to widen — see §3.1); no simulation call is needed for shipment statistics.

### 3.4 Vehicle readiness is binary; "Vehicle Type Distribution" needs a new aggregation

`getFleetSummary()` returns `{ total, ready, outOfService }` — no per-`VehicleType` breakdown exists anywhere today. The requested "Vehicle Type Distribution" widget needs a new `groupBy(vehicleTypeId)` aggregation. Also note: `VehicleReadiness` has exactly two values (no "assigned"/"in-mission" state) — a `READY` vehicle currently on an `IN_PROGRESS` mission still reports `READY`. **"Ready Vehicles" and "Unavailable Vehicles" (user's terms) map directly to `READY` and `OUT_OF_SERVICE`** — they do **not** mean "idle" vs "busy". If a future phase wants utilization-aware counters, that is out of scope here and must not be implied by this phase's copy (avoid any label suggesting "in use" that the data cannot actually back).

### 3.5 No organization-level aggregation service exists

The "دفتر کشوری (N)" / "انبار (N)" counts visible on the `/map` page's level-toggle buttons are computed **client-side**, from the already-fetched flat org-unit list (`GET /api/v1/map/organization-units`), not from a server aggregation. "Office Summary" / "Warehouse Summary" widgets need either (a) a small new server-side `groupBy(level)` count query, or (b) client-side counting over the same lightweight endpoint the map already uses. **Resolved as (a)**: a dedicated lightweight count endpoint is cheaper for the dashboard (no need to download every org unit's full record just to count) and keeps the dashboard's data path consistent with "everything through a service" — see `06-API.md` when written.

## 4. Drill-down capability gap — resolved, not deferred

`docs/IMPLEMENTATION_PLAN.md`'s Phase 13 scope explicitly requires "drill-down به لیست فیلترشده" (drill-down to a filtered list). Investigation shows:

- **Zero pages in the app read filter state from the URL today.** `/missions`, `/shipments`, `/system/vehicles` each hold their filter dropdown(s) in local `useState` seeded from an empty string; `/map` holds Phase 11's entire filter object in `useMissionInteraction`'s local state (ADR-027: session-only, explicitly not URL- or `localStorage`-backed). None of the four destinations can be deep-linked into a pre-filtered view.
- The user's own "OUT OF SCOPE" instruction for this pack excludes documenting "Filtering" as a Phase 13 feature — correctly, since building new filter UIs belongs to the phases that already own each page (3, 6, 7, 11).

**Resolution (this is the necessary "small interface" `CLAUDE.md` §1 permits, not new filtering logic):** each of the four destination pages already has the filter *state and UI* it needs — they simply never read an initial value from anywhere but `""`. The pack specifies a **one-directional, read-once-on-mount** contract: each destination page's existing `useState` initializer is changed to check `useSearchParams()` first. No page gains new filter UI, no page writes back to the URL as the user changes filters (that stays exactly as it is today), and Phase 11's `useMissionInteraction` gets the same treatment for map drill-down (`?missionStatus=IN_PROGRESS` → seeds `interaction.filter.status`). The exact query-parameter contract per destination (names, allowed values, which vocabulary — persisted vs. computed — each expects) is defined precisely in `06-API.md`, keyed against §3.2's finding: **KPIs expressed in persisted-status terms drill down to their list page** (`/missions`, `/shipments`, `/system/vehicles`); **KPIs expressed in computed/real-time terms drill down to `/map`** (which is the only surface that understands `WAITING`/`IN_PROGRESS`/`ARRIVED`).

## 5. Persistence precedent — resolved, not left as an open question

Two conflicting precedents exist in the codebase for "should a UI preference survive a reload":

- **`localStorage`, cross-session**: theme (light/dark), key `armanhaml-theme` (`src/components/theme/theme-constants.ts`). A pure display preference with no staleness risk.
- **Session-only / no persistence at all**: Phase 11's Saved Views (ADR-027, in-memory only) and Phase 12's entire Timeline/Playback state (ADR-028, resets to Live on every load, deliberately, because a dispatcher must never silently land on stale historical data).

**Resolution:** the dashboard splits its own state along exactly this line. **Widget visibility / order / size (layout arrangement)** follows the theme precedent — `localStorage`, key `armanhaml-dashboard-layout`, cross-session, because rearranging cards is a pure display preference with zero data-freshness implication. **Selected time range / Live vs. Historical dashboard mode** follows the Timeline Engine precedent — **not persisted**, always resets to the default (Live, current Jalali day) on load, for the identical reason ADR-028 gives: an operator must never silently see a stale historical dashboard mistaken for the live one. This split is recorded as its own ADR-P13 entry once `07-DATABASE.md` is written.

## 6. Interfaces confirmed safe to consume as-is (no changes needed)

- `simulateMissionPosition()` (`src/lib/domain/mission-simulation.ts`) — pure, deterministic, already the single source of truth for computed mission status. Call it; never reimplement its logic.
- `deriveMissionDisplayStatus()` / `MissionDisplayStatus` (`src/lib/domain/mission-rules.ts`) — the canonical computed-status vocabulary; import the type, do not redeclare it.
- `useTimelineEngine()` (`src/features/map/use-timeline-engine.ts`) — Phase 12 already built exactly the "what instant is being viewed, Live or Historical, with Play/Pause" primitive the dashboard's "Live Dashboard / Historical Dashboard / Dashboard Synchronization" requirements describe. **The dashboard should reuse this hook (or a thin sibling built the same way), not invent a second time-scrubbing mechanism.** Whether the map's timeline and the dashboard's timeline are the *same* instance (synchronized across `/map` and `/dashboard`, impossible today since they are different routes/mounts) or *independent* instances following the same pattern is resolved in `04-ARCHITECTURE.md`: they are **independent** (different pages, no cross-route live state channel exists in this app), each following the Phase 12 pattern, not sharing a literal singleton.
- `getMapScene()` (`src/server/services/map-scene-service.ts`) — candidate direct data source for mission-status statistics at a given `viewTime`, per §3.2.
- `Panel`, `KpiCard`, `Icon`, `StatusBadge` (`src/components/ui/*`) — existing, token-driven, reusable UI primitives.
- All CSS custom properties in `src/app/globals.css` — the complete, closed set of colors/shadows the dashboard is allowed to use.

## 7. Recommendation

No blocking architectural conflict remains unresolved. Every gap found above has a decisive resolution recorded in this document, ready to be restated as formal `ADR-P13-xx` entries once `04-ARCHITECTURE.md` (component/service design) and `07-DATABASE.md` (persistence) are written. Proceeding to `00-README.md`.
