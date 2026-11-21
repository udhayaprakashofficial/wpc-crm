"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Wallet,
  CheckSquare,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hasModule,
  moduleForNavHref,
  type CrmModuleKey,
} from "@/lib/modules";

const items = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/contacts", label: "Leads", icon: Users },
  { href: "/app/finance", label: "Payments", icon: Wallet },
  { href: "/app/tasks", label: "Follow-ups", icon: CheckSquare },
  { href: "/app/more", label: "More", icon: MoreHorizontal },
];

export function BottomNav({ modules }: { modules: CrmModuleKey[] }) {
  const pathname = usePathname();

  const visible = items.filter((item) => {
    const key = moduleForNavHref(item.href);
    return !key || hasModule(modules, key);
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {visible.map((item) => {
          const active =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-blue-600" : "text-zinc-500",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
