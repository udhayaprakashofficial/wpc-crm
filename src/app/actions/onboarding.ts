"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  getSession,
  refreshSessionForUser,
} from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations";
import { getIndustryTemplate } from "@/lib/industry-templates";
import { slugify } from "@/lib/utils";
import { rupeesToPaise } from "@/lib/money";
export async function completeOnboarding(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/signin");

  // Session can be stale after DB reset/seed — never create membership for a missing user.
  const dbUser = await prisma.user.findFirst({
    where: { id: session.id, deletedAt: null },
  });
  if (!dbUser) {
    await clearSessionCookie();
    redirect("/signin");
  }

  const existing = await prisma.membership.findFirst({
    where: { userId: dbUser.id, deletedAt: null },
  });
  if (existing) {
    await refreshSessionForUser(dbUser.id);
    redirect("/app");
  }

  const fyRaw = String(formData.get("fyStartMonth") || "4");
  const parsed = onboardingSchema.safeParse({
    businessName: formData.get("businessName"),
    industry: formData.get("industry"),
    industryOther: formData.get("industryOther") || "",
    fyStartMonth: fyRaw === "other" ? "other" : fyRaw,
    fyStartMonthOther: formData.get("fyStartMonthOther") || undefined,
    gstNumber: formData.get("gstNumber") || "",
    yearlyRevenueGoalRupees: formData.get("yearlyRevenueGoalRupees") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  if (data.industry === "other" && !data.industryOther?.trim()) {
    throw new Error("Please describe your industry");
  }
  const fyStartMonth =
    data.fyStartMonth === "other"
      ? (data.fyStartMonthOther ?? 4)
      : data.fyStartMonth;
  if (data.fyStartMonth === "other" && !data.fyStartMonthOther) {
    throw new Error("Please enter FY start month (1–12)");
  }

  const template = getIndustryTemplate(data.industry);
  const industryLabel =
    data.industry === "other"
      ? data.industryOther!.trim()
      : template.id;
  const baseSlug = slugify(data.businessName) || "business";
  let slug = baseSlug;
  let i = 1;
  while (
    (await prisma.business.findUnique({ where: { slug } })) ||
    (await prisma.business.findUnique({ where: { publicFormSlug: slug } }))
  ) {
    slug = `${baseSlug}-${i++}`;
  }

  const { PLAN_DEFS } = await import("@/lib/plans");
  const freeDef = PLAN_DEFS.free_trial;
  const freeRow = {
    code: freeDef.code,
    name: freeDef.name,
    pricePaise: freeDef.pricePaise,
    intervalMonths: freeDef.intervalMonths,
    maxUsers: freeDef.maxUsers,
    maxContacts: freeDef.maxContacts,
    features: { ...freeDef.features },
    active: true,
  };
  const freePlan = await prisma.plan.upsert({
    where: { code: freeDef.code },
    update: freeRow,
    create: freeRow,
  });

  const business = await prisma.$transaction(async (tx) => {
    const created = await tx.business.create({
      data: {
        name: data.businessName,
        slug,
        industry: industryLabel,
        gstNumber: data.gstNumber || null,
        fyStartMonth,
        yearlyRevenueGoalPaise: data.yearlyRevenueGoalRupees
          ? rupeesToPaise(data.yearlyRevenueGoalRupees)
          : null,
        publicFormSlug: slug,
        onboardingComplete: true,
        memberships: {
          create: { userId: dbUser.id, role: "OWNER" },
        },
        pipelineStages: {
          create: template.stages.map((stage, index) => ({
            name: stage.name,
            key: stage.key,
            position: index,
            color: stage.color,
            isWon: !!stage.isWon,
            isLost: !!stage.isLost,
          })),
        },
        categories: {
          create: [
            ...template.expenseCategories.map((name) => ({
              kind: "EXPENSE" as const,
              name,
            })),
            ...template.incomeCategories.map((name) => ({
              kind: "INCOME" as const,
              name,
            })),
          ],
        },
        tags: {
          create: template.tags.map((name) => ({ name })),
        },
        messageTemplates: {
          create: [
            {
              name: "Quote sent",
              category: "sales",
              body: "Hi {{name}}, I've shared your quote. Happy to help with any questions!",
            },
            {
              name: "Payment reminder",
              category: "finance",
              body: "Hi {{name}}, gentle reminder that your payment is due. Thank you!",
            },
          ],
        },
        automations: {
          create: [
            {
              key: "new_lead_followup",
              name: "Follow-up for new leads",
              enabled: true,
            },
          ],
        },
        subscriptions: {
          create: {
            planId: freePlan.id,
            status: "TRIALING",
            currentPeriodEnd: new Date(
              Date.now() + freeDef.trialDays * 24 * 60 * 60 * 1000,
            ),
          },
        },
        ...(data.yearlyRevenueGoalRupees
          ? {
              goals: {
                create: {
                  type: "REVENUE" as const,
                  period: "YEAR" as const,
                  fyYear: new Date().getFullYear(),
                  targetPaise: rupeesToPaise(data.yearlyRevenueGoalRupees),
                },
              },
            }
          : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        businessId: created.id,
        userId: dbUser.id,
        action: "CREATE",
        entityType: "Business",
        entityId: created.id,
        after: { name: created.name, industry: created.industry },
      },
    });

    return created;
  });

  await refreshSessionForUser(dbUser.id);
  revalidatePath("/");
  redirect("/app");
}
