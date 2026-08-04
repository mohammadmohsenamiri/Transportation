"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icons";
import { buildTree, findMatchingIds, type OrganizationTreeNode as TreeNode } from "@/features/organization/build-tree";
import { OrganizationTreeNode } from "@/features/organization/organization-tree-node";
import {
  OrganizationForm,
  emptyFormValues,
  unitToFormValues,
  type OrganizationFormValues,
} from "@/features/organization/organization-form";
import { OrganizationHistory } from "@/features/organization/organization-history";
import {
  useCreateOrganizationUnit,
  useOrganizationTree,
  useUpdateOrganizationUnit,
  useDeleteOrganizationUnit,
} from "@/features/organization/use-organization-queries";
import { childLevel, levelLabel } from "@/features/organization/level-labels";
import { ApiError } from "@/features/organization/types";

type SheetState =
  | { mode: "closed" }
  | { mode: "create"; values: OrganizationFormValues }
  | { mode: "edit"; unitId: string; values: OrganizationFormValues };

export function OrganizationTreeView() {
  const { data: units, isLoading, isError } = useOrganizationTree();
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<SheetState>({ mode: "closed" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null);

  const createMutation = useCreateOrganizationUnit();
  const updateMutation = useUpdateOrganizationUnit();
  const deleteMutation = useDeleteOrganizationUnit();

  const tree = useMemo(() => buildTree(units ?? []), [units]);
  const visibleIds = useMemo(
    () => (units && query.trim() ? findMatchingIds(units, query) : null),
    [units, query],
  );

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setFormError(null);
    setSheet({ mode: "create", values: emptyFormValues("COUNTRY_OFFICE", null) });
  }

  function openAddChild(node: TreeNode) {
    const nextLevel = childLevel[node.level];
    if (!nextLevel) return;
    setFormError(null);
    setExpandedIds((prev) => new Set(prev).add(node.id));
    setSheet({ mode: "create", values: emptyFormValues(nextLevel, node.id) });
  }

  function openEdit(node: TreeNode) {
    setFormError(null);
    setSheet({ mode: "edit", unitId: node.id, values: unitToFormValues(node) });
  }

  async function handleSubmit(values: OrganizationFormValues) {
    setFormError(null);
    const latitude = values.latitude.trim() === "" ? null : Number(values.latitude);
    const longitude = values.longitude.trim() === "" ? null : Number(values.longitude);

    try {
      if (sheet.mode === "create") {
        await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
          level: values.level,
          parentId: values.parentId,
          latitude,
          longitude,
          address: values.address || null,
        });
      } else if (sheet.mode === "edit") {
        await updateMutation.mutateAsync({
          id: sheet.unitId,
          payload: {
            name: values.name,
            parentId: values.parentId,
            latitude,
            longitude,
            address: values.address || null,
            isActive: values.isActive,
          },
        });
      }
      setSheet({ mode: "closed" });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      }
      throw error;
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // خطا در alert کوتاه هم قابل نمایش است؛ فعلاً dialog باز می‌ماند تا کاربر متوجه شکست شود
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-bg-sunken)] px-3 py-2">
          <Icon name="search" className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجو بر اساس نام یا کد..."
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none"
          />
        </div>
        <SheetTrigger onClick={openCreate}>افزودن دفتر کشوری</SheetTrigger>
      </div>

      <Panel className="p-2 sm:p-3">
        {isLoading && <p className="p-4 text-sm text-[var(--color-text-muted)]">در حال بارگذاری...</p>}
        {isError && <p className="p-4 text-sm text-[var(--color-danger)]">خطا در بارگذاری ساختار سازمانی.</p>}
        {!isLoading && !isError && tree.length === 0 && (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">
            هنوز هیچ دفتری تعریف نشده است. با دکمه «افزودن دفتر کشوری» شروع کنید.
          </p>
        )}
        {!isLoading && !isError && tree.length > 0 && (
          <ul>
            {tree
              .filter((node) => !visibleIds || visibleIds.has(node.id))
              .map((node) => (
                <OrganizationTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expanded={Boolean(visibleIds) || expandedIds.has(node.id)}
                  visibleChildIds={visibleIds}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  onEdit={openEdit}
                  onAddChild={openAddChild}
                  onDelete={setDeleteTarget}
                />
              ))}
          </ul>
        )}
      </Panel>

      <Sheet
        open={sheet.mode !== "closed"}
        onClose={() => setSheet({ mode: "closed" })}
        title={sheet.mode === "create" ? `افزودن ${sheet.values ? levelLabel[sheet.values.level] : ""}` : "ویرایش گره سازمانی"}
      >
        {sheet.mode !== "closed" && (
          <div className="flex flex-col gap-6">
            <OrganizationForm
              mode={sheet.mode}
              defaultValues={sheet.values}
              onSubmit={handleSubmit}
              onCancel={() => setSheet({ mode: "closed" })}
              pending={createMutation.isPending || updateMutation.isPending}
              serverError={formError}
            />
            {sheet.mode === "edit" && (
              <div className="border-t border-[var(--color-panel-border)] pt-4">
                <h3 className="mb-2 text-xs font-semibold text-[var(--color-text)]">تاریخچه تغییرات</h3>
                <OrganizationHistory unitId={sheet.unitId} />
              </div>
            )}
          </div>
        )}
      </Sheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف گره سازمانی"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» حذف (غیرفعال) می‌شود. این عملیات قابل بازگشت نیست مگر از طریق پایگاه‌داده.`
            : ""
        }
        confirmLabel="حذف"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
