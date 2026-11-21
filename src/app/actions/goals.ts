"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canEditFinance } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";

export async function upsertRevenueGoal(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) {
    throw new Error("No permission");
  }

  const targetRupees = Number(formData.get("targetRupees") || 0);
  const fyYear = Number(formData.get("fyYear") || new Date().getFullYear());
  const note = String(formData.get("note") || "");
  if (targetRupees <= 0) throw new Error("Target required");

  const targetPaise = rupeesToPaise(targetRupees);
  const existing = await prisma.goal.findFirst({
    where: {
      businessId: ctx.businessId,
      type: "REVENUE",
      period: "YEAR",
      fyYear,
      deletedAt: null,
    },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.goalRevision.create({
        data: {
          goalId: existing.id,
          targetPaise: existing.targetPaise,
          note: note || "Previous target",
        },
      }),
      prisma.goal.update({
        where: { id: existing.id },
        data: { targetPaise },
      }),
      prisma.goalRevision.create({
        data: {
          goalId: existing.id,
          targetPaise,
          note: note || "Updated target",
        },
      }),
      prisma.business.update({
        where: { id: ctx.businessId },
        data: { yearlyRevenueGoalPaise: targetPaise },
      }),
    ]);
  } else {
    await prisma.goal.create({
      data: {
        businessId: ctx.businessId,
        type: "REVENUE",
        period: "YEAR",
        fyYear,
        targetPaise,
        revisions: {
          create: { targetPaise, note: note || "Initial target" },
        },
      },
    });
    await prisma.business.update({
      where: { id: ctx.businessId },
      data: { yearlyRevenueGoalPaise: targetPaise },
    });
  }

  revalidatePath("/app/goals");
  revalidatePath("/app");
}

export async function assignStaffTarget(formData: FormData) {
  const ctx = await requireTenant();
  if (ctx.role !== "OWNER" && ctx.role !== "MANAGER") {
    throw new Error("No permission");
  }

  const goalId = String(formData.get("goalId") || "");
  const userId = String(formData.get("userId") || "");
  const targetRupees = Number(formData.get("targetRupees") || 0);
  if (!goalId || !userId || targetRupees <= 0) throw new Error("Invalid");

  await prisma.goalAssignment.upsert({
    where: { goalId_userId: { goalId, userId } },
    update: { targetPaise: rupeesToPaise(targetRupees) },
    create: {
      goalId,
      userId,
      targetPaise: rupeesToPaise(targetRupees),
    },
  });

  revalidatePath("/app/goals");
}
