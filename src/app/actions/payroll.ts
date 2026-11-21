"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff, canPaySalary } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";
import {
  calculateStaffPay,
  monthBounds,
  summarizeAttendance,
} from "@/lib/payroll";

async function ensureSalariesCategory(businessId: string) {
  return prisma.category.upsert({
    where: {
      businessId_kind_name: {
        businessId,
        kind: "EXPENSE",
        name: "Salaries",
      },
    },
    update: {},
    create: {
      businessId,
      kind: "EXPENSE",
      name: "Salaries",
    },
  });
}

async function commissionForStaff(
  businessId: string,
  staff: {
    userId: string | null;
    commissionBasis: string;
    commissionBps: number;
    commissionFlatPaise: number;
  },
  start: Date,
  end: Date,
) {
  if (staff.commissionBasis === "NONE" || !staff.userId) return 0;

  if (staff.commissionBasis === "DEAL_WON") {
    const deals = await prisma.deal.findMany({
      where: {
        businessId,
        assignedToId: staff.userId,
        status: "WON",
        deletedAt: null,
        wonAt: { gte: start, lte: end },
      },
      select: { valuePaise: true },
    });
    const volume = deals.reduce((s, d) => s + d.valuePaise, 0);
    const pct = Math.round((volume * staff.commissionBps) / 10000);
    const flat = staff.commissionFlatPaise * deals.length;
    return pct + flat;
  }

  if (staff.commissionBasis === "APPOINTMENT_COMPLETED") {
    const count = await prisma.appointment.count({
      where: {
        businessId,
        assignedToId: staff.userId,
        status: "COMPLETED",
        deletedAt: null,
        startsAt: { gte: start, lte: end },
      },
    });
    const flat = staff.commissionFlatPaise * count;
    // bps unused for appointments unless set as percent of a fixed value — keep flat
    return flat;
  }

  return 0;
}

async function goalHitForStaff(
  businessId: string,
  userId: string | null,
  year: number,
  month: number,
) {
  if (!userId) return false;
  const { start, end } = monthBounds(year, month);

  const assignment = await prisma.goalAssignment.findFirst({
    where: {
      userId,
      goal: {
        businessId,
        deletedAt: null,
        period: { in: ["MONTH", "YEAR"] },
      },
    },
    include: { goal: true },
  });
  if (!assignment?.targetPaise) return false;

  const income = await prisma.transaction.aggregate({
    where: {
      businessId,
      type: "INCOME",
      deletedAt: null,
      occurredAt: { gte: start, lte: end },
      // Approximate: staff-linked income via contact assignee is complex; use deals won value
    },
    _sum: { amountPaise: true },
  });

  const dealsWon = await prisma.deal.aggregate({
    where: {
      businessId,
      assignedToId: userId,
      status: "WON",
      deletedAt: null,
      wonAt: { gte: start, lte: end },
    },
    _sum: { valuePaise: true },
  });

  const actual =
    (dealsWon._sum.valuePaise ?? 0) || (income._sum.amountPaise ?? 0);
  return actual >= assignment.targetPaise;
}

