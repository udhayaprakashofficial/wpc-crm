"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { expenseSchema } from "@/lib/validations";
import { rupeesToPaise } from "@/lib/money";
import { canEditFinance } from "@/lib/permissions";
import { revalidateFinanceGraph } from "@/lib/revalidate-crm";

export async function createExpense(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) {
    throw new Error("You do not have permission to add expenses");
  }

  const parsed = expenseSchema.safeParse({
    amountRupees: formData.get("amountRupees"),
    categoryId: formData.get("categoryId"),
    paymentMode: formData.get("paymentMode") || "CASH",
    note: formData.get("note") || "",
    occurredAt: formData.get("occurredAt"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const data = parsed.data;
  const amountPaise = rupeesToPaise(data.amountRupees);

  const tx = await prisma.transaction.create({
    data: {
      businessId: ctx.businessId,
      type: "EXPENSE",
      amountPaise,
      categoryId: data.categoryId,
      paymentMode: data.paymentMode,
      note: data.note || null,
      occurredAt: new Date(data.occurredAt),
    },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "Transaction",
    entityId: tx.id,
    after: { type: "EXPENSE", amountPaise },
  });

  revalidateFinanceGraph();
  redirect("/app/finance");
}
