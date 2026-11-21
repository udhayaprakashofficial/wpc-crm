import { startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canViewPayroll } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { monthLabel, summarizeAttendance } from "@/lib/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";

export default async function StaffReportsPage() {
  const ctx = await requireTenant();
  if (!canViewPayroll(ctx.role)) {
    return <p className="sp-card p-6">No access</p>;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [run, incomeMonth, advances, staff, attendance] = await Promise.all([
    prisma.payrollRun.findUnique({
      where: {
        businessId_year_month: {
          businessId: ctx.businessId,
          year,
          month,
        },
      },
      include: {
        lines: { include: { staff: true }, orderBy: { staff: { name: "asc" } } },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        businessId: ctx.businessId,
        type: "INCOME",
        deletedAt: null,
        occurredAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amountPaise: true },
    }),
    prisma.salaryAdvance.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        status: "ACTIVE",
        remainingPaise: { gt: 0 },
      },
    }),
    prisma.staffMember.findMany({
      where: {
        businessId: ctx.businessId,
        deletedAt: null,
        status: "ACTIVE",
      },
      orderBy: { name: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        businessId: ctx.businessId,
        date: { gte: monthStart, lte: monthEnd },
      },
    }),
  ]);

  const payrollCost = run?.totalPaise ?? 0;
  const revenue = incomeMonth._sum.amountPaise ?? 0;
  const costPct =
    revenue > 0 ? Math.round((payrollCost / revenue) * 1000) / 10 : 0;
  const advancesTotal = advances.reduce((s, a) => s + a.remainingPaise, 0);

  const attByStaff = new Map<string, typeof attendance>();
  for (const row of attendance) {
    const list = attByStaff.get(row.staffId) ?? [];
    list.push(row);
    attByStaff.set(row.staffId, list);
  }

  return (
    <div>
      <PageHeader title="Staff reports" />
      <PillTabs
        items={[
          { href: "/app/staff", label: "People" },
          { href: "/app/staff/attendance", label: "Attendance" },
          { href: "/app/staff/payroll", label: "Payroll" },
          { href: "/app/staff/advances", label: "Advances" },
          { href: "/app/staff/reports", label: "Reports", active: true },
        ]}
      />

      <p className="mb-4 text-sm text-zinc-500">
        {monthLabel(year, month)} · PF/ESI/TDS not tracked (Pro later)
      </p>

      <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Payroll cost" value={formatINR(payrollCost)} />
        <Card label="Revenue (month)" value={formatINR(revenue)} />
        <Card label="Staff cost % of revenue" value={`${costPct}%`} />
        <Card label="Advances outstanding" value={formatINR(advancesTotal)} />
      </section>

      <section className="sp-card sp-shadow mb-5 p-5">
        <h3 className="font-semibold">Monthly salary sheet</h3>
        {!run || run.lines.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No payroll generated for this month yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {run.lines.map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span>
                  {l.staff.name}
                  <span className="text-zinc-400"> · {l.status}</span>
                </span>
                <span className="font-medium">{formatINR(l.netPaise)}</span>
              </li>
            ))}
            <li className="flex justify-between py-2 font-semibold">
              <span>Total</span>
              <span>{formatINR(run.totalPaise)}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="sp-card sp-shadow p-5">
        <h3 className="font-semibold">Attendance summary</h3>
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {staff.map((s) => {
            const summary = summarizeAttendance(attByStaff.get(s.id) ?? []);
            return (
              <li key={s.id} className="flex justify-between py-2">
                <span>{s.name}</span>
                <span className="text-zinc-600">
                  P{summary.presentDays} A{summary.absentDays} H
                  {summary.halfDays} L{summary.leaveDays}
                  {summary.overtimeMinutes
                    ? ` · OT ${summary.overtimeMinutes}m`
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="sp-card sp-shadow p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-950">{value}</p>
    </div>
  );
}
