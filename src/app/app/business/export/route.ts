import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import {
  BUSINESS_BACKUP_VERSION,
  type BusinessBackup,
} from "@/lib/business-backup";

export async function GET() {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });

  const [
    categories,
    pipelineStages,
    contacts,
    deals,
    tasks,
    vendors,
    transactions,
    invoices,
    appointments,
    staffMembers,
  ] = await Promise.all([
    prisma.category.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
    prisma.pipelineStage.findMany({
      where: { businessId: ctx.businessId },
      orderBy: { position: "asc" },
    }),
    prisma.contact.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
    prisma.deal.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { contact: true, stage: true },
    }),
    prisma.task.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { contact: true },
    }),
    prisma.vendor.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
    prisma.transaction.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { category: true, vendor: true, contact: true },
    }),
    prisma.invoice.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { contact: true, items: true },
    }),
    prisma.appointment.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { contact: true },
    }),
    prisma.staffMember.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
  ]);

  const backup: BusinessBackup = {
    version: BUSINESS_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    business: {
      name: business.name,
      industry: business.industry,
      gstNumber: business.gstNumber,
      phone: business.phone,
      email: business.email,
      address: business.address,
      fyStartMonth: business.fyStartMonth,
      yearlyRevenueGoalPaise: business.yearlyRevenueGoalPaise,
    },
    categories: categories.map((c) => ({ kind: c.kind, name: c.name })),
    pipelineStages: pipelineStages.map((s) => ({
      name: s.name,
      key: s.key,
      position: s.position,
      color: s.color,
      isWon: s.isWon,
      isLost: s.isLost,
    })),
    contacts: contacts.map((c) => ({
      type: c.type,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      source: c.source,
      sourceDetail: c.sourceDetail,
      notes: c.notes,
      birthday: c.birthday?.toISOString().slice(0, 10) ?? null,
      anniversary: c.anniversary?.toISOString().slice(0, 10) ?? null,
    })),
    deals: deals.map((d) => ({
      contactPhone: d.contact.phone,
      stageKey: d.stage.key,
      title: d.title,
      valuePaise: d.valuePaise,
      status: d.status,
      lostReason: d.lostReason,
      notes: d.notes,
    })),
    tasks: tasks.map((t) => ({
      contactPhone: t.contact?.phone ?? null,
      title: t.title,
      note: t.note,
      dueAt: t.dueAt.toISOString(),
      status: t.status,
      priority: t.priority,
    })),
    vendors: vendors.map((v) => ({
      name: v.name,
      phone: v.phone,
      email: v.email,
      notes: v.notes,
    })),
    transactions: transactions.map((tx) => ({
      type: tx.type,
      amountPaise: tx.amountPaise,
      occurredAt: tx.occurredAt.toISOString(),
      paymentMode: tx.paymentMode,
      categoryName: tx.category?.name ?? null,
      vendorName: tx.vendor?.name ?? null,
      contactPhone: tx.contact?.phone ?? null,
      note: tx.note,
    })),
    invoices: invoices.map((inv) => ({
      contactPhone: inv.contact.phone,
      number: inv.number,
      status: inv.status,
      issueDate: inv.issueDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate?.toISOString().slice(0, 10) ?? null,
      subtotalPaise: inv.subtotalPaise,
      taxPaise: inv.taxPaise,
      discountPaise: inv.discountPaise,
      totalPaise: inv.totalPaise,
      amountPaidPaise: inv.amountPaidPaise,
      notes: inv.notes,
      items: inv.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPaise: item.unitPaise,
        taxRateBps: item.taxRateBps,
        amountPaise: item.amountPaise,
      })),
    })),
    appointments: appointments.map((a) => ({
      contactPhone: a.contact.phone,
      title: a.title,
      serviceName: a.serviceName,
      startsAt: a.startsAt.toISOString(),
      endsAt: a.endsAt.toISOString(),
      status: a.status,
      notes: a.notes,
    })),
    staffMembers: staffMembers.map((s) => ({
      name: s.name,
      phone: s.phone,
      jobTitle: s.jobTitle,
      joiningDate: s.joiningDate.toISOString().slice(0, 10),
      status: s.status,
      salaryType: s.salaryType,
      basicPaise: s.basicPaise,
      allowancePaise: s.allowancePaise,
      overtimeRatePaise: s.overtimeRatePaise,
      commissionBasis: s.commissionBasis,
      commissionBps: s.commissionBps,
      commissionFlatPaise: s.commissionFlatPaise,
      targetBonusPaise: s.targetBonusPaise,
      upiId: s.upiId,
      bankName: s.bankName,
      accountNumber: s.accountNumber,
      ifsc: s.ifsc,
      notes: s.notes,
    })),
  };

  const slug = business.slug || "business";
  const filename = `${slug}-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
