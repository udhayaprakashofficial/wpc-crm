import { prisma } from "@/lib/prisma";
import {
  ALL_FEATURES,
  FREE_FOREVER_FEATURES,
  FREE_TRIAL_FEATURES,
  PLAN_DEFS,
} from "@/lib/plans";
import type { CrmModuleKey } from "@/lib/modules";

export type PlanLimits = {
  maxUsers: number;
  maxContacts: number;
  features: Record<string, boolean>;
  planCode: string;
  planName: string;
  canDeleteContacts: boolean;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  isPaid: boolean;
  /** True while Free trial is still running (full access). */
  onTrial: boolean;
};

export async function getBusinessPlanLimits(
  businessId: string,
): Promise<PlanLimits> {
  const sub = await prisma.subscription.findFirst({
    where: {
      businessId,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const fallback = PLAN_DEFS.free_trial;
  if (!sub) {
    return {
      maxUsers: fallback.maxUsers,
      maxContacts: fallback.maxContacts,
      features: { ...FREE_TRIAL_FEATURES },
      planCode: fallback.code,
      planName: fallback.name,
      canDeleteContacts: false,
      trialDaysLeft: fallback.trialDays,
      trialExpired: false,
      isPaid: false,
      onTrial: true,
    };
  }

  const isPaid = sub.plan.pricePaise > 0;
  const now = Date.now();
  const end = sub.currentPeriodEnd.getTime();
  const onTrial = !isPaid && sub.status === "TRIALING" && end >= now;
  const trialExpired = !isPaid && !onTrial;
  const trialDaysLeft = onTrial
    ? Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)))
    : !isPaid
      ? 0
      : null;

  let features: Record<string, boolean>;
  if (isPaid) {
    const stored =
      sub.plan.features && typeof sub.plan.features === "object"
        ? (sub.plan.features as Record<string, boolean>)
        : {};
    features = { ...ALL_FEATURES, ...stored };
  } else if (onTrial) {
    features = { ...FREE_TRIAL_FEATURES };
  } else {
    features = { ...FREE_FOREVER_FEATURES };
  }

  return {
    maxUsers: sub.plan.maxUsers,
    maxContacts: sub.plan.maxContacts,
    features,
    planCode: sub.plan.code,
    planName: isPaid ? sub.plan.name : "Free",
    canDeleteContacts: features.canDeleteContacts === true,
    trialDaysLeft,
    trialExpired,
    isPaid,
    onTrial,
  };
}

export function hasFeature(limits: PlanLimits, key: string) {
  if (limits.isPaid || limits.onTrial) {
    return limits.features[key] !== false;
  }
  return limits.features[key] === true;
}

/** Modules a Free-forever user may still open. */
export const FREE_FOREVER_MODULES: CrmModuleKey[] = [
  "leads",
  "pipeline",
  "portfolio",
  "settings",
];

export function modulesAllowedByPlan(limits: PlanLimits): CrmModuleKey[] | "all" {
  if (limits.isPaid || limits.onTrial) return "all";
  return FREE_FOREVER_MODULES;
}

export function filterModulesByPlan<T extends string>(
  modules: T[],
  limits: PlanLimits,
): T[] {
  const allowed = modulesAllowedByPlan(limits);
  if (allowed === "all") return modules;
  const set = new Set<string>(allowed);
  return modules.filter((m) => set.has(m));
}

export async function assertContactLimit(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  const count = await prisma.contact.count({
    where: { businessId, deletedAt: null },
  });
  if (count >= limits.maxContacts) {
    throw new Error(
      limits.trialExpired
        ? `Free plan allows ${limits.maxContacts} contacts. Upgrade to Pro for more.`
        : `Contact limit reached (${limits.maxContacts}). Upgrade to add more.`,
    );
  }
}

export async function assertCanDeleteContacts(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!limits.canDeleteContacts) {
    throw new Error(
      "Deleting contacts is available on Pro. Upgrade to free up slots.",
    );
  }
}

export async function assertFeature(businessId: string, key: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!hasFeature(limits, key)) {
    throw new Error(
      limits.trialExpired
        ? "This feature is locked on Free after your trial. Upgrade to Pro."
        : "This feature is not available on your plan. Upgrade to Pro.",
    );
  }
}

export async function assertPortfolioWrite(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!hasFeature(limits, "portfolioWrite")) {
    throw new Error(
      "Portfolio edits are locked on Free. Upgrade to Pro to update campaigns and values.",
    );
  }
}

export async function assertPortfolioImport(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!hasFeature(limits, "portfolioImport")) {
    throw new Error(
      "Campaign import is locked on Free. Upgrade to Pro to import reports.",
    );
  }
}

export async function assertUserLimit(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  const count = await prisma.membership.count({
    where: { businessId, deletedAt: null, isActive: true },
  });
  if (count >= limits.maxUsers) {
    throw new Error(
      `Team limit reached (${limits.maxUsers}) on ${limits.planName}.`,
    );
  }
}
