"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { canManageTeam } from "@/lib/permissions";
import { teamMemberSchema } from "@/lib/validations";
import { assertUserLimit } from "@/lib/plan-limits";
import {
  defaultModulesForRole,
  isCrmModuleKey,
  type CrmModuleKey,
} from "@/lib/modules";
import type { Role } from "@/generated/prisma/client";

function parseModulesFromForm(formData: FormData, role: Role): CrmModuleKey[] {
  const raw = String(formData.get("moduleAccess") || "").trim();
  if (!raw) return defaultModulesForRole(role);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultModulesForRole(role);
    const keys = parsed.map(String).filter(isCrmModuleKey);
    return keys.length ? Array.from(new Set(keys)) : defaultModulesForRole(role);
  } catch {
    return defaultModulesForRole(role);
  }
}

export async function addTeamMember(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageTeam(ctx.role)) {
    throw new Error("Only owners can add team members");
  }
  await assertUserLimit(ctx.businessId);

  const parsed = teamMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "STAFF",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();
  const moduleAccess = parseModulesFromForm(formData, data.role);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash: await hashPassword(data.password),
      },
    });
  }

  const existing = await prisma.membership.findUnique({
    where: {
      businessId_userId: {
        businessId: ctx.businessId,
        userId: user.id,
      },
    },
  });

  if (existing && !existing.deletedAt && existing.isActive) {
    throw new Error("This user is already on the team");
  }

  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: {
        role: data.role,
        moduleAccess,
        isActive: true,
        deletedAt: null,
      },
    });
  } else {
    await prisma.membership.create({
      data: {
        businessId: ctx.businessId,
        userId: user.id,
        role: data.role,
        moduleAccess,
      },
    });
  }

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "Membership",
    entityId: user.id,
    after: { email, role: data.role, moduleAccess },
  });

  revalidatePath("/app/settings/team");
  revalidatePath("/app");
}

export async function updateMemberAccess(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageTeam(ctx.role)) {
    throw new Error("Only owners can change access");
  }

  const membershipId = String(formData.get("membershipId") || "");
  const role = (String(formData.get("role") || "STAFF") as Role) || "STAFF";
  if (!["MANAGER", "STAFF", "ACCOUNTANT"].includes(role)) {
    throw new Error("Invalid role");
  }

  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      businessId: ctx.businessId,
      deletedAt: null,
      isActive: true,
    },
  });
  if (!membership) throw new Error("Member not found");
  if (membership.role === "OWNER") {
    throw new Error("Owner access cannot be limited");
  }

  const moduleAccess = parseModulesFromForm(formData, role);

  await prisma.membership.update({
    where: { id: membership.id },
    data: { role, moduleAccess },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "UPDATE",
    entityType: "Membership",
    entityId: membership.userId,
    after: { role, moduleAccess },
  });

  revalidatePath("/app/settings/team");
  revalidatePath("/app");
}
