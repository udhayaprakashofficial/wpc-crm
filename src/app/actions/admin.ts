"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.isSuperAdmin) throw new Error("Forbidden");
  return user;
}

export async function suspendBusiness(formData: FormData) {
  await requireSuperAdmin();
  const businessId = String(formData.get("businessId") || "");
  await prisma.business.update({
    where: { id: businessId },
    data: { suspendedAt: new Date() },
  });
  revalidatePath("/admin");
}

export async function reactivateBusiness(formData: FormData) {
  await requireSuperAdmin();
  const businessId = String(formData.get("businessId") || "");
  await prisma.business.update({
    where: { id: businessId },
    data: { suspendedAt: null },
  });
  revalidatePath("/admin");
}
