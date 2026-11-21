/**
 * End-to-end DB smoke: create / update / soft-delete across core models.
 * Run: npx tsx scripts/db-smoke.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Row = ["PASS" | "FAIL", string, string];
const results: Row[] = [];
const ok = (name: string, detail = "") => results.push(["PASS", name, detail]);
const fail = (name: string, err: unknown) =>
  results.push(["FAIL", name, err instanceof Error ? err.message : String(err)]);

async function main() {
  const biz = await prisma.business.findFirst({
    where: { deletedAt: null },
  });
  if (!biz) throw new Error("No business in DB — run npm run db:seed");
  ok("business", biz.name);

  const user = await prisma.user.findFirst({ where: { deletedAt: null } });
  if (!user) throw new Error("No user");
  ok("user", user.email);

  const phone = "99" + String(Date.now()).slice(-8);
  const contact = await prisma.contact.create({
    data: {
      businessId: biz.id,
      name: "Audit Lead",
      phone,
      source: "WALK_IN",
      lastActivityAt: new Date(),
      activities: {
        create: {
          businessId: biz.id,
          type: "SYSTEM",
          body: "smoke",
          createdById: user.id,
        },
      },
    },
  });
  ok("contact create", contact.id);

  const stage = await prisma.pipelineStage.findFirst({
    where: { businessId: biz.id },
    orderBy: { position: "asc" },
  });
  if (!stage) throw new Error("No pipeline stage — onboarding incomplete");
  const deal = await prisma.deal.create({
    data: {
      businessId: biz.id,
      contactId: contact.id,
      stageId: stage.id,
      title: "Smoke deal",
      valuePaise: 50_000,
      assignedToId: user.id,
    },
  });
  ok("deal create", deal.id);

  const task = await prisma.task.create({
    data: {
      businessId: biz.id,
      contactId: contact.id,
      title: "Smoke follow-up",
      dueAt: new Date(),
      assignedToId: user.id,
    },
  });
  ok("task create", task.id);

  const appt = await prisma.appointment.create({
    data: {
      businessId: biz.id,
      contactId: contact.id,
      title: "Smoke appt",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3_600_000),
      assignedToId: user.id,
    },
  });
  ok("appointment create", appt.id);

  const cat =
    (await prisma.category.findFirst({
      where: { businessId: biz.id, kind: "EXPENSE", deletedAt: null },
    })) ??
    (await prisma.category.create({
      data: { businessId: biz.id, kind: "EXPENSE", name: "Smoke Expense" },
    }));

  const tx = await prisma.transaction.create({
    data: {
      businessId: biz.id,
      type: "EXPENSE",
      amountPaise: 10_000,
      categoryId: cat.id,
      occurredAt: new Date(),
      note: "smoke",
    },
  });
  ok("transaction create", tx.id);

  const invoice = await prisma.invoice.create({
    data: {
      businessId: biz.id,
      contactId: contact.id,
      number: `SMOKE-${Date.now()}`,
      issueDate: new Date(),
      subtotalPaise: 100_000,
      totalPaise: 100_000,
      status: "SENT",
      items: {
        create: {
          description: "Service",
          quantity: 1,
          unitPaise: 100_000,
          amountPaise: 100_000,
        },
      },
    },
  });
  ok("invoice create", invoice.id);

  const supply = await prisma.supplyItem.create({
    data: {
      businessId: biz.id,
      name: "Smoke Paper",
      sku: `SMK-${Date.now()}`,
      quantity: 10,
      costPaise: 500,
      sellPaise: 800,
    },
  });
  ok("supply create", supply.id);
  await prisma.supplyItem.update({
    where: { id: supply.id },
    data: { quantity: 8, deletedAt: new Date() },
  });
  const supplyAlive = await prisma.supplyItem.findFirst({
    where: { id: supply.id, deletedAt: null },
  });
  if (supplyAlive) throw new Error("supply soft-delete failed");
  ok("supply soft-delete");

  const staff = await prisma.staffMember.create({
    data: {
      businessId: biz.id,
      name: "Smoke Staff",
      joiningDate: new Date(),
      salaryType: "MONTHLY_FIXED",
      basicPaise: 2_000_000,
    },
  });
  ok("staff create", staff.id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.attendance.upsert({
    where: { staffId_date: { staffId: staff.id, date: today } },
    create: {
      businessId: biz.id,
      staffId: staff.id,
      date: today,
      status: "PRESENT",
      markedById: user.id,
    },
    update: { status: "PRESENT" },
  });
  ok("attendance upsert");

  await prisma.salaryAdvance.create({
    data: {
      businessId: biz.id,
      staffId: staff.id,
      amountPaise: 500_000,
      remainingPaise: 500_000,
      monthsTotal: 5,
      monthlyDeductionPaise: 100_000,
      note: "smoke",
    },
  });
  ok("advance create");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let run = await prisma.payrollRun.findUnique({
    where: {
      businessId_year_month: { businessId: biz.id, year, month },
    },
  });
  if (!run) {
    run = await prisma.payrollRun.create({
      data: { businessId: biz.id, year, month, status: "DRAFT" },
    });
  }
  await prisma.payrollLine.upsert({
    where: {
      payrollRunId_staffId: { payrollRunId: run.id, staffId: staff.id },
    },
    create: {
      payrollRunId: run.id,
      staffId: staff.id,
      presentDays: 1,
      basePaise: 2_000_000,
      netPaise: 2_000_000,
    },
    update: { presentDays: 1, netPaise: 2_000_000 },
  });
  ok("payroll line");

  await prisma.goal.upsert({
    where: {
      businessId_type_period_fyYear: {
        businessId: biz.id,
        type: "REVENUE",
        period: "YEAR",
        fyYear: 2026,
      },
    },
    create: {
      businessId: biz.id,
      type: "REVENUE",
      period: "YEAR",
      fyYear: 2026,
      targetPaise: 100_000_000,
    },
    update: { targetPaise: 100_000_000 },
  });
  ok("goal upsert");

  await prisma.message.create({
    data: {
      businessId: biz.id,
      contactId: contact.id,
      body: "Smoke WA",
      status: "logged",
      sentById: user.id,
    },
  });
  ok("message log");

  await prisma.messageTemplate.upsert({
    where: {
      businessId_name: { businessId: biz.id, name: "Smoke Template" },
    },
    create: {
      businessId: biz.id,
      name: "Smoke Template",
      category: "followup",
      body: "Hi {{name}}",
    },
    update: {},
  });
  ok("message template");

  // Soft-delete smoke rows so lists stay clean
  await prisma.contact.update({
    where: { id: contact.id },
    data: { deletedAt: new Date() },
  });
  await prisma.deal.update({
    where: { id: deal.id },
    data: { deletedAt: new Date() },
  });
  await prisma.task.update({
    where: { id: task.id },
    data: { deletedAt: new Date() },
  });
  await prisma.appointment.update({
    where: { id: appt.id },
    data: { deletedAt: new Date() },
  });
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { deletedAt: new Date() },
  });
  await prisma.transaction.update({
    where: { id: tx.id },
    data: { deletedAt: new Date() },
  });
  await prisma.staffMember.update({
    where: { id: staff.id },
    data: { deletedAt: new Date(), status: "LEFT" },
  });
  ok("cleanup soft-deletes");

  const counts = {
    contacts: await prisma.contact.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
    supplies: await prisma.supplyItem.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
    staff: await prisma.staffMember.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
    deals: await prisma.deal.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
    tasks: await prisma.task.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
    invoices: await prisma.invoice.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
    transactions: await prisma.transaction.count({
      where: { businessId: biz.id, deletedAt: null },
    }),
  };
  ok("live counts", JSON.stringify(counts));
}

main()
  .catch((e) => fail("smoke", e))
  .finally(async () => {
    for (const [s, n, d] of results) {
      console.log(s, n, d ? `— ${d}` : "");
    }
    const failed = results.filter((r) => r[0] === "FAIL").length;
    console.log(failed ? `RESULT: FAIL ${failed}` : "RESULT: ALL PASS");
    await prisma.$disconnect();
    await pool.end();
    process.exit(failed ? 1 : 0);
  });
