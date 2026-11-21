import { prisma } from "@/lib/prisma";

/** Real invoices only — quotes use notes === "Quote". */
export function outstandingInvoiceWhere(businessId: string) {
  return {
    businessId,
    deletedAt: null as null,
    OR: [{ notes: null }, { notes: { not: "Quote" } }],
    status: { in: ["SENT" as const, "PARTIAL" as const, "OVERDUE" as const] },
  };
}

export function invoiceBalance(inv: {
  totalPaise: number;
  amountPaidPaise: number;
}) {
  return Math.max(0, inv.totalPaise - inv.amountPaidPaise);
}

/** Flip SENT/PARTIAL past dueDate → OVERDUE. Call on dashboard/list loads. */
export async function syncOverdueInvoices(businessId: string) {
  const now = new Date();
  const due = await prisma.invoice.findMany({
    where: {
      businessId,
      deletedAt: null,
      OR: [{ notes: null }, { notes: { not: "Quote" } }],
      status: { in: ["SENT", "PARTIAL"] },
      dueDate: { lt: now },
    },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
    },
    take: 50,
  });

  if (due.length === 0) return;

  await prisma.invoice.updateMany({
    where: { id: { in: due.map((i) => i.id) } },
    data: { status: "OVERDUE" },
  });

  void import("@/lib/automation-runner")
    .then(async ({ runInvoiceOverdueReminder }) => {
      for (const inv of due) {
        await runInvoiceOverdueReminder({
          businessId,
          contactId: inv.contact.id,
          contactName: inv.contact.name,
          phone: inv.contact.phone,
          invoiceNumber: inv.number,
        });
      }
    })
    .catch(() => undefined);
}

export async function getOutstandingInvoices(businessId: string, take = 20) {
  await syncOverdueInvoices(businessId);
  const invoices = await prisma.invoice.findMany({
    where: outstandingInvoiceWhere(businessId),
    include: {
      contact: { select: { id: true, name: true, phone: true } },
    },
    orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
    take,
  });
  return invoices
    .map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      totalPaise: inv.totalPaise,
      amountPaidPaise: inv.amountPaidPaise,
      balancePaise: invoiceBalance(inv),
      contact: inv.contact,
    }))
    .filter((inv) => inv.balancePaise > 0);
}

export async function getOutstandingTotal(businessId: string) {
  const invoices = await getOutstandingInvoices(businessId, 500);
  return invoices.reduce((sum, inv) => sum + inv.balancePaise, 0);
}
