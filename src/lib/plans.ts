/** Canonical SaaS plans — keep seed, onboarding, and billing in sync. */

/** Full product access on any paid plan (monthly or yearly). */
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

/** @deprecated Free / trial removed — kept for reading old DB rows only. */
export const FREE_FOREVER_FEATURES = {
  pipeline: false,
  tasks: false,
  leadForm: false,
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
  portfolio: false,
  portfolioWrite: false,
  portfolioImport: false,
  canDeleteContacts: false,
} as const;

export const PAID_FEATURE_LABELS = [
  "Leads & pipeline management",
  "Lead form",
  "Team invites",
  "Follow-ups & schedule",
  "Payments, invoices & expenses",
  "WhatsApp from lead profiles",
  "Goals & reports",
  "Supplies & staff pay",
  "Brand kit",
  "Portfolio import & campaign edits",
  "Monthly 1,000 contacts · can import · Delete anytime",
] as const;

/** ₹399 / month */
export const MONTHLY_PRICE_PAISE = 39_900;
/** 2 months free → pay for 10 months: ₹3,990 / year */
export const YEARLY_PRICE_PAISE = MONTHLY_PRICE_PAISE * 10;

export const PLAN_DEFS = {
  /** @deprecated Inactive — billing is paid-only. */
  free_trial: {
    code: "free_trial",
    name: "Free",
    pricePaise: 0,
    intervalMonths: 1,
    maxUsers: 99,
    maxContacts: 25,
    trialDays: 0,
    features: FREE_FOREVER_FEATURES,
    active: false as const,
  },
  paid_monthly: {
    code: "paid_monthly",
    name: "Monthly",
    pricePaise: MONTHLY_PRICE_PAISE,
    intervalMonths: 1,
    maxUsers: 99,
    maxContacts: 1000,
    features: ALL_FEATURES,
  },
  paid_yearly: {
    code: "paid_yearly",
    name: "Yearly",
    pricePaise: YEARLY_PRICE_PAISE,
    intervalMonths: 12,
    maxUsers: 99,
    maxContacts: 1000,
    features: ALL_FEATURES,
  },
} as const;

export const LEGACY_PLAN_CODES = ["starter", "pro", "free_trial"] as const;
