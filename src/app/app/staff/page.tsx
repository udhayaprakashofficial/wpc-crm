import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff, canViewPayroll } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StaffPage() {
  const ctx = await requireTenant();
  if (!canViewPayroll(ctx.role) && ctx.role !== "STAFF") {
    return <p className="sp-card p-6">No access</p>;
  }

  const staff = await prisma.staffMember.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      ...(ctx.role === "STAFF" ? { userId: ctx.user.id } : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  const active = staff.filter((s) => s.status === "ACTIVE");
  const payrollCost = active.reduce(
    (sum, s) => sum + s.basicPaise + s.allowancePaise,
    0,
  );

  return (
    <div>
      <PageHeader
        title="Staff & salary"
        actions={
          canManageStaff(ctx.role) ? (
            <div className="flex gap-2">
              <Link href="/app/staff/attendance">
                <Button variant="secondary">Attendance</Button>
              </Link>
              <Link href="/app/staff/payroll">
                <Button variant="secondary">Payroll</Button>
              </Link>
              <Link href="/app/staff/new">
                <Button>+ Staff</Button>
              </Link>
            </div>
          ) : (
            <Link href="/app/staff/attendance">
              <Button>Check in</Button>
            </Link>
          )
        }
      />

      <PillTabs
        items={[
          { href: "/app/staff", label: "People", active: true },
          { href: "/app/staff/attendance", label: "Attendance" },
          { href: "/app/staff/payroll", label: "Payroll" },
          { href: "/app/staff/advances", label: "Advances" },
          { href: "/app/staff/reports", label: "Reports" },
        ]}
      />

      {canManageStaff(ctx.role) && active.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="sp-card sp-shadow p-4">
            <p className="text-xs text-zinc-500">Active staff</p>
            <p className="mt-1 text-xl font-bold">{active.length}</p>
          </div>
          <div className="sp-card sp-shadow p-4">
            <p className="text-xs text-zinc-500">Est. monthly base</p>
            <p className="mt-1 text-xl font-bold">{formatINR(payrollCost)}</p>
          </div>
          <Link
            href="/app/staff/payroll"
            className="sp-card sp-shadow border-amber-200 bg-amber-50 p-4"
          >
            <p className="text-xs text-amber-800">Salaries due</p>
            <p className="mt-1 text-sm font-semibold text-amber-900">
              Run payroll →
            </p>
          </Link>
        </div>
      )}

      {staff.length === 0 ? (
        <EmptyState
          title="Add your first staff member"
          description="Track attendance, advances, and salary — PF/ESI can come later."
          action={
            canManageStaff(ctx.role) ? (
              <Link href="/app/staff/new">
                <Button>+ Staff</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {staff.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/staff/${s.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-semibold text-zinc-900">{s.name}</p>
                  <p className="text-sm text-zinc-500">
                    {s.jobTitle || "Staff"}
                    {s.phone ? ` · ${s.phone}` : ""}
                    {" · joined "}
                    {format(s.joiningDate, "dd MMM yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      s.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {s.status}
                  </span>
                  <p className="mt-1 text-sm font-medium text-zinc-700">
                    {formatINR(s.basicPaise)}
                    <span className="text-xs font-normal text-zinc-400">
                      {" "}
                      / {s.salaryType.replaceAll("_", " ").toLowerCase()}
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
