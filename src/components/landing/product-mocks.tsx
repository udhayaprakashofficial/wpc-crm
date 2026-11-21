import type { ReactNode } from "react";

/** Compact product UI illustrations for the landing / auth surfaces. */

function Shell({
  active,
  children,
  className = "",
}: {
  active: string;
  children: ReactNode;
  className?: string;
}) {
  const nav = [
    "Home",
    "Leads",
    "Payments",
    "Portfolio",
    "Pipeline",
    "Follow-ups",
  ];
  return (
    <div
      className={`flex h-full min-h-[220px] overflow-hidden rounded-[inherit] bg-[#f4f5f7] text-left ${className}`}
    >
      <aside className="hidden w-[118px] shrink-0 flex-col bg-[#0b1220] px-2.5 py-3 text-[9px] text-slate-400 sm:flex">
        <div className="mb-3 flex items-center gap-1.5 px-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4f46e5] text-[8px] font-bold text-white">
            W
          </span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold text-white">
              Glow Salon
            </p>
            <p className="truncate text-[8px] text-slate-500">WPC CRM</p>
          </div>
        </div>
        <ul className="space-y-0.5">
          {nav.map((item) => (
            <li
              key={item}
              className={`rounded-md px-2 py-1.5 ${
                item === active
                  ? "bg-white/10 font-semibold text-white"
                  : "text-slate-500"
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4">{children}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm">
      <p className="text-[8px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-0.5 text-[8px] text-slate-500">{hint}</p>
    </div>
  );
}

export function DashboardMock({ compact = false }: { compact?: boolean }) {
  return (
    <Shell active="Home" className={compact ? "min-h-[200px]" : "min-h-[280px]"}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold tracking-tight text-slate-950 sm:text-base">
            Good morning
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Money owed, profit, follow-ups — nothing slips.
          </p>
        </div>
        <span className="rounded-lg bg-[#4f46e5] px-2.5 py-1 text-[9px] font-semibold text-white">
          + Lead
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        <Metric label="Customers owe" value="₹48,200" hint="6 open invoices" />
        <Metric label="Profit this month" value="₹1.24L" hint="In ₹2.1L · Out ₹86k" />
        <Metric label="Goal pace" value="72%" hint="On track for FY" />
        <Metric label="Follow-ups due" value="5" hint="2 overdue · 3 today" />
      </div>

      {!compact && (
        <>
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-800">
                FY 2026–27 revenue goal
              </p>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[8px] font-semibold text-emerald-700">
                On pace
              </span>
            </div>
            <p className="mt-1 text-[12px] font-bold text-slate-950">
              ₹17.3L <span className="font-medium text-slate-400">/ ₹24L</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#4f46e5] to-sky-400" />
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
              <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                Money customers owe
              </p>
              <ul className="mt-2 space-y-1.5">
                {[
                  ["Priya Nair", "₹12,400"],
                  ["Aarav Clinic", "₹18,000"],
                  ["Meera Bridal", "₹9,800"],
                ].map(([name, amt]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="font-semibold text-slate-950">{amt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
              <p className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                Quotes waiting
              </p>
              <ul className="mt-2 space-y-1.5">
                {[
                  ["Wedding package — Riya", "₹45k"],
                  ["Corporate grooming", "₹22k"],
                  ["Keratin + colour", "₹8.5k"],
                ].map(([name, amt]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="truncate font-medium text-slate-700">
                      {name}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-950">
                      {amt}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

export function LeadsMock() {
  const rows = [
    ["Ananya S.", "WhatsApp", "Hot", "Today"],
    ["Karthik M.", "Instagram", "Warm", "Yesterday"],
    ["Sneha R.", "Walk-in", "New", "2d ago"],
    ["Vikram P.", "Referral", "Quoted", "3d ago"],
  ];
  return (
    <Shell active="Leads">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-950">Leads</p>
        <span className="rounded-lg bg-[#4f46e5] px-2.5 py-1 text-[9px] font-semibold text-white">
          + Lead
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {["All (48)", "Hot (6)", "Quoted (9)"].map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-2 py-0.5 text-[8px] font-semibold ${
              i === 0
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-4 gap-1 border-b border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
          <span>Name</span>
          <span>Source</span>
          <span>Status</span>
          <span>Updated</span>
        </div>
        {rows.map(([name, source, status, when]) => (
          <div
            key={name}
            className="grid grid-cols-4 gap-1 border-b border-slate-50 px-2.5 py-2 text-[10px] last:border-0"
          >
            <span className="font-semibold text-slate-800">{name}</span>
            <span className="text-slate-500">{source}</span>
            <span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                  status === "Hot"
                    ? "bg-rose-50 text-rose-600"
                    : status === "Quoted"
                      ? "bg-indigo-50 text-indigo-600"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {status}
              </span>
            </span>
            <span className="text-slate-400">{when}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function PipelineMock() {
  const cols = [
    {
      title: "New",
      color: "bg-slate-400",
      deals: [
        ["Bridal enquiry", "₹45k"],
        ["Men’s package", "₹6k"],
      ],
    },
    {
      title: "Contacted",
      color: "bg-sky-500",
      deals: [["Keratin trial", "₹8.5k"]],
    },
    {
      title: "Quote sent",
      color: "bg-violet-500",
      deals: [
        ["Studio event", "₹32k"],
        ["Staff grooming", "₹18k"],
      ],
    },
    {
      title: "Won",
      color: "bg-emerald-500",
      deals: [["Mehendi + hair", "₹22k"]],
    },
  ];
  return (
    <Shell active="Pipeline">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-slate-950">Pipeline</p>
          <p className="text-[9px] text-slate-500">6 deals · open value ₹1.31L</p>
        </div>
        <span className="rounded-lg bg-[#4f46e5] px-2.5 py-1 text-[9px] font-semibold text-white">
          + Deal
        </span>
      </div>
      <div className="mt-3 flex gap-2 overflow-hidden">
        {cols.map((col) => (
          <div
            key={col.title}
            className="min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white/80 p-1.5"
          >
            <div className="mb-1.5 flex items-center gap-1 px-1">
              <span className={`h-1.5 w-1.5 rounded-full ${col.color}`} />
              <p className="text-[9px] font-semibold text-slate-700">{col.title}</p>
            </div>
            <div className="space-y-1.5">
              {col.deals.map(([title, value]) => (
                <div
                  key={title}
                  className="rounded-lg border border-slate-100 bg-white px-2 py-1.5 shadow-sm"
                >
                  <p className="truncate text-[9px] font-semibold text-slate-800">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold text-[#4f46e5]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function PortfolioMock() {
  const campaigns = [
    ["Instagram Reels — Bridal", "₹18,400", "42 leads", "₹438 CPL"],
    ["Google Ads — Walk-ins", "₹9,200", "28 leads", "₹329 CPL"],
    ["WhatsApp broadcast", "₹1,200", "61 leads", "₹20 CPL"],
  ];
  return (
    <Shell active="Portfolio">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-950">Campaigns</p>
        <span className="text-[9px] font-semibold text-[#4f46e5]">
          This month
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Metric label="Ad spend" value="₹28.8k" hint="3 active" />
        <Metric label="Leads" value="131" hint="+24% vs last" />
        <Metric label="Sales" value="₹2.4L" hint="18 closed" />
      </div>
      <div className="mt-2.5 space-y-1.5">
        {campaigns.map(([name, spend, leads, cpl]) => (
          <div
            key={name}
            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold text-slate-800">
                {name}
              </p>
              <p className="mt-0.5 text-[8px] text-slate-500">
                {leads} · {cpl}
              </p>
            </div>
            <p className="shrink-0 text-[11px] font-bold text-slate-950">{spend}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function FollowupsMock() {
  const items = [
    ["Call Priya — quote review", "Overdue", "rose"],
    ["WhatsApp Karthik — deposit", "Today 11:30", "amber"],
    ["Confirm bridal trial — Riya", "Today 4:00", "sky"],
    ["Win-back: inactive 60+ days", "Tomorrow", "slate"],
  ] as const;
  return (
    <Shell active="Follow-ups">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-slate-950">Follow-ups</p>
          <p className="text-[9px] text-slate-500">5 due · 1 overdue</p>
        </div>
        <span className="rounded-lg bg-[#4f46e5] px-2.5 py-1 text-[9px] font-semibold text-white">
          + Task
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {items.map(([title, when, tone]) => (
          <li
            key={title}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2 shadow-sm"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                tone === "rose"
                  ? "bg-rose-500"
                  : tone === "amber"
                    ? "bg-amber-400"
                    : tone === "sky"
                      ? "bg-sky-500"
                      : "bg-slate-400"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-slate-800">
                {title}
              </p>
              <p
                className={`text-[8px] font-medium ${
                  tone === "rose" ? "text-rose-600" : "text-slate-500"
                }`}
              >
                {when}
              </p>
            </div>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-700">
              WhatsApp
            </span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function FinanceMock() {
  return (
    <Shell active="Payments">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-950">Payments</p>
        <span className="text-[9px] font-semibold text-slate-500">Nov 2026</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Metric label="Collected" value="₹2.1L" hint="41 payments" />
        <Metric label="Outstanding" value="₹48.2k" hint="6 invoices" />
        <Metric label="Staff pay" value="₹86k" hint="Due 1st" />
      </div>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {[
          ["UPI · Ananya S.", "₹4,800", "Paid"],
          ["Card · Bridal package", "₹22,000", "Paid"],
          ["Invoice · Aarav Clinic", "₹18,000", "Due"],
          ["Cash · Walk-in colour", "₹3,200", "Paid"],
        ].map(([label, amt, status]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-slate-50 px-2.5 py-2 text-[10px] last:border-0"
          >
            <div>
              <p className="font-semibold text-slate-800">{label}</p>
              <p
                className={`text-[8px] font-medium ${
                  status === "Due" ? "text-amber-600" : "text-emerald-600"
                }`}
              >
                {status}
              </p>
            </div>
            <p className="font-bold text-slate-950">{amt}</p>
          </div>
        ))}
      </div>
    </Shell>
  );
}

export function WhatsAppMock() {
  return (
    <Shell active="Leads">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-950">Contact</p>
        <span className="rounded-lg bg-[#25D366] px-2.5 py-1 text-[9px] font-semibold text-white">
          Open WhatsApp
        </span>
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-[#4f46e5]">
            AS
          </span>
          <div>
            <p className="text-[12px] font-bold text-slate-900">Ananya S.</p>
            <p className="text-[9px] text-slate-500">+91 98765 43210 · Hot lead</p>
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-[9px]">
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt className="text-slate-400">Source</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">Instagram</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt className="text-slate-400">Interest</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">Bridal package</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt className="text-slate-400">Quote</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">₹45,000</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt className="text-slate-400">Next step</dt>
            <dd className="mt-0.5 font-semibold text-slate-800">Send deposit link</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/80 px-2.5 py-2 text-[9px] leading-4 text-emerald-800">
          One tap opens WhatsApp with her number filled — no digging through
          chat lists.
        </p>
      </div>
    </Shell>
  );
}

export type MockKind =
  | "dashboard"
  | "leads"
  | "pipeline"
  | "portfolio"
  | "followups"
  | "finance"
  | "whatsapp";

export function ProductMock({
  kind,
  className = "",
  compact,
}: {
  kind: MockKind;
  className?: string;
  compact?: boolean;
}) {
  const map = {
    dashboard: <DashboardMock compact={compact} />,
    leads: <LeadsMock />,
    pipeline: <PipelineMock />,
    portfolio: <PortfolioMock />,
    followups: <FollowupsMock />,
    finance: <FinanceMock />,
    whatsapp: <WhatsAppMock />,
  } as const;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-24px_rgba(79,70,229,0.35)] ${className}`}
    >
      {map[kind]}
    </div>
  );
}