export async function generatePayroll(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const year = Number(formData.get("year") || new Date().getFullYear());
  const month = Number(formData.get("month") || new Date().getMonth() + 1);
  if (month < 1 || month > 12) throw new Error("Invalid month");

  const { start, end } = monthBounds(year, month);

  const staffList = await prisma.staffMember.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      status: "ACTIVE",
      joiningDate: { lte: end },
      OR: [{ leftAt: null }, { leftAt: { gte: start } }],
    },
  });

  let run = await prisma.payrollRun.findUnique({
    where: {
      businessId_year_month: {
        businessId: ctx.businessId,
        year,
        month,
      },
    },
  });

  if (run && run.status === "PAID") {
    throw new Error("This month is already fully paid");
  }

  if (!run) {
    run = await prisma.payrollRun.create({
      data: {
        businessId: ctx.businessId,
        year,
        month,
        status: "DRAFT",
      },
    });
  } else if (run.status === "FINALIZED") {
    // allow regenerate only for unpaid draft lines — reset to draft
    await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "DRAFT", finalizedAt: null },
    });
  }

  // Clear unpaid draft lines before regenerate
  await prisma.payrollLine.deleteMany({
    where: {
      payrollRunId: run.id,
      status: { in: ["DRAFT", "FINALIZED"] },
    },
  });

  let totalPaise = 0;

  for (const staff of staffList) {
    const attendanceRows = await prisma.attendance.findMany({
      where: {
        staffId: staff.id,
        date: { gte: start, lte: end },
      },
    });
    const attendance = summarizeAttendance(attendanceRows);
    const commissionPaise = await commissionForStaff(
      ctx.businessId,
      staff,
      start,
      end,
    );
    const advances = await prisma.salaryAdvance.findMany({
      where: {
        staffId: staff.id,
        status: "ACTIVE",
        deletedAt: null,
        remainingPaise: { gt: 0 },
      },
    });
    const advanceDeductionPaise = advances.reduce(
      (sum, a) => sum + Math.min(a.monthlyDeductionPaise, a.remainingPaise),
      0,
    );
    const goalHit = await goalHitForStaff(
      ctx.businessId,
      staff.userId,
      year,
      month,
    );

    const pay = calculateStaffPay({
      staff,
      year,
      month,
      attendance,
      commissionPaise,
      advanceDeductionPaise,
      goalHit,
    });

    await prisma.payrollLine.create({
      data: {
        payrollRunId: run.id,
        staffId: staff.id,
        status: "DRAFT",
        presentDays: pay.presentDays,
        absentDays: pay.absentDays,
        halfDays: pay.halfDays,
        leaveDays: pay.leaveDays,
        holidayDays: pay.holidayDays,
        overtimeMinutes: pay.overtimeMinutes,
        basePaise: pay.basePaise,
        allowancePaise: pay.allowancePaise,
        overtimePaise: pay.overtimePaise,
        commissionPaise: pay.commissionPaise,
        incentivePaise: pay.incentivePaise,
        bonusPaise: pay.bonusPaise,
        absenceDeductionPaise: pay.absenceDeductionPaise,
        advanceDeductionPaise: pay.advanceDeductionPaise,
        otherDeductionPaise: pay.otherDeductionPaise,
        netPaise: pay.netPaise,
      },
    });
    totalPaise += pay.netPaise;
  }

  // Keep already-paid lines in total
  const paidSum = await prisma.payrollLine.aggregate({
    where: { payrollRunId: run.id, status: "PAID" },
    _sum: { netPaise: true },
  });
  totalPaise += paidSum._sum.netPaise ?? 0;

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { totalPaise, status: "DRAFT" },
  });

  revalidatePath("/app/staff/payroll");
  redirect(`/app/staff/payroll/${run.id}`);
}

export async function updatePayrollLine(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const lineId = String(formData.get("lineId") || "");
  const line = await prisma.payrollLine.findFirst({
    where: {
      id: lineId,
      payrollRun: { businessId: ctx.businessId },
    },
    include: { payrollRun: true },
  });
  if (!line || line.status === "PAID") throw new Error("Cannot edit");

  const netPaise = rupeesToPaise(Number(formData.get("netRupees") || 0));
  const otherDeductionPaise = rupeesToPaise(
    Number(formData.get("otherDeductionRupees") || 0),
  );
  const incentivePaise = rupeesToPaise(
    Number(formData.get("incentiveRupees") || 0),
  );
  const notes = String(formData.get("notes") || "") || null;

  const base =
    line.basePaise +
    line.allowancePaise +
    line.overtimePaise +
    line.commissionPaise +
    incentivePaise +
    line.bonusPaise;
  const computedNet = Math.max(
    0,
    base -
      line.absenceDeductionPaise -
      line.advanceDeductionPaise -
      otherDeductionPaise,
  );

  await prisma.payrollLine.update({
    where: { id: line.id },
    data: {
      incentivePaise,
      otherDeductionPaise,
      netPaise: formData.get("netRupees") ? netPaise : computedNet,
      notes,
    },
  });

  const total = await prisma.payrollLine.aggregate({
    where: { payrollRunId: line.payrollRunId },
    _sum: { netPaise: true },
  });
  await prisma.payrollRun.update({
    where: { id: line.payrollRunId },
    data: { totalPaise: total._sum.netPaise ?? 0 },
  });

  revalidatePath(`/app/staff/payroll/${line.payrollRunId}`);
}

