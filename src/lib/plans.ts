/** Canonical SaaS plans — keep seed, onboarding, and billing in sync. */

/** Full product access (Paid + active Free trial). */
export const ALL_FEATURES = {
  pipeline: true,
  tasks: true,
  leadForm: true,
  finance: true,
  invoices: true,
  whatsapp: true,
  goals: true,
  appointments: true,
  supplies: true,
  staff: true,
  reports: true,
  brand: true,
  ai: true,
  automations: true,
  portfolio: true,
  portfolioWrite: true,
  portfolioImport: true,
  canDeleteContacts: true,
} as const;

/** Free during 7-day trial — everything unlocked except contact delete. */
export const FREE_TRIAL_FEATURES = {
  ...ALL_FEATURES,
  canDeleteContacts: false,
} as const;

/**
 * Free forever after trial:
 * - 25 contacts / leads
 * - Pipeline
 * - Portfolio view only (no import / no edits)
 * - Settings kept so they can upgrade
 */
export const FREE_FOREVER_FEATURES = {
  pipeline: true,
  tasks: false,
  leadForm: true,
  finance: false,
  invoices: false,
  whatsapp: false,
  goals: false,
  appointments: false,
  supplies: false,
  staff: false,
  reports: false,
  brand: false,
  ai: false,
  automations: false,
  portfolio: true,
  portfolioWrite: false,
  portfolioImport: false,
  canDeleteContacts: false,
} as const;

export const FREE_FEATURE_LABELS = [
  "7-day Pro trial (all features)",
  "Then forever: 25 leads / contacts",
  "Pipeline forever",
  "Portfolio view only (no import or edits)",
] as const;

export const PAID_FEATURE_LABELS = [
  "Unlimited leads & pipeline",
  "Follow-ups & schedule",
  "Payments, invoices & expenses",
  "WhatsApp messages",
  "Goals & reports",
  "Supplies & staff pay",
  "Brand kit",
  "Portfolio import & campaign edits",
  "1,000 contacts · delete anytime",
] as const;

export const PLAN_DEFS = {
  free_trial: {
    code: "free_trial",
    name: "Free",
    pricePaise: 0,
    intervalMonths: 1,
    maxUsers: 99,
    maxContacts: 25,
    trialDays: 7,
    /** Stored on Plan row; runtime applies FREE_TRIAL vs FREE_FOREVER by trial status. */
    features: FREE_TRIAL_FEATURES,
  },
  /** @deprecated Kept for existing DB rows — billing no longer offers monthly. */
  paid_monthly: {
    code: "paid_monthly",
    name: "Pro (Monthly)",
    pricePaise: 174_900, // legacy; inactive
    intervalMonths: 1,
    maxUsers: 99,
    maxContacts: 1000,
    features: ALL_FEATURES,
    active: false as const,
  },
  paid_yearly: {
    code: "paid_yearly",
    name: "Pro",
    pricePaise: 174_900, // ₹1,749 / year
    intervalMonths: 12,
    maxUsers: 99,
    maxContacts: 1000,
    features: ALL_FEATURES,
  },
} as const;

export const LEGACY_PLAN_CODES = ["starter", "pro", "paid_monthly"] as const;
