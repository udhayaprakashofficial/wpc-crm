import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canViewPayroll } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { monthLabel } from "@/lib/payroll";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/PrintButton";
import { BusinessLogo } from "@/components/BusinessLogo";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; lineId: string }>;
}) {
  const { id, lineId } = await params;
  const ctx = await requireTenant();
  if (!canViewPayroll(ctx.role) && ctx.role !== "STAFF") {
    return <p className="sp-card p-6">No access</p>;
  }

  const line = await prisma.payrollLine.findFirst({
    where: {
      id: lineId,
      payrollRunId: id,
      payrollRun: { businessId: ctx.businessId },
      ...(ctx.role === "STAFF" ? { staff: { userId: ctx.user.id } } : {}),
    },
    include: {
      staff: true,
      payrollRun: { include: { business: true } },
    },
  });
  if (!line) notFound();

  const business = line.payrollRun.business;
  const earnings =
    line.basePaise +
    line.allowancePaise +
    line.overtimePaise +
    line.commissionPaise +
    line.incentivePaise +
    line.bonusPaise;
  const deductions =
    line.absenceDeductionPaise +
    line.advanceDeductionPaise +
    line.otherDeductionPaise;

  const waText = encodeURIComponent(
    `Payslip — ${line.staff.name}\n${business.name}\n${monthLabel(line.payrollRun.year, line.payrollRun.month)}\nNet pay: ${formatINR(line.netPaise)}\nStatus: ${line.status}${line.paidAt ? `\nPaid: ${format(line.paidAt, "dd MMM yyyy")}` : ""}`,
  );
  const phone = line.staff.phone?.replace(/\D/g, "").slice(-10);
  const waHref = phone
    ? `https://wa.me/91${phone}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Link href={`/app/staff/payroll/${id}`}>
          <Button variant="secondary">Back</Button>
        </Link>
        <PrintButton />
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
        >
          Share WhatsApp
        </a>
      </div>

      <article className="sp-card sp-shadow p-6 print:border-0 print:shadow-none">
        <header className="border-b border-zinc-100 pb-4">
          <div className="mb-3 flex items-center gap-3">
            <BusinessLogo src={business.logoUrl} name={business.name} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Payslip
              </p>
              <h1 className="text-2xl font-bold text-zinc-950">{business.name}</h1>
            </div>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {monthLabel(line.payrollRun.year, line.payrollRun.month)}
          </p>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-zinc-500">Employee</p>
            <p className="font-semibold">{line.staff.name}</p>
            <p className="text-zinc-500">{line.staff.jobTitle || "Staff"}</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500">Status</p>
            <p className="font-semibold">{line.status}</p>
            {line.paidAt && (
              <p className="text-xs text-zinc-500">
                Paid {format(line.paidAt, "dd MMM yyyy")}
                {line.paymentMode ? ` · ${line.paymentMode}` : ""}
              </p>
            )}
          </div>
        </section>

        <section className="mt-5 text-sm">
          <p className="mb-2 font-semibold">Attendance</p>
          <p className="text-zinc-600">
            Present {line.presentDays} · Absent {line.absentDays} · Half-day{" "}
            {line.halfDays} · Leave {line.leaveDays} · OT {line.overtimeMinutes}{" "}
            min
          </p>
        </section>

        <section className="mt-5">
          <p className="mb-2 text-sm font-semibold">Earnings</p>
          <ul className="space-y-1 text-sm">
            <Row label="Basic" value={line.basePaise} />
            <Row label="Allowances" value={line.allowancePaise} />
            <Row label="Overtime" value={line.overtimePaise} />
            <Row label="Commission" value={line.commissionPaise} />
            <Row label="Incentive" value={line.incentivePaise} />
            <Row label="Target bonus" value={line.bonusPaise} />
            <li className="flex justify-between border-t border-zinc-100 pt-2 font-semibold">
              <span>Gross</span>
              <span>{formatINR(earnings)}</span>
            </li>
          </ul>
        </section>

        <section className="mt-5">
          <p className="mb-2 text-sm font-semibold">Deductions</p>
          <ul className="space-y-1 text-sm">
            <Row label="Absences" value={line.absenceDeductionPaise} />
            <Row label="Advance recovery" value={line.advanceDeductionPaise} />
            <Row label="Other" value={line.otherDeductionPaise} />
            <li className="flex justify-between border-t border-zinc-100 pt-2 font-semibold">
              <span>Total deductions</span>
              <span>{formatINR(deductions)}</span>
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-xl bg-zinc-950 px-4 py-4 text-white">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Net pay
          </p>
          <p className="mt-1 text-3xl font-bold">{formatINR(line.netPaise)}</p>
        </section>

        <p className="mt-6 text-center text-[11px] text-zinc-400">
          Generated by WPC CRM · Not a statutory Form-16. PF/ESI/TDS not
          included.
        </p>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <li className="flex justify-between text-zinc-700">
      <span>{label}</span>
      <span>{formatINR(value)}</span>
    </li>
  );
}
