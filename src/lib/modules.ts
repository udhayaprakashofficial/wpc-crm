import type { Role } from "@/generated/prisma/client";

export const CRM_MODULE_KEYS = [
  "leads",
  "pipeline",
  "tasks",
  "appointments",
  "finance",
  "portfolio",
  "goals",
  "messages",
  "supplies",
  "staff",
  "reports",
  "settings",
] as const;

export type CrmModuleKey = (typeof CRM_MODULE_KEYS)[number];

export type CrmModuleDef = {
  key: CrmModuleKey;
  label: string;
  description: string;
  /** Path prefixes this module unlocks */
  paths: string[];
};

export const CRM_MODULES: CrmModuleDef[] = [
  {
    key: "leads",
    label: "Leads & contacts",
    description: "View and edit leads, customers, segments",
    paths: ["/app/contacts"],
  },
  {
    key: "pipeline",
    label: "Pipeline",
    description: "Deals and stages",
    paths: ["/app/pipeline"],
  },
  {
    key: "tasks",
    label: "Follow-ups",
    description: "Tasks and reminders",
    paths: ["/app/tasks"],
  },
  {
    key: "appointments",
    label: "Schedule",
    description: "Bookings and appointments",
    paths: ["/app/appointments"],
  },
  {
    key: "finance",
    label: "Payments & finance",
    description: "Income, expenses, invoices",
    paths: ["/app/finance"],
  },
  {
    key: "portfolio",
    label: "Portfolio",
    description: "Client campaigns and analytics",
    paths: ["/app/portfolio"],
  },
  {
    key: "goals",
    label: "Goals",
    description: "Targets and pace",
    paths: ["/app/goals"],
  },
  {
    key: "messages",
    label: "WhatsApp",
    description: "Messages and broadcasts",
    paths: ["/app/messages"],
  },
  {
    key: "supplies",
    label: "Supplies",
    description: "Stock list and imports",
    paths: ["/app/supplies"],
  },
  {
    key: "staff",
    label: "Staff pay",
    description: "Attendance, payroll, payslips",
    paths: ["/app/staff"],
  },
  {
    key: "reports",
    label: "Reports",
    description: "Source ROI and analytics",
    paths: ["/app/reports"],
  },
  {
    key: "settings",
    label: "Settings",
    description: "Business, brand, billing (limited)",
    paths: ["/app/settings", "/app/business"],
  },
];

const KEY_SET = new Set<string>(CRM_MODULE_KEYS);

export function isCrmModuleKey(value: string): value is CrmModuleKey {
  return KEY_SET.has(value);
}

export function allModuleKeys(): CrmModuleKey[] {
  return [...CRM_MODULE_KEYS];
}

/** Sensible defaults when inviting by role (owner can still tweak). */
export function defaultModulesForRole(role: Role): CrmModuleKey[] {
  switch (role) {
    case "OWNER":
      return allModuleKeys();
    case "MANAGER":
      return allModuleKeys();
    case "ACCOUNTANT":
      return ["finance", "reports", "goals", "settings"];
    case "STAFF":
    default:
      return ["leads", "pipeline", "tasks", "appointments", "messages"];
  }
}

export function parseModuleAccess(raw: unknown): CrmModuleKey[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const keys = raw
    .map((v) => String(v))
    .filter(isCrmModuleKey);
  return keys.length ? Array.from(new Set(keys)) : [];
}

/**
 * Resolve effective modules for a membership.
 * Owner always gets everything. Null access → role defaults.
 */
export function resolveMemberModules(input: {
  role: Role;
  moduleAccess: unknown;
}): CrmModuleKey[] {
  if (input.role === "OWNER") return allModuleKeys();
  const parsed = parseModuleAccess(input.moduleAccess);
  if (parsed == null) return defaultModulesForRole(input.role);
  return parsed;
}

export function hasModule(
  modules: readonly CrmModuleKey[],
  key: CrmModuleKey,
) {
  return modules.includes(key);
}

export function moduleForPath(pathname: string): CrmModuleKey | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  // Always allowed shells
  if (
    normalized === "/app" ||
    normalized === "/app/more" ||
    normalized.startsWith("/app/ai")
  ) {
    return null;
  }

  for (const mod of CRM_MODULES) {
    if (
      mod.paths.some(
        (p) => normalized === p || normalized.startsWith(`${p}/`),
      )
    ) {
      return mod.key;
    }
  }
  return null;
}

export function canAccessPath(
  modules: readonly CrmModuleKey[],
  pathname: string,
) {
  const needed = moduleForPath(pathname);
  if (!needed) return true;
  return hasModule(modules, needed);
}

/** Map nav href → module (home/more/ai are open). */
export function moduleForNavHref(href: string): CrmModuleKey | null {
  if (href === "/app" || href === "/app/more" || href.startsWith("/app/ai")) {
    return null;
  }
  return moduleForPath(href);
}
