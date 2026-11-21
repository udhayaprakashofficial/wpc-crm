import { prisma } from "@/lib/prisma";
import { getIndustryTemplate } from "@/lib/industry-templates";
import { slugify } from "@/lib/utils";

/** Create a default workspace for a brand-new user (skips onboarding form). */
export async function provisionDefaultWorkspace(input: {
  userId: string;
  ownerName: string;
}) {
  const existing = await prisma.membership.findFirst({
    where: { userId: input.userId, deletedAt: null },
  });
  if (existing) {
    return { businessId: existing.businessId, created: false as const };
  }

  const template = getIndustryTemplate("other");
  const businessName =
    input.ownerName.trim().length > 0
      ? `${input.ownerName.trim()}'s business`
      : "My business";
  const baseSlug = slugify(businessName) || "business";
  let slug = baseSlug;
  let i = 1;
  while (
    (await prisma.business.findUnique({ where: { slug } })) ||
    (await prisma.business.findUnique({ where: { publicFormSlug: slug } }))
  ) {
    slug = `${baseSlug}-${i++}`;
  }

  const business = await prisma.business.create({
    data: {
      name: businessName,
      slug,
      industry: template.id,
      fyStartMonth: 4,
      publicFormSlug: slug,
      onboardingComplete: true,
      memberships: {
        create: { userId: input.userId, role: "OWNER" },
      },
      pipelineStages: {
        create: template.stages.map((stage, index) => ({
          name: stage.name,
          key: stage.key,
          position: index,
          color: stage.color,
          isWon: !!stage.isWon,
          isLost: !!stage.isLost,
        })),
      },
      categories: {
        create: [
          ...template.expenseCategories.map((name) => ({
            kind: "EXPENSE" as const,
            name,
          })),
          ...template.incomeCategories.map((name) => ({
            kind: "INCOME" as const,
            name,
          })),
        ],
      },
      tags: {
        create: template.tags.map((name) => ({ name })),
      },
      messageTemplates: {
        create: [
          {
            name: "Quote sent",
            category: "sales",
            body: "Hi {{name}}, I've shared your quote. Happy to help with any questions!",
          },
          {
            name: "Payment reminder",
            category: "finance",
            body: "Hi {{name}}, gentle reminder that your payment is due. Thank you!",
          },
        ],
      },
      automations: {
        create: [
          {
            key: "new_lead_followup",
            name: "Follow-up for new leads",
            enabled: true,
          },
        ],
      },
    },
  });

  return { businessId: business.id, created: true as const };
}
