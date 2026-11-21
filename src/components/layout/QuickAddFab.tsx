"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus, UserPlus, IndianRupee, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasModule, type CrmModuleKey } from "@/lib/modules";
import { helpEmail, helpMailto, helpWhatsAppUrl } from "@/lib/help";

const HELP_NAME = "Udhayaprakash Mohan";
const HELP_PHOTO = "/brand/help-udhayaprakash.jpg";
const HELP_MAIL = helpEmail();

export function QuickAddFab({ modules }: { modules: CrmModuleKey[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-8 md:right-8">
      {open && (
        <div className="mb-3 flex flex-col items-end gap-2">
          {hasModule(modules, "leads") ? (
            <FabLink href="/app/contacts/new" label="Lead" icon={UserPlus} />
          ) : null}
          {hasModule(modules, "finance") ? (
            <FabLink
              href="/app/finance/expense/new"
              label="Expense"
              icon={IndianRupee}
            />
          ) : null}
          {hasModule(modules, "tasks") ? (
            <FabLink href="/app/tasks/new" label="Follow-up" icon={Bell} />
          ) : null}
          <a
            href={helpMailto()}
            className="flex max-w-[16rem] items-center gap-2.5 rounded-full border border-zinc-200 bg-white py-2 pl-2.5 pr-4 text-sm shadow-md"
          >
            <Image
              src={HELP_PHOTO}
              alt={HELP_NAME}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-emerald-100"
            />
            <span className="min-w-0 text-left leading-tight">
              <span className="block text-[11px] font-medium text-emerald-700">
                Support · Email
              </span>
              <span className="block truncate font-semibold text-zinc-900">
                {HELP_MAIL}
              </span>
            </span>
          </a>
          <a
            href={helpWhatsAppUrl(
              `Hi ${HELP_NAME.split(" ")[0]} — I need help with WPC CRM.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="flex max-w-[16rem] items-center gap-2.5 rounded-full border border-zinc-200 bg-white py-2 pl-2.5 pr-4 text-sm shadow-md"
          >
            <Image
              src={HELP_PHOTO}
              alt={HELP_NAME}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-emerald-100"
            />
            <span className="min-w-0 text-left leading-tight">
              <span className="block text-[11px] font-medium text-emerald-700">
                Help chat · WhatsApp
              </span>
              <span className="block truncate font-semibold text-zinc-900">
                {HELP_NAME}
              </span>
            </span>
          </a>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label="Quick add"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-lg shadow-blue-600/25 transition hover:bg-[#1d4ed8]",
          open && "rotate-45",
        )}
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

function FabLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Plus;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white py-2 pl-3 pr-4 text-sm font-semibold text-zinc-800 shadow-md"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}
