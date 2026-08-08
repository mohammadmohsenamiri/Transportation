# Phase 14 — 05 — Implementation Guide

Build order, pseudocode, transaction boundaries, complexity. Written so the engineer types code rather than makes decisions.

---

## 1. Build order — strictly sequential

| Step | Deliverable | Gate |
|---|---|---|
| 1 | Migration (User columns, `IconAsset`, `IconCategory`, `SystemSetting`, FKs, indexes) | `prisma migrate dev` + `generate` clean |
| 2 | `user-rules.ts` + unit tests | all U-tests green |
| 3 | `settings-registry.ts` + unit tests | all S-tests green |
| 4 | `icon-rules.ts` (+ `svg-analyzer`, `png-dimensions`) + unit tests | all I-tests green, **including every hostile SVG fixture** |
| 5 | `settings-service` + cache | integration green |
| 6 | `user-service` (lifecycle, roles, last-admin guard, concurrency) | integration + concurrency green |
| 7 | `icon-storage` + `icon-service` | integration green |
| 8 | `audit-query-service` | integration green |
| 9 | API routes + Zod | **full security suite green** |
| 10 | UI pages | e2e green on 4 viewports |
| 11 | Icon rendering in the map marker layer | visual + regression green |
| 12 | Docs, ADRs, doc-defect corrections, ship | full verification |

> Step 4 before step 7 is deliberate: the validator must exist and be proven against hostile fixtures **before** any code can write a file to disk.

## 2. Pure domain

### 2.1 `user-rules.ts`

```ts
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";

export function deriveUserStatus(u: {
  isActive: boolean; suspendedAt: Date | null; deletedAt: Date | null;
}): UserStatus {
  if (u.deletedAt) return "DELETED";       // ترتیب اهمیت دارد — اولین تطابق برنده است
  if (u.suspendedAt) return "SUSPENDED";
  if (!u.isActive) return "INACTIVE";
  return "ACTIVE";
}

const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9._-]{2,31}$/;

export function validateUsername(raw: string): string {
  const value = raw.trim();
  if (!USERNAME_RE.test(value)) {
    throw new DomainError("USER_USERNAME_INVALID",
      "نام کاربری باید ۳ تا ۳۲ نویسه، شروع با حرف انگلیسی و فقط شامل حرف، رقم، نقطه، خط تیره و زیرخط باشد.",
      { username: "قالب نام کاربری نامعتبر است." });
  }
  return value;
}

export function validatePassword(password: string, username: string): void {
  if (password.length < 8 || password.length > 128) throw new DomainError("USER_PASSWORD_WEAK", "رمز عبور باید بین ۸ تا ۱۲۸ نویسه باشد.");
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    throw new DomainError("USER_PASSWORD_WEAK", "رمز عبور باید حداقل یک حرف و یک رقم داشته باشد.");
  if (password.toLowerCase() === username.toLowerCase())
    throw new DomainError("USER_PASSWORD_WEAK", "رمز عبور نمی‌تواند برابر نام کاربری باشد.");
}

/** محض: روی مجموعه‌ی از پیش واکشی‌شده ادمین‌ها کار می‌کند تا بخش نژادی مسئله جدا و قابل آزمون بماند. */
export function wouldLeaveNoActiveAdmin(
  activeAdminIds: readonly string[],
  targetUserId: string,
  targetIsAdmin: boolean,
): boolean {
  if (!targetIsAdmin) return false;
  return activeAdminIds.length === 1 && activeAdminIds[0] === targetUserId;
}
```

### 2.2 `svg-analyzer.ts` — reject, never strip

