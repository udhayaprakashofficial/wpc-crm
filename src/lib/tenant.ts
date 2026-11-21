import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, type SessionUser } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";
import { canViewAllContacts } from "@/lib/permissions";
import {
  canAccessPath,
  hasModule,
  resolveMemberModules,
  type CrmModuleKey,
} from "@/lib/modules";

export type TenantContext = {
  user: SessionUser;
  businessId: string;
  role: Role;
  /** Modules this member may see and edit */
  modules: CrmModuleKey[];
};

/** Cookie writes only work in Route Handlers — never in RSC render. */
function forceReLogin() {
  redirect("/api/auth/clear-session");
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/signin");

  // Stale cookie after DB reset / Supabase switch
  const user = await prisma.user.findFirst({
    where: { id: session.id, deletedAt: null },
  });
  if (!user) {
    forceReLogin();
  }

  return session;
}

export async function requireTenant(): Promise<TenantContext> {
  const session = await requireUser();

  // Prefer membership matching the JWT; fall back to any active membership
  // (do NOT set cookies here — that is illegal in Server Components).
  let membership = session.businessId
    ? await prisma.membership.findFirst({
        where: {
          userId: session.id,
          businessId: session.businessId,
          isActive: true,
          deletedAt: null,
        },
        include: { user: true },
      })
    : null;

  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: {
        userId: session.id,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      include: { user: true },
    });
  }

  if (!membership) {
    if (session.businessId) {
      // JWT points at a business that no longer exists
      forceReLogin();
    }
    redirect("/onboarding");
  }

  const modules = resolveMemberModules({
    role: membership.role,
    moduleAccess: membership.moduleAccess,
  });

  return {
    user: {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      businessId: membership.businessId,
      role: membership.role,
    },
    businessId: membership.businessId,
    role: membership.role,
    modules,
  };
}

export function requireModule(ctx: TenantContext, key: CrmModuleKey) {
  if (hasModule(ctx.modules, key)) return;
  redirect("/app/more?denied=1");
}

export function requirePathAccess(ctx: TenantContext, pathname: string) {
  if (canAccessPath(ctx.modules, pathname)) return;
  redirect("/app/more?denied=1");
}

/** Staff only see their assigned records (tasks, deals without lead share). */
export function assigneeFilter(ctx: TenantContext) {
  if (canViewAllContacts(ctx.role)) return {};
  return { assignedToId: ctx.user.id };
}

/**
 * Contact visibility: open leads are a shared pool for every team member.
 * Customers stay assignee-scoped for staff.
 */
export function contactVisibilityFilter(ctx: TenantContext) {
  if (canViewAllContacts(ctx.role)) return {};
  return {
    OR: [
      { type: "LEAD" as const },
      { assignedToId: ctx.user.id },
      { assignedToId: null },
    ],
  };
}

/** Pipeline: staff can work deals on shared leads + their own assigned deals. */
export function dealVisibilityFilter(ctx: TenantContext) {
  if (canViewAllContacts(ctx.role)) return {};
  return {
    OR: [
      { assignedToId: ctx.user.id },
      { contact: { type: "LEAD" as const, deletedAt: null } },
    ],
  };
}

/** Ensure a contact belongs to this business (blocks cross-tenant IDs). */
export async function requireContactInTenant(
  businessId: string,
  contactId: string,
) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, businessId, deletedAt: null },
  });
  if (!contact) throw new Error("Contact not found");
  return contact;
}

export async function writeAudit(input: {
  businessId?: string | null;
  userId?: string | null;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      businessId: input.businessId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before as object | undefined,
      after: input.after as object | undefined,
    },
  });
}
