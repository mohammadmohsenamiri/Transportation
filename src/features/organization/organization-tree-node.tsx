"use client";

import { Icon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/badge";
import { levelIcon, levelLabel } from "@/features/organization/level-labels";
import type { OrganizationTreeNode as TreeNode } from "@/features/organization/build-tree";
import { cn } from "@/lib/utils";

interface OrganizationTreeNodeProps {
  node: TreeNode;
  depth: number;
  expanded: boolean;
  visibleChildIds: Set<string> | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (node: TreeNode) => void;
  onAddChild: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
}

export function OrganizationTreeNode({
  node,
  depth,
  expanded,
  visibleChildIds,
  expandedIds,
  onToggleExpand,
  onEdit,
  onAddChild,
  onDelete,
}: OrganizationTreeNodeProps) {
  const visibleChildren = visibleChildIds
    ? node.children.filter((child) => visibleChildIds.has(child.id))
    : node.children;
  const hasChildren = node.children.length > 0;
  const canAddChild = node.level !== "WAREHOUSE";

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-[var(--color-bg-sunken)]"
        style={{ paddingInlineStart: `${depth * 20 + 8}px` }}
      >
        <button
          type="button"
          onClick={() => onToggleExpand(node.id)}
          disabled={!hasChildren}
          aria-label={expanded ? "بستن زیرمجموعه" : "بازکردن زیرمجموعه"}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-text-subtle)]",
            !hasChildren && "opacity-0",
          )}
        >
          <Icon name="chevron-left" className={cn("h-4 w-4 transition-transform", expanded && "-rotate-90")} />
        </button>

        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
          <Icon name={levelIcon[node.level]} className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-medium text-[var(--color-text)]">{node.name}</span>
            <span className="ltr-inline shrink-0 text-xs text-[var(--color-text-subtle)]">{node.code}</span>
            {!node.isActive && <StatusBadge tone="danger" label="غیرفعال" />}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">{levelLabel[node.level]}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {canAddChild && (
            <button
              type="button"
              onClick={() => onAddChild(node)}
              title="افزودن زیرمجموعه"
              aria-label={`افزودن زیرمجموعه به ${node.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(node)}
            title="ویرایش"
            aria-label={`ویرایش ${node.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
          >
            <Icon name="pencil" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            disabled={node.childCount > 0}
            title={node.childCount > 0 ? "ابتدا زیرمجموعه‌ها را حذف کنید" : "حذف"}
            aria-label={`حذف ${node.name}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--color-text-muted)]"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <ul>
          {visibleChildren.map((child) => (
            <OrganizationTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expandedIds.has(child.id)}
              visibleChildIds={visibleChildIds}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
