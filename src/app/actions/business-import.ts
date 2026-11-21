"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { canManageTeam } from "@/lib/permissions";
import {
  isBusinessBackup,
  type BusinessBackup,
} from "@/lib/business-backup";

type ImportStats = {
  contacts: number;
  deals: number;
  tasks: number;
  transactions: number;
  invoices: number;
  appointments: number;
  staff: number;
  vendors: number;
  categories: number;
  skippedContacts: number;
};

export async function importBusinessBackup(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageTeam(ctx.role)) {
    return { error: "Only the owner can import a business backup" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Choose a backup JSON file" };
  }

  let backup: BusinessBackup;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    if (!isBusinessBackup(parsed)) {
      return { error: "Invalid backup file (wrong version or format)" };
    }
    backup = parsed;
  } catch {
    return { error: "Could not read JSON backup" };
  }

  const stats: ImportStats = {
    contacts: 0,
    deals: 0,
    tasks: 0,
    transactions: 0,
    invoices: 0,
    appointments: 0,
    staff: 0,
    vendors: 0,
    categories: 0,
    skippedContacts: 0,
  };

  try {
    await prisma.$transaction(
      async (tx) => {
        // Soft business profile update (does not change slug / memberships)
        await tx.business.update({
          where: { id: ctx.businessId },
          data: {
            gstNumber: backup.business.gstNumber ?? undefined,
            phone: backup.business.phone ?? undefined,
            email: backup.business.email ?? undefined,
            address: backup.business.address ?? undefined,
            fyStartMonth: backup.business.fyStartMonth,
            yearlyRevenueGoalPaise:
              backup.business.yearlyRevenueGoalPaise ?? undefined,
          },
        });

        for (const cat of backup.categories ?? []) {
          await tx.category.upsert({
            where: {
              businessId_kind_name: {
                businessId: ctx.businessId,
                kind: cat.kind,
                name: cat.name,
              },
            },
            update: {},
            create: {
              businessId: ctx.businessId,
              kind: cat.kind,
              name: cat.name,
            },
          });
          stats.categories += 1;
        }

        for (const stage of backup.pipelineStages ?? []) {
          await tx.pipelineStage.upsert({
            where: {
              businessId_key: {
                businessId: ctx.businessId,
                key: stage.key,
              },
            },
            update: {
              name: stage.name,
              position: stage.position,
              color: stage.color,
              isWon: stage.isWon,
              isLost: stage.isLost,
            },
            create: {
              businessId: ctx.businessId,
              name: stage.name,
              key: stage.key,
              position: stage.position,
              color: stage.color,
              isWon: stage.isWon,
              isLost: stage.isLost,
            },
          });
        }

        const stages = await tx.pipelineStage.findMany({
          where: { businessId: ctx.businessId },
        });
        const stageByKey = Object.fromEntries(stages.map((s) => [s.key, s.id]));

        const contactIdByPhone = new Map<string, string>();
        const existingContacts = await tx.contact.findMany({
          where: { businessId: ctx.businessId, deletedAt: null },
          select: { id: true, phone: true },
        });
        for (const c of existingContacts) {
          contactIdByPhone.set(normalizePhone(c.phone), c.id);
        }

        for (const row of backup.contacts ?? []) {
          const phone = normalizePhone(row.phone);
          if (!row.name || !phone) {
            stats.skippedContacts += 1;
            continue;
          }
          if (contactIdByPhone.has(phone)) {
            stats.skippedContacts += 1;
            continue;
          }
          const allowedSources = new Set([
            "WALK_IN",
            "INSTAGRAM",
            "FACEBOOK_AD",
            "GOOGLE",
            "WEBSITE",
            "REFERRAL",
            "WHATSAPP",
            "OTHER",
          ]);
          const source = allowedSources.has(row.source)
            ? (row.source as
                | "WALK_IN"
                | "INSTAGRAM"
                | "FACEBOOK_AD"
                | "GOOGLE"
                | "WEBSITE"
                | "REFERRAL"
                | "WHATSAPP"
                | "OTHER")
            : "OTHER";
          const created = await tx.contact.create({
            data: {
              businessId: ctx.businessId,
              type: row.type === "CUSTOMER" ? "CUSTOMER" : "LEAD",
              name: row.name,
              phone,
              email: row.email,
              address: row.address,
              source,
              sourceDetail: row.sourceDetail,
              notes: row.notes,
              birthday: row.birthday ? new Date(row.birthday) : null,
              anniversary: row.anniversary
                ? new Date(row.anniversary)
                : null,
              lastActivityAt: new Date(),
              assignedToId: ctx.user.id,
            },
          });
          contactIdByPhone.set(phone, created.id);
          stats.contacts += 1;
        }

        for (const row of backup.vendors ?? []) {
          if (!row.name) continue;
          const exists = await tx.vendor.findFirst({
            where: {
              businessId: ctx.businessId,
              name: row.name,
              deletedAt: null,
            },
          });
          if (exists) continue;
          await tx.vendor.create({
            data: {
              businessId: ctx.businessId,
              name: row.name,
              phone: row.phone,
              email: row.email,
              notes: row.notes,
            },
          });
          stats.vendors += 1;
        }

        const vendors = await tx.vendor.findMany({
          where: { businessId: ctx.businessId, deletedAt: null },
        });
        const vendorByName = Object.fromEntries(
          vendors.map((v) => [v.name, v.id]),
        );
        const categories = await tx.category.findMany({
          where: { businessId: ctx.businessId, deletedAt: null },
        });
        const categoryByKey = Object.fromEntries(
          categories.map((c) => [`${c.kind}:${c.name}`, c.id]),
        );

        for (const row of backup.deals ?? []) {
          const contactId = contactIdByPhone.get(
            normalizePhone(row.contactPhone),
          );
          const stageId = stageByKey[row.stageKey];
          if (!contactId || !stageId) continue;
          await tx.deal.create({
            data: {
              businessId: ctx.businessId,
              contactId,
              stageId,
              title: row.title || "Imported deal",
              valuePaise: row.valuePaise || 0,
              status: row.status || "OPEN",
              lostReason: row.lostReason,
              notes: row.notes,
              assignedToId: ctx.user.id,
              wonAt: row.status === "WON" ? new Date() : null,
              lostAt: row.status === "LOST" ? new Date() : null,
            },
          });
          stats.deals += 1;
        }

        for (const row of backup.tasks ?? []) {
          const contactId = row.contactPhone
            ? contactIdByPhone.get(normalizePhone(row.contactPhone))
            : null;
          await tx.task.create({
            data: {
              businessId: ctx.businessId,
              contactId: contactId ?? null,
              title: row.title || "Imported task",
              note: row.note,
              dueAt: new Date(row.dueAt),
              status:
                row.status === "DONE" || row.status === "CANCELLED"
                  ? row.status
                  : "OPEN",
              priority:
                row.priority === "HIGH" || row.priority === "LOW"
                  ? row.priority
                  : "MEDIUM",
              assignedToId: ctx.user.id,
            },
          });
          stats.tasks += 1;
        }

        for (const row of backup.transactions ?? []) {
          const categoryId = row.categoryName
            ? categoryByKey[`${row.type}:${row.categoryName}`]
            : null;
          const vendorId = row.vendorName
            ? vendorByName[row.vendorName]
            : null;
          const contactId = row.contactPhone
            ? contactIdByPhone.get(normalizePhone(row.contactPhone))
            : null;
          await tx.transaction.create({
            data: {
              businessId: ctx.businessId,
              type: row.type,
              amountPaise: row.amountPaise,
              occurredAt: new Date(row.occurredAt),
              paymentMode: (row.paymentMode as "CASH") || "CASH",
              categoryId: categoryId ?? null,
              vendorId: vendorId ?? null,
              contactId: contactId ?? null,
              note: row.note,
            },
          });
          stats.transactions += 1;
        }

        for (const row of backup.invoices ?? []) {
          const contactId = contactIdByPhone.get(
            normalizePhone(row.contactPhone),
          );
          if (!contactId) continue;
          const exists = await tx.invoice.findFirst({
            where: {
              businessId: ctx.businessId,
              number: row.number,
              deletedAt: null,
            },
          });
          if (exists) continue;
          await tx.invoice.create({
            data: {
              businessId: ctx.businessId,
              contactId,
              number: row.number,
              status: (row.status as "SENT") || "SENT",
              issueDate: new Date(row.issueDate),
              dueDate: row.dueDate ? new Date(row.dueDate) : null,
              subtotalPaise: row.subtotalPaise,
              taxPaise: row.taxPaise,
              discountPaise: row.discountPaise,
              totalPaise: row.totalPaise,
              amountPaidPaise: row.amountPaidPaise,
              notes: row.notes,
              items: {
                create: (row.items ?? []).map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPaise: item.unitPaise,
                  taxRateBps: item.taxRateBps,
                  amountPaise: item.amountPaise,
                })),
              },
            },
          });
          stats.invoices += 1;
        }

        for (const row of backup.appointments ?? []) {
          const contactId = contactIdByPhone.get(
            normalizePhone(row.contactPhone),
          );
          if (!contactId) continue;
          await tx.appointment.create({
            data: {
              businessId: ctx.businessId,
              contactId,
              title: row.title || "Imported appointment",
              serviceName: row.serviceName,
              startsAt: new Date(row.startsAt),
              endsAt: new Date(row.endsAt),
              status: (row.status as "BOOKED") || "BOOKED",
              notes: row.notes,
              assignedToId: ctx.user.id,
            },
          });
          stats.appointments += 1;
        }

        for (const row of backup.staffMembers ?? []) {
          if (!row.name) continue;
          await tx.staffMember.create({
            data: {
              businessId: ctx.businessId,
              name: row.name,
              phone: row.phone,
              jobTitle: row.jobTitle,
              joiningDate: new Date(row.joiningDate || Date.now()),
              status: row.status === "LEFT" ? "LEFT" : "ACTIVE",
              salaryType: (row.salaryType as "MONTHLY_FIXED") || "MONTHLY_FIXED",
              basicPaise: row.basicPaise || 0,
              allowancePaise: row.allowancePaise || 0,
              overtimeRatePaise: row.overtimeRatePaise || 0,
              commissionBasis:
                (row.commissionBasis as "NONE") || "NONE",
              commissionBps: row.commissionBps || 0,
              commissionFlatPaise: row.commissionFlatPaise || 0,
              targetBonusPaise: row.targetBonusPaise || 0,
              upiId: row.upiId,
              bankName: row.bankName,
              accountNumber: row.accountNumber,
              ifsc: row.ifsc,
              notes: row.notes,
            },
          });
          stats.staff += 1;
        }
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Import failed. Try a smaller backup.",
    };
  }

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "CREATE",
    entityType: "BusinessBackup",
    entityId: ctx.businessId,
    after: stats,
  });

  revalidatePath("/app");
  revalidatePath("/app/contacts");
  revalidatePath("/app/pipeline");
  revalidatePath("/app/finance");
  revalidatePath("/app/staff");
  revalidatePath("/app/more");

  return { ok: true as const, stats };
}

function normalizePhone(phone: string) {
  return phone.replace(/[\s\-()]/g, "");
}
