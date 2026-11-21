import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff, canPaySalary, canViewPayroll } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { monthLabel } from "@/lib/payroll";
import {
  finalizePayroll,
  payPayrollLine,
  payAllPayroll,
  updatePayrollLine,
} from "@/app/actions/payroll";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  if (!canViewPayroll(ctx.role)) {
    return <p className="sp-card p-6">No access</p>;
  }

  const run = await prisma.payrollRun.findFirst({
    where: { id, businessId: ctx.businessId },
    include: {
      lines: {
        include: { staff: true },
        orderBy: { staff: { name: "asc" } },
      },
    },
  });
  if (!run) notFound();

  const unpaid = run.lines.filter((l) => l.status !== "PAID");

  return (
    <div>
      <PageHeader
        title={monthLabel(run.year, run.month)}
        actions={
          <Link href="/app/staff/payroll">
            <Button variant="secondary">All runs</Button>
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="sp-card p-4">
          <p className="text-xs text-zinc-500">Total payroll</p>
          <p className="mt-1 text-xl font-bold">{formatINR(run.totalPaise)}</p>
        </div>
        <div className="sp-card p-4">
          <p className="text-xs text-zinc-500">Status</p>
          <p className="mt-1 text-xl font-bold">{run.status}</p>
        </div>
        <div className="sp-card p-4">
          <p className="text-xs text-zinc-500">People</p>
          <p className="mt-1 text-xl font-bold">{run.lines.length}</p>
        </div>
        <div className="sp-card border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-800">Still to pay</p>
          <p className="mt-1 text-xl font-bold text-amber-900">
            {formatINR(unpaid.reduce((s, l) => s + l.netPaise, 0))}
          </p>
        </div>
      </div>

      {canManageStaff(ctx.role) && run.status === "DRAFT" && (
        <form action={finalizePayroll} className="mb-4">
          <input type="hidden" name="runId" value={run.id} />
          <Button type="submit" variant="secondary">
            Finalize for payment
          </Button>
        </form>
      )}

      {canPaySalary(ctx.role) && unpaid.length > 0 && run.status !== "DRAFT" && (
        <form
          action={payAllPayroll}
          className="mb-4 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="runId" value={run.id} />
          <Select name="paymentMode" defaultValue="UPI" className="w-auto">
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank transfer</option>
          </Select>
          <Button type="submit">Pay all unpaid</Button>
        </form>
      )}

      <ul className="space-y-3">
        {run.lines.map((line) => (
          <li key={line.id} className="sp-card sp-shadow p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-zinc-900">{line.staff.name}</p>
                <p className="text-sm text-zinc-500">
                  P {line.presentDays} · A {line.absentDays} · H {line.halfDays}
                  {line.overtimeMinutes
                    ? ` · OT ${line.overtimeMinutes}m`
                    : ""}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Base {formatINR(line.basePaise)}
                  {line.allowancePaise
                    ? ` + allow ${formatINR(line.allowancePaise)}`
                    : ""}
                  {line.overtimePaise
                    ? ` + OT ${formatINR(line.overtimePaise)}`
                    : ""}
                  {line.commissionPaise
                    ? ` + comm ${formatINR(line.commissionPaise)}`
                    : ""}
                  {line.bonusPaise
                    ? ` + bonus ${formatINR(line.bonusPaise)}`
                    : ""}
                  {line.absenceDeductionPaise
                    ? ` − absent ${formatINR(line.absenceDeductionPaise)}`
                    : ""}
                  {line.advanceDeductionPaise
                    ? ` − advance ${formatINR(line.advanceDeductionPaise)}`
                    : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{formatINR(line.netPaise)}</p>
                <p className="text-xs font-semibold text-zinc-500">
                  {line.status}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/app/staff/payroll/${run.id}/payslip/${line.id}`}
                className="inline-flex h-9 items-center rounded-xl border border-zinc-200 px-3 text-sm font-semibold"
              >
                Payslip
              </Link>

              {canManageStaff(ctx.role) && line.status !== "PAID" && (
                <form
                  action={updatePayrollLine}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="lineId" value={line.id} />
                  <Input
                    name="incentiveRupees"
                    type="number"
                    placeholder="Incentive ₹"
                    defaultValue={line.incentivePaise / 100 || ""}
                    className="h-9 w-28"
                  />
                  <Input
                    name="otherDeductionRupees"
                    type="number"
                    placeholder="Other − ₹"
                    defaultValue={line.otherDeductionPaise / 100 || ""}
                    className="h-9 w-28"
                  />
                  <Input
                    name="netRupees"
                    type="number"
                    placeholder="Net override ₹"
                    className="h-9 w-32"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    Save edit
                  </Button>
                </form>
              )}

              {canPaySalary(ctx.role) && line.status !== "PAID" && (
                <form
                  action={payPayrollLine}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="lineId" value={line.id} />
                  <Select
                    name="paymentMode"
                    defaultValue="UPI"
                    className="h-9 w-auto text-xs"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                  </Select>
                  <Button type="submit" size="sm">
                    Mark paid
                  </Button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
