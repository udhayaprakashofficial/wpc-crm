import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff, canViewPayroll } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { monthLabel } from "@/lib/payroll";
import { generatePayroll } from "@/app/actions/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export default async function PayrollListPage() {
  const ctx = await requireTenant();
  if (!canViewPayroll(ctx.role)) {
    return <p className="sp-card p-6">No access</p>;
  }

  const runs = await prisma.payrollRun.findMany({
    where: { businessId: ctx.businessId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 24,
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <div>
      <PageHeader title="Payroll" />
      <PillTabs
        items={[
          { href: "/app/staff", label: "People" },
          { href: "/app/staff/attendance", label: "Attendance" },
          { href: "/app/staff/payroll", label: "Payroll", active: true },
          { href: "/app/staff/advances", label: "Advances" },
          { href: "/app/staff/reports", label: "Reports" },
        ]}
      />

      {canManageStaff(ctx.role) && (
        <form
          action={generatePayroll}
          className="sp-card sp-shadow mb-5 flex flex-wrap items-end gap-3 p-5"
        >
          <label className="text-sm font-medium">
            Year
            <Select name="year" defaultValue={String(year)} className="mt-1">
              {[year, year - 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm font-medium">
            Month
            <Select name="month" defaultValue={String(month)} className="mt-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString("en-IN", {
                    month: "long",
                  })}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit">Generate / refresh draft</Button>
          <p className="w-full text-xs text-zinc-500">
            Uses attendance, commissions from deals/appointments, advances, and
            target bonuses. Review before paying.
          </p>
        </form>
      )}

      <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
        {runs.length === 0 ? (
          <li className="px-5 py-8 text-sm text-zinc-500">
            No payroll runs yet. Generate this month&apos;s draft.
          </li>
        ) : (
          runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/app/staff/payroll/${run.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-semibold text-zinc-900">
                    {monthLabel(run.year, run.month)}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Due day {run.dueDay} · {run.status}
                  </p>
                </div>
                <p className="font-semibold">{formatINR(run.totalPaise)}</p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
