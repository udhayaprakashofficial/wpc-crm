"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireContactInTenant, requireTenant } from "@/lib/tenant";
import { canEditFinance } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";
import { touchContactActivity } from "@/lib/contact-activity";

export async function createInvoice(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const contactId = String(formData.get("contactId") || "");
  const description = String(formData.get("description") || "Service");
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));
  const unitRupees = Number(formData.get("unitRupees") || 0);
  const taxRatePct = Number(formData.get("taxRatePct") || 18);
  const discountRupees = Number(formData.get("discountRupees") || 0);
  const dueDate = String(formData.get("dueDate") || "");
  const asQuote = formData.get("asQuote") === "on";

  if (!contactId || unitRupees <= 0) throw new Error("Contact and amount required");
  const contact = await requireContactInTenant(ctx.businessId, contactId);

  const businessPhone = (
    await prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { phone: true },
    })
  ).phone;
  const bizDigits = (businessPhone || "").replace(/\D/g, "").slice(-10);
  const contactDigits = contact.phone.replace(/\D/g, "").slice(-10);
  if (bizDigits && contactDigits && bizDigits === contactDigits) {
    throw new Error(
      "Bill to must be a customer — this contact uses your business phone. Pick another contact.",
    );
  }

  const unitPaise = rupeesToPaise(unitRupees);
  const subtotalPaise = unitPaise * quantity;
  const taxRateBps = Math.round(taxRatePct * 100);
  const taxPaise = Math.round((subtotalPaise * taxRateBps) / 10000);
  const discountPaise = rupeesToPaise(discountRupees);
  const totalPaise = Math.max(0, subtotalPaise + taxPaise - discountPaise);

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });

  const number = asQuote
    ? `${business.quotePrefix}-${String(business.quoteNextNumber).padStart(4, "0")}`
    : `${business.invoicePrefix}-${String(business.invoiceNextNumber).padStart(4, "0")}`;

  const invoice = await prisma.$transaction(async (tx) => {
    await tx.business.update({
      where: { id: business.id },
      data: asQuote
        ? { quoteNextNumber: { increment: 1 } }
        : { invoiceNextNumber: { increment: 1 } },
    });

    const created = await tx.invoice.create({
      data: {
        businessId: ctx.businessId,
        contactId,
        number,
        status: "SENT",
        issueDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotalPaise,
        taxPaise,
        discountPaise,
        totalPaise,
        notes: asQuote ? "Quote" : null,
        items: {
          create: {
            description,
            quantity,
            unitPaise,
            taxRateBps,
            amountPaise: subtotalPaise + taxPaise,
          },
        },
      },
    });

    await tx.activity.create({
      data: {
        businessId: ctx.businessId,
        contactId,
        type: asQuote ? "QUOTE" : "INVOICE",
        body: `${asQuote ? "Quote" : "Invoice"} ${number} created for ₹${(totalPaise / 100).toFixed(0)}`,
        createdById: ctx.user.id,
      },
    });

    // Price-asked-then-disappeared: always schedule a follow-up on quotes
    if (asQuote) {
      await tx.task.create({
        data: {
          businessId: ctx.businessId,
          contactId,
          title: `Follow up on quote ${number}`,
          note: `Customer asked for price (${description}). Call/WhatsApp if no reply.`,
          dueAt: addDays(new Date(), 2),
          priority: "HIGH",
          assignedToId: ctx.user.id,
        },
      });
    }

    await tx.contact.update({
      where: { id: contactId },
      data: { lastActivityAt: new Date() },
    });

    return created;
  });

  revalidatePath("/app/finance");
  revalidatePath("/app");
  revalidatePath("/app/tasks");
  redirect(`/app/finance/invoices/${invoice.id}`);
}

export async function recordPayment(formData: FormData) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const invoiceId = String(formData.get("invoiceId") || "");
  const amountRupees = Number(formData.get("amountRupees") || 0);
  const paymentMode = String(formData.get("paymentMode") || "UPI") as
    | "CASH"
    | "UPI"
    | "CARD"
    | "BANK"
    | "CHEQUE"
    | "OTHER";

  if (!invoiceId || amountRupees <= 0) throw new Error("Invalid payment");

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!invoice) throw new Error("Invoice not found");

  const amountPaise = rupeesToPaise(amountRupees);
  const amountPaidPaise = invoice.amountPaidPaise + amountPaise;
  const status =
    amountPaidPaise >= invoice.totalPaise
      ? "PAID"
      : amountPaidPaise > 0
        ? "PARTIAL"
        : invoice.status;

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { amountPaidPaise, status },
    }),
    prisma.transaction.create({
      data: {
        businessId: ctx.businessId,
        type: "INCOME",
        amountPaise,
        paymentMode,
        contactId: invoice.contactId,
        invoiceId: invoice.id,
        occurredAt: new Date(),
        note: `Payment for ${invoice.number}`,
      },
    }),
    prisma.activity.create({
      data: {
        businessId: ctx.businessId,
        contactId: invoice.contactId,
        type: "PAYMENT",
        body: `Payment ₹${amountRupees} received for ${invoice.number}`,
        createdById: ctx.user.id,
      },
    }),
  ]);

  await touchContactActivity(invoice.contactId);

  revalidatePath(`/app/finance/invoices/${invoice.id}`);
  revalidatePath("/app/finance");
  revalidatePath("/app");
}

export async function convertQuoteToInvoice(invoiceId: string) {
  const ctx = await requireTenant();
  if (!canEditFinance(ctx.role)) throw new Error("No permission");

  const quote = await prisma.invoice.findFirst({
    where: { id: invoiceId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!quote) throw new Error("Not found");

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });
  const number = `${business.invoicePrefix}-${String(business.invoiceNextNumber).padStart(4, "0")}`;

  await prisma.$transaction([
    prisma.business.update({
      where: { id: business.id },
      data: { invoiceNextNumber: { increment: 1 } },
    }),
    prisma.invoice.update({
      where: { id: quote.id },
      data: {
        number,
        notes: null,
        status: "SENT",
        dueDate: addDays(new Date(), 7),
      },
    }),
    prisma.task.create({
      data: {
        businessId: ctx.businessId,
        contactId: quote.contactId,
        title: `Collect payment for ${number}`,
        note: "Invoice converted from quote — remind customer if unpaid.",
        dueAt: addDays(new Date(), 3),
        priority: "HIGH",
        assignedToId: ctx.user.id,
      },
    }),
  ]);

  await touchContactActivity(quote.contactId);

  revalidatePath(`/app/finance/invoices/${invoiceId}`);
  revalidatePath("/app");
  revalidatePath("/app/tasks");
}
