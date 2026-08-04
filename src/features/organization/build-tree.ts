import type { OrganizationUnit } from "@/features/organization/types";

export interface OrganizationTreeNode extends OrganizationUnit {
  children: OrganizationTreeNode[];
}

export function buildTree(units: OrganizationUnit[]): OrganizationTreeNode[] {
  const nodeById = new Map<string, OrganizationTreeNode>();
  units.forEach((unit) => nodeById.set(unit.id, { ...unit, children: [] }));

  const roots: OrganizationTreeNode[] = [];
  units.forEach((unit) => {
    const node = nodeById.get(unit.id)!;
    const parent = unit.parentId ? nodeById.get(unit.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function findMatchingIds(units: OrganizationUnit[], query: string): Set<string> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return new Set();

  const parentById = new Map(units.map((u) => [u.id, u.parentId]));
  const matches = units.filter(
    (u) => u.name.toLowerCase().includes(normalized) || u.code.toLowerCase().includes(normalized),
  );

  const visible = new Set<string>();
  for (const match of matches) {
    let current: string | null = match.id;
    while (current) {
      visible.add(current);
      current = parentById.get(current) ?? null;
    }
  }
  return visible;
}