```ts
export interface SvgFinding { construct: string; detail: string }

const FORBIDDEN_ELEMENTS = ["script", "foreignobject", "iframe", "embed", "object"];
const EXTERNAL_SCHEME_RE = /^(https?:)?\/\//i;

export function analyzeSvg(source: string): SvgFinding[] {
  const findings: SvgFinding[] = [];
  const lower = source.toLowerCase();

  if (lower.includes("<!entity") || /<!doctype[^>]*\[/i.test(source))
    findings.push({ construct: "DOCTYPE/ENTITY", detail: "امکان حمله XXE" });

  for (const el of FORBIDDEN_ELEMENTS)
    if (new RegExp(`<\\s*${el}\\b`, "i").test(source))
      findings.push({ construct: `<${el}>`, detail: "عنصر غیرمجاز" });

  if (/\son[a-z]+\s*=/i.test(source))
    findings.push({ construct: "on* attribute", detail: "کنترل‌کننده رویداد" });

  if (/javascript\s*:/i.test(lower))
    findings.push({ construct: "javascript:", detail: "نشانی اسکریپتی" });

  for (const m of source.matchAll(/(?:xlink:href|href)\s*=\s*["']([^"']*)["']/gi)) {
    const target = m[1].trim();
    if (target.startsWith("#")) continue;                          // ارجاع داخلی، مجاز
    if (target.startsWith("data:image/png;base64,")) continue;     // تنها data URI مجاز
    findings.push({ construct: "href", detail: `ارجاع بیرونی: ${target.slice(0, 40)}` });
  }

  if (/@import|expression\s*\(/i.test(lower))
    findings.push({ construct: "CSS", detail: "@import یا expression" });

  for (const m of lower.matchAll(/url\(\s*['"]?([^'")]+)/g))
    if (EXTERNAL_SCHEME_RE.test(m[1]) || m[1].startsWith("data:") && !m[1].startsWith("data:image/png;base64,"))
      findings.push({ construct: "url()", detail: `منبع بیرونی: ${m[1].slice(0, 40)}` });

  return findings;
}
```

> **This is intentionally conservative and regex-based.** It is *not* the security boundary — `<img>`-only rendering plus CSP is (`04-ARCHITECTURE.md` §3.3). A regex analyzer that occasionally rejects a benign file is the correct trade here; one that occasionally *accepts* a hostile file is survivable precisely because it is not the last line.

### 2.3 `png-dimensions.ts` — no dependency

```ts
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < 8; i += 1) if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  // بایت‌های ۱۲..۱۵ باید "IHDR" باشند؛ عرض و ارتفاع big-endian در ۱۶..۲۳ قرار دارند.
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
```

### 2.4 `resolveIcon`

```ts
export function resolveIcon(
  entityIconId: string | null,
  typeIconId: string | null,
  usable: ReadonlySet<string>,   // شناسه آیکن‌های فعال و حذف‌نشده
): string | null {
  if (entityIconId && usable.has(entityIconId)) return entityIconId;
  if (typeIconId && usable.has(typeIconId)) return typeIconId;
  return null;                    // null ⇒ نشانگر پیش‌فرض داخلی؛ هرگز خطا
}
```

## 3. Settings service

```ts
const cache = new Map<string, unknown>();

export function getSetting<T>(key: string): T {
  if (cache.has(key)) return cache.get(key) as T;
  const def = getSettingDefinition(key);                    // throws on unknown key

  if (def.envVar && process.env[def.envVar] !== undefined) {
    const value = def.validate(process.env[def.envVar]);     // env همیشه برنده است
    cache.set(key, value);
    return value as T;
  }
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  let value = def.default;
  if (row) {
    try { value = def.validate(row.value); }
    catch { logOperationalError(`setting ${key} در DB نامعتبر است؛ مقدار پیش‌فرض استفاده شد.`); }
  }
  cache.set(key, value);
  return value as T;
}

export function invalidateSetting(key: string) { cache.delete(key); }
```

> The function is shown synchronously for readability; the real signature is `async`. **Never** call it from a pure domain module — settings reach the domain as a parameter, never as an import.

## 4. User service

### 4.1 Create

```ts
export async function createUser(input: CreateUserInput, actor: ActorContext): Promise<UserDTO> {
  const username = validateUsername(input.username);
  validatePassword(input.password, username);
  if (input.roles.length === 0) throw new DomainError("USER_ROLES_REQUIRED", "حداقل یک نقش لازم است.");

  // یکتایی بدون حساسیت به بزرگی/کوچکی، شامل کاربران حذف‌شده (BR-U06)
  const clash = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
  if (clash) throw new DomainError("USER_USERNAME_TAKEN", "این نام کاربری قبلاً استفاده شده است.");

  const passwordHash = await hashPassword(input.password);   // argon2 موجود — بازنویسی نشود

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { username, displayName: input.displayName ?? null, passwordHash,
              mustChangePassword: true, isActive: true },
    });
    const roles = await tx.role.findMany({ where: { code: { in: input.roles } } });
    await tx.userRole.createMany({ data: roles.map((r) => ({ userId: user.id, roleId: r.id })) });
    return user;
  });

  await logAudit({
    actorUserId: actor.userId, action: "user.created", entityType: "User", entityId: created.id,
    afterJson: auditSafeUser(created, input.roles),   // ← هرگز passwordHash
  });
  return toDTO(created, input.roles);
}
```

