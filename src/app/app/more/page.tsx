import Link from "next/link";
import {
  Wallet,
  Target,
  CalendarDays,
  MessageCircle,
  BarChart3,
  Sparkles,
  Settings,
  Upload,
  Download,
  Kanban,
  CheckSquare,
  UserCog,
  Users,
  Package,
  Palette,
  BriefcaseBusiness,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requireTenant } from "@/lib/tenant";
import {
  hasModule,
  moduleForNavHref,
  type CrmModuleKey,
} from "@/lib/modules";
import {
  filterModulesByPlan,
  getBusinessPlanLimits,
} from "@/lib/plan-limits";

const sections: {
  title: string;
  items: {
    href: string;
    label: string;
    desc: string;
    icon: LucideIcon;
  }[];
}[] = [
  {
    title: "Sales & customers",
    items: [
      { href: "/app/contacts", label: "Leads", desc: "Contacts & segments", icon: Users },
      { href: "/app/pipeline", label: "Pipeline", desc: "Deals by stage", icon: Kanban },
      { href: "/app/tasks", label: "Follow-ups", desc: "Tasks & reminders", icon: CheckSquare },
      { href: "/app/appointments", label: "Schedule", desc: "Bookings & reminders", icon: CalendarDays },
      {
        href: "/app/messages",
        label: "WhatsApp",
        desc: "Send & broadcast · automations coming soon",
        icon: MessageCircle,
      },
      {
        href: "/app/portfolio",
        label: "Portfolio",
        desc: "Client campaigns, analytics & PDF",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    title: "Money & stock",
    items: [
      { href: "/app/finance", label: "Payments", desc: "Income, expenses, invoices", icon: Wallet },
      {
        href: "/app/supplies",
        label: "Supplies",
        desc: "Stock list, low-stock alerts, cost value",
        icon: Package,
      },
      {
        href: "/app/supplies/import",
        label: "Import supplies",
        desc: "Upload supplies CSV (name, qty, cost…)",
        icon: Upload,
      },
      {
        href: "/app/supplies/export",
        label: "Export supplies",
        desc: "Download supplies CSV",
        icon: Download,
      },
      { href: "/app/staff", label: "Staff & salary", desc: "Attendance, payroll, payslips", icon: UserCog },
      { href: "/app/goals", label: "Goals", desc: "Targets, pace, staff", icon: Target },
      { href: "/app/reports/roi", label: "Source ROI", desc: "Leads, wins, cost per lead", icon: BarChart3 },
    ],
  },
  {
    title: "Contacts data",
    items: [
      {
        href: "/app/contacts/import",
        label: "Import contacts",
        desc: "Contacts CSV only",
        icon: Upload,
      },
      {
        href: "/app/contacts/export",
        label: "Export contacts",
        desc: "Contacts CSV only",
        icon: Download,
      },
    ],
  },
  {
    title: "Workspace",
    items: [
      {
        href: "/app/ai",
        label: "WPC AI",
        desc: "Coming soon — drafts, scores, weekly summary",
        icon: Sparkles,
      },
      {
        href: "/app/settings/brand",
        label: "Brand kit",
        desc: "Logo for invoices, payslips, sidebar",
        icon: Palette,
      },
      { href: "/app/settings", label: "Settings", desc: "Business, team, billing", icon: Settings },
    ],
  },
];

function canSee(href: string, modules: CrmModuleKey[]) {
  const key = moduleForNavHref(href);
  return !key || hasModule(modules, key);
}

export default async function MorePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const params = await searchParams;
  const ctx = await requireTenant();
  const limits = await getBusinessPlanLimits(ctx.businessId);
  const modules = filterModulesByPlan(ctx.modules, limits);

  return (
    <div>
      <PageHeader title="Explore apps" />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Only areas you were given access to are listed here.
      </p>

      {params.denied ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You don’t have access to that area.{" "}
          {limits.trialExpired
            ? "Upgrade to Pro, or ask the owner for access."
            : "Ask the owner to grant it in Team settings."}
        </p>
      ) : null}

      {limits.trialExpired && !limits.isPaid ? (
        <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          Free forever: leads (25), pipeline, and portfolio view.{" "}
          <Link href="/app/settings/billing" className="font-semibold text-emerald-800 underline">
            Upgrade to Pro · ₹1,749/yr
          </Link>
        </p>
      ) : null}

      <div className="space-y-6">
        {sections.map((section) => {
          const items = section.items.filter((link) =>
            canSee(link.href, modules),
          );
          if (items.length === 0) return null;
          return (
            <section key={section.title}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                {section.title}
              </h2>
              <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
                {items.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900">
                            {link.label}
                          </p>
                          <p className="text-sm text-zinc-500">{link.desc}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
