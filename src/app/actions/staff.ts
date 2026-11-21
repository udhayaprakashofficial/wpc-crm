"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff } from "@/lib/permissions";
import { rupeesToPaise } from "@/lib/money";

export async function createStaffMember(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const jobTitle = String(formData.get("jobTitle") || "").trim() || null;
  const joiningDate = String(formData.get("joiningDate") || "");
  const salaryType = String(formData.get("salaryType") || "MONTHLY_FIXED") as
    | "MONTHLY_FIXED"
    | "DAILY_WAGE"
    | "HOURLY"
    | "COMMISSION"
    | "FIXED_PLUS_COMMISSION";
  const basicPaise = rupeesToPaise(Number(formData.get("basicRupees") || 0));
  const allowancePaise = rupeesToPaise(
    Number(formData.get("allowanceRupees") || 0),
  );
  const overtimeRatePaise = rupeesToPaise(
    Number(formData.get("overtimeRateRupees") || 0),
  );
  const commissionBasis = String(
    formData.get("commissionBasis") || "NONE",
  ) as "NONE" | "DEAL_WON" | "APPOINTMENT_COMPLETED";
  const commissionBps = Math.round(
    Number(formData.get("commissionPct") || 0) * 100,
  );
  const commissionFlatPaise = rupeesToPaise(
    Number(formData.get("commissionFlatRupees") || 0),
  );
  const targetBonusPaise = rupeesToPaise(
    Number(formData.get("targetBonusRupees") || 0),
  );
  const userId = String(formData.get("userId") || "") || null;

  if (!name || !joiningDate) throw new Error("Name and joining date required");

  const staff = await prisma.staffMember.create({
    data: {
      businessId: ctx.businessId,
      name,
      phone,
      jobTitle,
      joiningDate: new Date(joiningDate),
      salaryType,
      basicPaise,
      allowancePaise,
      overtimeRatePaise,
      commissionBasis,
      commissionBps,
      commissionFlatPaise,
      targetBonusPaise,
      bankName: String(formData.get("bankName") || "") || null,
      accountNumber: String(formData.get("accountNumber") || "") || null,
      ifsc: String(formData.get("ifsc") || "") || null,
      upiId: String(formData.get("upiId") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      userId,
    },
  });

  revalidatePath("/app/staff");
  redirect(`/app/staff/${staff.id}`);
}

export async function updateStaffMember(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const id = String(formData.get("id") || "");
  const staff = await prisma.staffMember.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
  });
  if (!staff) throw new Error("Staff not found");

  const status = String(formData.get("status") || staff.status) as
    | "ACTIVE"
    | "LEFT";
  const leftAt = String(formData.get("leftAt") || "");

  await prisma.staffMember.update({
    where: { id: staff.id },
    data: {
      name: String(formData.get("name") || staff.name).trim(),
      phone: String(formData.get("phone") || "").trim() || null,
      jobTitle: String(formData.get("jobTitle") || "").trim() || null,
      status,
      leftAt: status === "LEFT" ? (leftAt ? new Date(leftAt) : new Date()) : null,
      salaryType: String(formData.get("salaryType") || staff.salaryType) as
        | "MONTHLY_FIXED"
        | "DAILY_WAGE"
        | "HOURLY"
        | "COMMISSION"
        | "FIXED_PLUS_COMMISSION",
      basicPaise: rupeesToPaise(
        Number(formData.get("basicRupees") ?? staff.basicPaise / 100),
      ),
      allowancePaise: rupeesToPaise(
        Number(formData.get("allowanceRupees") ?? staff.allowancePaise / 100),
      ),
      overtimeRatePaise: rupeesToPaise(
        Number(
          formData.get("overtimeRateRupees") ?? staff.overtimeRatePaise / 100,
        ),
      ),
      commissionBasis: String(
        formData.get("commissionBasis") || staff.commissionBasis,
      ) as "NONE" | "DEAL_WON" | "APPOINTMENT_COMPLETED",
      commissionBps: Math.round(
        Number(formData.get("commissionPct") ?? staff.commissionBps / 100) *
          100,
      ),
      commissionFlatPaise: rupeesToPaise(
        Number(
          formData.get("commissionFlatRupees") ??
            staff.commissionFlatPaise / 100,
        ),
      ),
      targetBonusPaise: rupeesToPaise(
        Number(
          formData.get("targetBonusRupees") ?? staff.targetBonusPaise / 100,
        ),
      ),
      bankName: String(formData.get("bankName") || "") || null,
      accountNumber: String(formData.get("accountNumber") || "") || null,
      ifsc: String(formData.get("ifsc") || "") || null,
      upiId: String(formData.get("upiId") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      userId: String(formData.get("userId") || "") || null,
    },
  });

  revalidatePath(`/app/staff/${id}`);
  revalidatePath("/app/staff");
}

export async function addStaffDocument(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const staffId = String(formData.get("staffId") || "");
  const label = String(formData.get("label") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (!staffId || !label || !url) throw new Error("Label and URL required");

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!staff) throw new Error("Staff not found");

  await prisma.staffDocument.create({
    data: { staffId, label, url },
  });

  revalidatePath(`/app/staff/${staffId}`);
}

export async function createSalaryAdvance(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const staffId = String(formData.get("staffId") || "");
  const amountPaise = rupeesToPaise(Number(formData.get("amountRupees") || 0));
  const monthsTotal = Math.max(1, Number(formData.get("monthsTotal") || 1));
  const note = String(formData.get("note") || "") || null;

  if (!staffId || amountPaise <= 0) throw new Error("Invalid advance");

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!staff) throw new Error("Staff not found");

  const monthlyDeductionPaise = Math.ceil(amountPaise / monthsTotal);

  await prisma.salaryAdvance.create({
    data: {
      businessId: ctx.businessId,
      staffId,
      amountPaise,
      remainingPaise: amountPaise,
      monthsTotal,
      monthlyDeductionPaise,
      note,
    },
  });

  revalidatePath(`/app/staff/${staffId}`);
  revalidatePath("/app/staff/advances");
}
