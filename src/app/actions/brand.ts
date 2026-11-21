"use server";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

function extFor(type: string, name: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && ["png", "jpg", "jpeg", "webp", "svg"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "png";
}

export async function saveBrandKit(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) throw new Error("No permission");

  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Business name required");

  const phone = String(formData.get("phone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const address = String(formData.get("address") || "").trim() || null;
  const gstNumber = String(formData.get("gstNumber") || "").trim() || null;
  const logoUrlPaste = String(formData.get("logoUrl") || "").trim() || null;
  const removeLogo = formData.get("removeLogo") === "on";

  const existing = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
    select: { logoUrl: true },
  });

  let logoUrl = existing.logoUrl;

  if (removeLogo) {
    logoUrl = null;
  }

  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) throw new Error("Logo must be under 2MB");
    if (!ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
      throw new Error("Upload a PNG, JPG, WEBP, or SVG");
    }

    const ext = extFor(file.type, file.name);
    const dir = path.join(process.cwd(), "public", "uploads", ctx.businessId);
    await mkdir(dir, { recursive: true });

    // Clear previous uploaded logos for this business
    for (const old of ["png", "jpg", "jpeg", "webp", "svg"]) {
      try {
        await unlink(path.join(dir, `logo.${old}`));
      } catch {
        /* ignore */
      }
    }

    const filename = `logo.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    // Cache-bust so print/invoice picks up new file
    logoUrl = `/uploads/${ctx.businessId}/${filename}?v=${Date.now()}`;
  } else if (logoUrlPaste && !removeLogo) {
    logoUrl = logoUrlPaste;
  }

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      name,
      phone,
      email,
      address,
      gstNumber,
      logoUrl,
    },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "UPDATE",
    entityType: "BrandKit",
    entityId: ctx.businessId,
    after: { name, hasLogo: !!logoUrl },
  });

  revalidatePath("/app");
  revalidatePath("/app/settings");
  revalidatePath("/app/settings/brand");
  revalidatePath("/app/finance");
  revalidatePath("/app/finance/invoices");
  redirect("/app/settings/brand");
}
