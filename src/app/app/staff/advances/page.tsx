import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canViewPayroll } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";

export default async function AdvancesPage() {
  const ctx = await requireTenant();
  if (!canViewPayroll(ctx.role)) {
    return <p className="sp-card p-6">No access</p>;
  }

  const advances = await prisma.salaryAdvance.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      status: "ACTIVE",
      remainingPaise: { gt: 0 },
    },
    include: { staff: true },
    orderBy: { givenAt: "desc" },
  });

  const total = advances.reduce((s, a) => s + a.remainingPaise, 0);

  return (
    <div>
      <PageHeader title="Advances outstanding" />
      <PillTabs
        items={[
          { href: "/app/staff", label: "People" },
          { href: "/app/staff/attendance", label: "Attendance" },
          { href: "/app/staff/payroll", label: "Payroll" },
          { href: "/app/staff/advances", label: "Advances", active: true },
          { href: "/app/staff/reports", label: "Reports" },
        ]}
      />

      <div className="sp-card sp-shadow mb-5 border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          <span className="font-semibold">{formatINR(total)}</span> still to
          recover across {advances.length} advance
          {advances.length === 1 ? "" : "s"}
        </p>
      </div>

      <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
        {advances.length === 0 ? (
          <li className="px-5 py-8 text-sm text-zinc-500">
            No open advances.
          </li>
        ) : (
          advances.map((a) => (
            <li key={a.id}>
              <Link
                href={`/app/staff/${a.staffId}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{a.staff.name}</p>
                  <p className="text-sm text-zinc-500">
                    Given {formatINR(a.amountPaise)} on{" "}
                    {format(a.givenAt, "dd MMM yyyy")} ·{" "}
                    {a.monthsPaid}/{a.monthsTotal} months recovered
                  </p>
                </div>
                <p className="font-semibold text-amber-700">
                  {formatINR(a.remainingPaise)}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
