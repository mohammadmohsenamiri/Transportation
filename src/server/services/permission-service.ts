import { DomainError } from "@/lib/errors/domain-error";
import { hasAnyRole, RoleCode } from "@/lib/permissions/roles";

export interface ActorContext {
  userId: string;
  username: string;
  roles: RoleCode[];
}

export function assertRole(actor: ActorContext, allowed: readonly RoleCode[]): void {
  if (!hasAnyRole(actor.roles, allowed)) {
    throw new DomainError("FORBIDDEN", "دسترسی به این عملیات مجاز نیست.");
  }
}
