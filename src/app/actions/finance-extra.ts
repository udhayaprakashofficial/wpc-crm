"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canEditFinance } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";

export async function createVendor(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Name required");
  await prisma.vendor.create({
    data: {
      businessId: ctx.businessId,
      name,
      phone: String(formData.get("phone") || "") || null,
      email: String(formData.get("email") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    },
  });
  revalidatePath("/app/finance/vendors");
  redirect("/app/finance/vendors");
}

export async function createRecurringExpense(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const title = String(formData.get("title") || "").trim();
  const amountRupees = Number(formData.get("amountRupees") || 0);
  const categoryId = String(formData.get("categoryId") || "");
  const dayOfMonth = Number(formData.get("dayOfMonth") || 1);
  const vendorId = String(formData.get("vendorId") || "") || null;

  if (!title || amountRupees <= 0 || !categoryId) {
    throw new Error("Title, amount and category required");
  }

  const next = new Date();
  next.setDate(Math.min(28, Math.max(1, dayOfMonth)));
  if (next <= new Date()) next.setMonth(next.getMonth() + 1);

  await prisma.recurringRule.create({
    data: {
      businessId: ctx.businessId,
      type: "EXPENSE",
      title,
      amountPaise: rupeesToPaise(amountRupees),
      frequency: "MONTHLY",
      dayOfMonth,
      categoryId,
      vendorId,
      paymentMode: "BANK",
      nextRunAt: next,
      active: true,
    },
  });

  revalidatePath("/app/finance/recurring");
  redirect("/app/finance/recurring");
}

export async function runDueRecurringRules() {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const due = await prisma.recurringRule.findMany({
    where: {
      businessId: ctx.businessId,
      active: true,
      deletedAt: null,
      nextRunAt: { lte: new Date() },
    },
  });

  for (const rule of due) {
    await prisma.transaction.create({
      data: {
        businessId: ctx.businessId,
        type: rule.type,
        amountPaise: rule.amountPaise,
        categoryId: rule.categoryId,
        vendorId: rule.vendorId,
        paymentMode: rule.paymentMode,
        note: `Recurring: ${rule.title}`,
        occurredAt: new Date(),
        recurringRuleId: rule.id,
      },
    });

    const next = new Date(rule.nextRunAt);
    if (rule.frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
    else if (rule.frequency === "WEEKLY") next.setDate(next.getDate() + 7);
    else next.setFullYear(next.getFullYear() + 1);

    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { nextRunAt: next },
    });
  }

  revalidatePath("/app/finance");
  revalidatePath("/app/finance/recurring");
}

export async function createBudget(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const categoryId = String(formData.get("categoryId") || "");
  const limitRupees = Number(formData.get("limitRupees") || 0);
  const fyYear = Number(formData.get("fyYear") || new Date().getFullYear());
  const monthRaw = formData.get("month");
  const month = monthRaw ? Number(monthRaw) : null;

  if (!categoryId || limitRupees <= 0) throw new Error("Invalid budget");

  const limitPaise = rupeesToPaise(limitRupees);
  const existing = await prisma.budget.findFirst({
    where: {
      businessId: ctx.businessId,
      categoryId,
      fyYear,
      month: month ?? null,
    },
  });
  if (existing) {
    await prisma.budget.update({
      where: { id: existing.id },
      data: { limitPaise },
    });
  } else {
    await prisma.budget.create({
      data: {
        businessId: ctx.businessId,
        categoryId,
        fyYear,
        month,
        limitPaise,
      },
    });
  }

  revalidatePath("/app/finance/budgets");
  redirect("/app/finance/budgets");
}

export async function createManualIncome(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const amountRupees = Number(formData.get("amountRupees") || 0);
  const categoryId = String(formData.get("categoryId") || "") || null;
  const paymentMode = String(formData.get("paymentMode") || "CASH") as
    | "CASH"
    | "UPI"
    | "CARD"
    | "BANK"
    | "CHEQUE"
    | "OTHER";
  const note = String(formData.get("note") || "");
  const occurredAt = String(formData.get("occurredAt") || "");

  if (amountRupees <= 0) throw new Error("Amount required");

  await prisma.transaction.create({
    data: {
      businessId: ctx.businessId,
      type: "INCOME",
      amountPaise: rupeesToPaise(amountRupees),
      categoryId,
      paymentMode,
      note: note || "Walk-in / other income",
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
  });

  revalidatePath("/app/finance");
  redirect("/app/finance");
}
