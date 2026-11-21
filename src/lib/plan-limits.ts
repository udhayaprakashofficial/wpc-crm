import { prisma } from "@/lib/prisma";
import {
  ALL_FEATURES,
  FREE_FOREVER_FEATURES,
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
  /** True when the business has no active paid subscription. */
  trialExpired: boolean;
  isPaid: boolean;
  onTrial: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
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

  // No subscription / unpaid — lock product until Razorpay activates a plan
  if (!sub || sub.plan.pricePaise <= 0) {
    return {
      maxUsers: 1,
      maxContacts: 0,
      features: { ...FREE_FOREVER_FEATURES },
      planCode: PLAN_DEFS.free_trial.code,
      planName: "Unpaid",
      canDeleteContacts: false,
      trialDaysLeft: null,
      trialExpired: true,
      isPaid: false,
      onTrial: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
    };
  }

  const now = Date.now();
  const end = sub.currentPeriodEnd.getTime();
  // Keep access while period is active (incl. PAST_DUE retries); lock when expired/cancelled
  const periodActive = end >= now;
  const effectivePaid =
    sub.plan.pricePaise > 0 &&
    periodActive &&
    (sub.status === "ACTIVE" || sub.status === "PAST_DUE");

  const stored =
    sub.plan.features && typeof sub.plan.features === "object"
      ? (sub.plan.features as Record<string, boolean>)
      : {};
  const features = effectivePaid
    ? { ...ALL_FEATURES, ...stored }
    : { ...FREE_FOREVER_FEATURES };

  return {
    maxUsers: sub.plan.maxUsers,
    maxContacts: effectivePaid ? sub.plan.maxContacts : 0,
    features,
    planCode: sub.plan.code,
    planName: effectivePaid ? sub.plan.name : "Unpaid",
    canDeleteContacts: features.canDeleteContacts === true,
    trialDaysLeft: null,
    trialExpired: !effectivePaid,
    isPaid: effectivePaid,
    onTrial: false,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

export function hasFeature(limits: PlanLimits, key: string) {
  if (limits.isPaid) {
    return limits.features[key] !== false;
  }
  return limits.features[key] === true;
}

/** Modules available before payment (billing / settings only). */
export const UNPAID_MODULES: CrmModuleKey[] = ["settings"];

export function modulesAllowedByPlan(limits: PlanLimits): CrmModuleKey[] | "all" {
  if (limits.isPaid) return "all";
  return UNPAID_MODULES;
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
  if (!limits.isPaid) {
    throw new Error("Subscribe to a plan to add contacts.");
  }
  const count = await prisma.contact.count({
    where: { businessId, deletedAt: null },
  });
  if (count >= limits.maxContacts) {
    throw new Error(
      `Contact limit reached (${limits.maxContacts}). Contact support if you need more.`,
    );
  }
}

export async function assertCanDeleteContacts(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!limits.canDeleteContacts) {
    throw new Error("Subscribe to delete contacts.");
  }
}

export async function assertFeature(businessId: string, key: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!hasFeature(limits, key)) {
    throw new Error("This feature requires an active subscription. Choose Monthly or Yearly.");
  }
}

export async function assertPortfolioWrite(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!hasFeature(limits, "portfolioWrite")) {
    throw new Error("Portfolio edits require an active subscription.");
  }
}

export async function assertPortfolioImport(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!hasFeature(limits, "portfolioImport")) {
    throw new Error("Campaign import requires an active subscription.");
  }
}

export async function assertUserLimit(businessId: string) {
  const limits = await getBusinessPlanLimits(businessId);
  if (!limits.isPaid) {
    throw new Error("Subscribe to invite team members.");
  }
  const count = await prisma.membership.count({
    where: { businessId, deletedAt: null, isActive: true },
  });
  if (count >= limits.maxUsers) {
    throw new Error(
      `Team limit reached (${limits.maxUsers}) on ${limits.planName}.`,
    );
  }
}
