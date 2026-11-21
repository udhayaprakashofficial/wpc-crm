"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff } from "@/lib/permissions";

export async function markAttendance(formData: FormData) {
  const ctx = await requireTenant();
  const staffId = String(formData.get("staffId") || "");
  const dateStr = String(formData.get("date") || "");
  const status = String(formData.get("status") || "PRESENT") as
    | "PRESENT"
    | "ABSENT"
    | "HALF_DAY"
    | "LEAVE"
    | "HOLIDAY";
  const overtimeMinutes = Math.max(
    0,
    Number(formData.get("overtimeMinutes") || 0),
  );
  const note = String(formData.get("note") || "") || null;

  if (!staffId || !dateStr) throw new Error("Staff and date required");

  const staff = await prisma.staffMember.findFirst({
    where: { id: staffId, businessId: ctx.businessId, deletedAt: null },
  });
  if (!staff) throw new Error("Staff not found");

  const isSelf = staff.userId === ctx.user.id;
  if (!canManageStaff(ctx.role) && !isSelf) {
    throw new Error("No permission");
  }
  // Staff can only check themselves in as present/half-day
  if (!canManageStaff(ctx.role) && !["PRESENT", "HALF_DAY"].includes(status)) {
    throw new Error("Staff can only check in present / half-day");
  }

  const date = new Date(dateStr);

  await prisma.attendance.upsert({
    where: { staffId_date: { staffId, date } },
    create: {
      businessId: ctx.businessId,
      staffId,
      date,
      status,
      overtimeMinutes: canManageStaff(ctx.role) ? overtimeMinutes : 0,
      note,
      markedById: ctx.user.id,
    },
    update: {
      status,
      overtimeMinutes: canManageStaff(ctx.role)
        ? overtimeMinutes
        : undefined,
      note,
      markedById: ctx.user.id,
    },
  });

  revalidatePath("/app/staff/attendance");
  revalidatePath(`/app/staff/${staffId}`);
  revalidatePath("/app/staff");
}

export async function bulkMarkPresent(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) throw new Error("No permission");

  const dateStr = String(formData.get("date") || "");
  if (!dateStr) throw new Error("Date required");
  const date = new Date(dateStr);

  const staff = await prisma.staffMember.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  await prisma.$transaction(
    staff.map((s) =>
      prisma.attendance.upsert({
        where: { staffId_date: { staffId: s.id, date } },
        create: {
          businessId: ctx.businessId,
          staffId: s.id,
          date,
          status: "PRESENT",
          markedById: ctx.user.id,
        },
        update: {
          status: "PRESENT",
          markedById: ctx.user.id,
        },
      }),
    ),
  );

  revalidatePath("/app/staff/attendance");
}
