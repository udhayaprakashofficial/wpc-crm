"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Kanban,
  CheckSquare,
  CalendarDays,
  Wallet,
  Target,
  MessageCircle,
  Settings,
  Sparkles,
  LayoutGrid,
  UserCog,
  Package,
  BriefcaseBusiness,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { SignOutButton } from "@/components/SignOutButton";
import { cn } from "@/lib/utils";
import {
  hasModule,
  moduleForNavHref,
  type CrmModuleKey,
} from "@/lib/modules";

const primary = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/contacts", label: "Leads", icon: Users },
  { href: "/app/finance", label: "Payments", icon: Wallet },
  { href: "/app/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
];

const soon = [{ href: "/app/ai", label: "WPC AI", icon: Sparkles }];

const apps = [
  { href: "/app/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/app/tasks", label: "Follow-ups", icon: CheckSquare },
  { href: "/app/appointments", label: "Schedule", icon: CalendarDays },
  { href: "/app/messages", label: "WhatsApp", icon: MessageCircle },
  { href: "/app/goals", label: "Goals", icon: Target },
  { href: "/app/supplies", label: "Supplies", icon: Package },
  { href: "/app/staff", label: "Staff pay", icon: UserCog },
];

function allowed(
  href: string,
  modules: readonly CrmModuleKey[],
) {
  const key = moduleForNavHref(href);
  return !key || hasModule(modules, key);
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-[#1f2937] text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar({
  businessName,
  businessLogoUrl,
  userName,
  modules,
}: {
  businessName: string;
  businessLogoUrl?: string | null;
  userName: string;
  modules: CrmModuleKey[];
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const primaryItems = primary.filter((item) => allowed(item.href, modules));
  const appItems = apps.filter((item) => allowed(item.href, modules));
  const showSettings = allowed("/app/settings", modules);

  return (
    <aside className="hidden h-full w-[248px] shrink-0 flex-col bg-[#0b0f14] text-white md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        {businessLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={businessLogoUrl}
            alt=""
            className="h-8 w-8 rounded-lg object-contain bg-white"
          />
        ) : (
          <AppLogo size={32} />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">
            {businessName}
          </p>
          <p className="truncate text-[11px] text-zinc-500">WPC CRM</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <div className="space-y-1">
          {primaryItems.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
            />
          ))}
        </div>

        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Coming soon
          </p>
          <div className="space-y-1">
            {soon.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  isActive(item.href)
                    ? "bg-[#1f2937] text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-md bg-blue-600/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                  Soon
                </span>
              </Link>
            ))}
          </div>
        </div>

        {appItems.length > 0 ? (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Your apps
            </p>
            <div className="space-y-1">
              {appItems.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <Link
          href="/app/more"
          className="mx-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-3 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/5"
        >
          <LayoutGrid className="h-4 w-4" />
          Explore all apps
        </Link>
      </nav>

      <div className="border-t border-white/10 p-3">
        {showSettings ? (
          <Link
            href="/app/settings"
            className={cn(
              "mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
              isActive("/app/settings")
                ? "bg-[#1f2937] text-white"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        ) : null}
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">{userName}</p>
            <p className="text-[11px] text-zinc-500">Workspace</p>
          </div>
        </div>
        <SignOutButton variant="sidebar" />
      </div>
    </aside>
  );
}