`auditSafeUser` is an **allowlist** projection — `{ username, displayName, isActive, roles }`. Never spread the entity, or the hash ends up in the log (SEC-15).

### 4.2 The last-admin guard — the most delicate code in the phase

```ts
async function assertActiveAdminRemains(tx: Prisma.TransactionClient) {
  // پس از اعمال تغییر و درون همان تراکنش اجرا می‌شود.
  // FOR UPDATE دو تراکنش هم‌زمان را سریالی می‌کند تا هر دو «شمارش امن» نبینند.
  const rows = await tx.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM "User" u
    JOIN "UserRole" ur ON ur."userId" = u.id
    JOIN "Role" r ON r.id = ur."roleId"
    WHERE r.code = 'ADMIN'
      AND u."isActive" = true
      AND u."suspendedAt" IS NULL
      AND u."deletedAt" IS NULL
    FOR UPDATE OF u
  `;
  if (Number(rows[0].count) === 0) {
    throw new DomainError("LAST_ADMIN_PROTECTED",
      "این عملیات آخرین مدیر فعال سامانه را حذف می‌کند و مجاز نیست.");
  }
}
```

Called at the end of every transaction for deactivate, suspend, soft-delete and role change. **Checking before the transaction is racy and must not be done.**

### 4.3 Deactivate

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.user.updateMany({
    where: { id, version: input.version, deletedAt: null },
    data: { isActive: false, version: { increment: 1 } },
  });
  if (updated.count === 0) throw new DomainError("USER_VERSION_CONFLICT", "این کاربر توسط شخص دیگری تغییر کرده است.");

  await tx.session.updateMany({                       // SEC-19
    where: { userId: id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await assertActiveAdminRemains(tx);                  // آخرین گام
});
```

Session revocation is inside the same transaction: a deactivated user with a live session would still be able to act.

### 4.4 Role replacement — whole-set, atomic

```ts
await prisma.$transaction(async (tx) => {
  const updated = await tx.user.updateMany({ where: { id, version, deletedAt: null },
                                             data: { version: { increment: 1 } } });
  if (updated.count === 0) throw new DomainError("USER_VERSION_CONFLICT", "…");
  await tx.userRole.deleteMany({ where: { userId: id } });
  const roles = await tx.role.findMany({ where: { code: { in: nextRoles } } });
  await tx.userRole.createMany({ data: roles.map((r) => ({ userId: id, roleId: r.id })) });
  await assertActiveAdminRemains(tx);
});
```

`PUT` semantics (replace the set) rather than incremental add/remove, so two concurrent edits cannot interleave into a set neither admin intended (CC-05).

## 5. Icon service — ordering matters

```ts
export async function uploadIcon(file: File, meta: UploadMeta, actor: ActorContext) {
  // ۱) اعتبارسنجی کامل پیش از هر نوشتن روی دیسک
  assertExtensionAndMime(file);                       // V-I03..V-I05
  assertSize(file);                                   // V-I06, V-I07
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (meta.mimeType === "image/png") {
    const dim = readPngDimensions(bytes);
    if (!dim) throw new DomainError("ICON_CONTENT_MISMATCH", "محتوای فایل با نوع اعلام‌شده مطابقت ندارد.");
    if (dim.width < 16 || dim.width > 512 || dim.height < 16 || dim.height > 512)
      throw new DomainError("ICON_DIMENSIONS_INVALID", "ابعاد آیکن باید بین ۱۶ تا ۵۱۲ پیکسل باشد.");
  } else {
    const text = new TextDecoder().decode(bytes);
    if (!/<svg[\s>]/i.test(text)) throw new DomainError("ICON_CONTENT_MISMATCH", "…");
    const findings = analyzeSvg(text);
    if (findings.length > 0)
      throw new DomainError("ICON_SVG_UNSAFE",
        `فایل SVG شامل ساختار غیرمجاز است: ${findings.map((f) => f.construct).join("، ")}`);
  }

  const sha256 = await sha256Hex(bytes);
  const id = crypto.randomUUID();
  const storagePath = `${id}${extensionFor(meta.mimeType)}`;   // نام کاملاً سمت سرور

  // ۲) اول فایل، بعد رکورد — اگر DB شکست بخورد فایل یتیم پاک می‌شود
  await writeIconFile(storagePath, bytes);
  try {
    const row = await prisma.iconAsset.create({ data: { id, name, category, mimeType, storagePath, sha256, ... } });
    await logAudit({ action: "icon.uploaded", entityType: "IconAsset", entityId: id, afterJson: {...} });
    return row;
  } catch (error) {
    await deleteIconFile(storagePath).catch(() => logOperationalError(`فایل یتیم: ${storagePath}`));
    throw error;
  }
}
```

