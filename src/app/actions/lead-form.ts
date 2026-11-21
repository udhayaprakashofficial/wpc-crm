"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant, writeAudit } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import {
  defaultLeadFormConfig,
  parseLeadFormConfig,
  type LeadFormConfig,
  type LeadFormField,
} from "@/lib/lead-form";
import { revalidatePath } from "next/cache";

function parseFieldsFromForm(formData: FormData): LeadFormField[] {
  const raw = String(formData.get("fieldsJson") || "");
  if (!raw) return defaultLeadFormConfig().fields;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parseLeadFormConfig({ fields: parsed }).fields;
  } catch {
    return defaultLeadFormConfig().fields;
  }
}

export async function saveLeadFormSettings(formData: FormData) {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) throw new Error("No permission");

  const enabled = formData.get("leadFormEnabled") === "on";
  const title = String(formData.get("leadFormTitle") || "").trim() || null;
  const subtitle =
    String(formData.get("leadFormSubtitle") || "").trim() || null;
  let publicFormSlug =
    slugify(String(formData.get("publicFormSlug") || "").trim()) || null;

  if (!publicFormSlug) {
    const biz = await prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { name: true, slug: true },
    });
    publicFormSlug = slugify(biz.name) || biz.slug;
  }

  // Keep slug unique across businesses
  const clash = await prisma.business.findFirst({
    where: {
      publicFormSlug,
      deletedAt: null,
      NOT: { id: ctx.businessId },
    },
    select: { id: true },
  });
  if (clash) {
    publicFormSlug = `${publicFormSlug}-${ctx.businessId.slice(-4)}`;
  }

  const fields = parseFieldsFromForm(formData);
  const config: LeadFormConfig = { fields };

  await prisma.business.update({
    where: { id: ctx.businessId },
    data: {
      leadFormEnabled: enabled,
      leadFormTitle: title,
      leadFormSubtitle: subtitle,
      publicFormSlug,
      leadFormConfig: config,
    },
  });

  await writeAudit({
    businessId: ctx.businessId,
    userId: ctx.user.id,
    action: "UPDATE",
    entityType: "LeadForm",
    entityId: ctx.businessId,
    after: { enabled, publicFormSlug, fieldCount: fields.length },
  });

  revalidatePath("/app/settings");
  revalidatePath("/app/settings/lead-form");
  revalidatePath(`/f/${publicFormSlug}`);
  revalidatePath("/app/contacts");
  redirect("/app/settings/lead-form?saved=1");
}