export async function finalizePayroll(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const runId = String(formData.get("runId") || "");
  const run = await prisma.payrollRun.findFirst({
    where: { id: runId, businessId: ctx.businessId },
  });
  if (!run || run.status === "PAID") throw new Error("Invalid run");

  await prisma.$transaction([
    prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: "FINALIZED", finalizedAt: new Date() },
    }),
    prisma.payrollLine.updateMany({
      where: { payrollRunId: run.id, status: "DRAFT" },
      data: { status: "FINALIZED" },
    }),
  ]);

  revalidatePath(`/app/staff/payroll/${runId}`);
}

export async function payPayrollLine(formData: FormData) {
  const ctx = await requireTenant();
  if (!canPaySalary(ctx.role)) throw new Error("No permission");

  const lineId = String(formData.get("lineId") || "");
  const paymentMode = String(formData.get("paymentMode") || "UPI") as
    | "CASH"
    | "UPI"
    | "BANK"
    | "OTHER";

  const line = await prisma.payrollLine.findFirst({
    where: {
      id: lineId,
      payrollRun: { businessId: ctx.businessId },
    },
    include: { staff: true, payrollRun: true },
  });
  if (!line || line.status === "PAID") throw new Error("Already paid");
  if (line.netPaise <= 0) throw new Error("Nothing to pay");

  const category = await ensureSalariesCategory(ctx.businessId);

  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        businessId: ctx.businessId,
        type: "EXPENSE",
        amountPaise: line.netPaise,
        paymentMode,
        categoryId: category.id,
        occurredAt: new Date(),
        note: `Salary ${line.payrollRun.month}/${line.payrollRun.year} · ${line.staff.name}`,
      },
    });

    await tx.payrollLine.update({
      where: { id: line.id },
      data: {
        status: "PAID",
        paymentMode,
        paidAt: new Date(),
        transactionId: transaction.id,
      },
    });

    // Apply advance deductions
    if (line.advanceDeductionPaise > 0) {
      const advances = await tx.salaryAdvance.findMany({
        where: {
          staffId: line.staffId,
          status: "ACTIVE",
          deletedAt: null,
          remainingPaise: { gt: 0 },
        },
        orderBy: { givenAt: "asc" },
      });
      let left = line.advanceDeductionPaise;
      for (const adv of advances) {
        if (left <= 0) break;
        const take = Math.min(left, adv.remainingPaise, adv.monthlyDeductionPaise);
        const remainingPaise = adv.remainingPaise - take;
        await tx.salaryAdvance.update({
          where: { id: adv.id },
          data: {
            remainingPaise,
            monthsPaid: { increment: 1 },
            status: remainingPaise <= 0 ? "CLOSED" : "ACTIVE",
          },
        });
        left -= take;
      }
    }

    return transaction;
  });

  const unpaid = await prisma.payrollLine.count({
    where: {
      payrollRunId: line.payrollRunId,
      status: { not: "PAID" },
    },
  });
  if (unpaid === 0) {
    await prisma.payrollRun.update({
      where: { id: line.payrollRunId },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  void result;
  revalidatePath(`/app/staff/payroll/${line.payrollRunId}`);
  revalidatePath(`/app/staff/payroll/${line.payrollRunId}/payslip/${line.id}`);
  revalidatePath("/app/finance");
  revalidatePath("/app");
}

export async function payAllPayroll(formData: FormData) {
  const ctx = await requireTenant();
  if (!canPaySalary(ctx.role)) throw new Error("No permission");

  const runId = String(formData.get("runId") || "");
  const paymentMode = String(formData.get("paymentMode") || "UPI");

  const lines = await prisma.payrollLine.findMany({
    where: {
      payrollRunId: runId,
      payrollRun: { businessId: ctx.businessId },
      status: { not: "PAID" },
      netPaise: { gt: 0 },
    },
  });

  for (const line of lines) {
    const fd = new FormData();
    fd.set("lineId", line.id);
    fd.set("paymentMode", paymentMode);
    await payPayrollLine(fd);
  }

  revalidatePath(`/app/staff/payroll/${runId}`);
}