File-then-row with compensating delete: the reverse order would create a row pointing at a file that may never arrive, and `I-08` would be violated in the direction that *does* break rendering.

### 5.1 Path containment

```ts
function resolveIconPath(storagePath: string): string {
  if (!/^[0-9a-f-]{36}\.(png|svg)$/i.test(storagePath))
    throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");    // شکل نامعتبر = وجود ندارد
  const full = path.resolve(ICON_ROOT, storagePath);
  if (!full.startsWith(path.resolve(ICON_ROOT) + path.sep))
    throw new DomainError("ICON_NOT_FOUND", "آیکن یافت نشد.");    // ادعای مضاعف
  return full;
}
```

Two independent guards. The regex alone already makes traversal impossible; the containment assertion catches any future change that loosens the regex.

## 6. Icon rendering in the map

`map-scene-service.ts` and the org-units endpoint already fetch the entities. Add `iconAssetId` to their existing `select` — **no new query**:

```ts
select: { /* …existing… */ iconAssetId: true, vehicle: { select: { iconAssetId: true,
          vehicleType: { select: { iconAssetId: true } } } } }
```

The client resolves with the pure function and renders `<img src={`/api/v1/icons/${id}/content`}>` inside the existing marker element, falling back to today's coloured circle when `resolveIcon` returns `null`. **No map architecture changes** (P-05).

## 7. Complexity

| Operation | Queries | Complexity |
|---|---|---|
| `deriveUserStatus` | 0 | O(1) |
| `analyzeSvg` | 0 | O(n) over file text, n ≤ 2 MB |
| `readPngDimensions` | 0 | O(1) — 24-byte header |
| `resolveIcon` | 0 | O(1) — set lookups |
| List users | 1 + 1 count | O(page) — paginated (P-01) |
| Create user | 1 read + 3 writes | O(r) for r roles ≤ 3 |
| Deactivate | 3 writes + 1 guard | O(1) |
| Upload icon | 1 write + 1 file | O(n) hashing |
| Serve icon | 1 read + 1 file | O(n) stream; cached immutably |
| Get setting (cached) | **0** | O(1) |
| Audit list | 1 + 1 count | O(page), indexed |

No N+1 anywhere; every list is paginated at the database.

## 8. Error handling

| Layer | Responsibility |
|---|---|
| Route | Zod → 422; `requireActor` → 401/403; map `DomainError.code` → HTTP per `04-ARCHITECTURE.md` §7 |
| Service | Throw `DomainError` only; translate Prisma unique violations; never leak driver errors |
| Domain | Throw `DomainError`; no I/O |
| Storage | Throw on write failure so the transaction compensates |
| Client | Render `message` + `fieldErrors`; `*_VERSION_CONFLICT` gets a dedicated reload affordance |

## 9. Recovery

| Failure | Recovery |
|---|---|
| Transaction aborts | Nothing persisted; retry |
| File written, row failed | File deleted in the same request; if that fails, logged as orphan — inert, since no row references it |
| Row exists, file missing | Resolution falls back (BR-I02); gallery marks it damaged; no crash |
| Invalid stored setting | Default used, discrepancy logged (BR-S04) |
| Audit write fails post-commit | Business fact stands; logged (never surfaced as failure) |
| Zero admins somehow reached | Documented break-glass: re-run the Phase 1 seed script, which creates the initial Admin from environment variables |
