import Link from "next/link";
import { notFound } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff } from "@/lib/permissions";
import { formatINR } from "@/lib/money";
import {
  updateStaffMember,
  addStaffDocument,
  createSalaryAdvance,
} from "@/app/actions/staff";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { summarizeAttendance } from "@/lib/payroll";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const staff = await prisma.staffMember.findFirst({
    where: {
      id,
      businessId: ctx.businessId,
      deletedAt: null,
      ...(ctx.role === "STAFF" ? { userId: ctx.user.id } : {}),
    },
    include: {
      documents: { orderBy: { createdAt: "desc" } },
      advances: {
        where: { deletedAt: null },
        orderBy: { givenAt: "desc" },
      },
      user: { select: { name: true, email: true } },
    },
  });
  if (!staff) notFound();

  const canEdit = canManageStaff(ctx.role);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const attendance = await prisma.attendance.findMany({
    where: {
      staffId: staff.id,
      date: { gte: monthStart, lte: monthEnd },
    },
  });
  const summary = summarizeAttendance(attendance);
  const members = canEdit
    ? await prisma.membership.findMany({
        where: {
          businessId: ctx.businessId,
          deletedAt: null,
          isActive: true,
        },
        include: { user: true },
      })
    : [];

  const advanceBalance = staff.advances
    .filter((a) => a.status === "ACTIVE")
    .reduce((s, a) => s + a.remainingPaise, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={staff.name}
        actions={
          <Link href="/app/staff">
            <Button variant="secondary">All staff</Button>
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Present" value={String(summary.presentDays)} />
        <Stat label="Absent" value={String(summary.absentDays)} />
        <Stat label="Half-day" value={String(summary.halfDays)} />
        <Stat label="Advance due" value={formatINR(advanceBalance)} />
      </div>

      {canEdit ? (
        <form
          action={updateStaffMember}
          className="sp-card sp-shadow mb-5 space-y-3 p-5"
        >
          <input type="hidden" name="id" value={staff.id} />
          <h3 className="font-semibold">Profile & pay</h3>
          <Input name="name" defaultValue={staff.name} required />
          <Input name="phone" defaultValue={staff.phone ?? ""} />
          <Input name="jobTitle" defaultValue={staff.jobTitle ?? ""} />
          <Select name="status" defaultValue={staff.status}>
            <option value="ACTIVE">Active</option>
            <option value="LEFT">Left</option>
          </Select>
          <Input
            name="leftAt"
            type="date"
            defaultValue={
              staff.leftAt ? staff.leftAt.toISOString().slice(0, 10) : ""
            }
          />
          <Select name="salaryType" defaultValue={staff.salaryType}>
            <option value="MONTHLY_FIXED">Monthly fixed</option>
            <option value="DAILY_WAGE">Daily wage</option>
            <option value="HOURLY">Hourly</option>
            <option value="COMMISSION">Commission only</option>
            <option value="FIXED_PLUS_COMMISSION">Fixed + commission</option>
          </Select>
          <Input
            name="basicRupees"
            type="number"
            defaultValue={staff.basicPaise / 100}
          />
          <Input
            name="allowanceRupees"
            type="number"
            defaultValue={staff.allowancePaise / 100}
          />
          <Input
            name="overtimeRateRupees"
            type="number"
            defaultValue={staff.overtimeRatePaise / 100}
          />
          <Select name="commissionBasis" defaultValue={staff.commissionBasis}>
            <option value="NONE">No commission</option>
            <option value="DEAL_WON">Deals closed</option>
            <option value="APPOINTMENT_COMPLETED">Appointments</option>
          </Select>
          <Input
            name="commissionPct"
            type="number"
            step="0.01"
            defaultValue={staff.commissionBps / 100}
          />
          <Input
            name="commissionFlatRupees"
            type="number"
            defaultValue={staff.commissionFlatPaise / 100}
          />
          <Input
            name="targetBonusRupees"
            type="number"
            defaultValue={staff.targetBonusPaise / 100}
          />
          <Select name="userId" defaultValue={staff.userId ?? ""}>
            <option value="">No CRM login</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </Select>
          <Input name="upiId" defaultValue={staff.upiId ?? ""} placeholder="UPI" />
          <Input
            name="bankName"
            defaultValue={staff.bankName ?? ""}
            placeholder="Bank"
          />
          <Input
            name="accountNumber"
            defaultValue={staff.accountNumber ?? ""}
            placeholder="Account"
          />
          <Input name="ifsc" defaultValue={staff.ifsc ?? ""} placeholder="IFSC" />
          <Textarea name="notes" defaultValue={staff.notes ?? ""} />
          <Button type="submit" className="w-full">
            Save changes
          </Button>
        </form>
      ) : (
        <div className="sp-card sp-shadow mb-5 p-5 text-sm">
          <p>
            <span className="text-zinc-500">Role:</span> {staff.jobTitle || "—"}
          </p>
          <p className="mt-1">
            <span className="text-zinc-500">Pay:</span>{" "}
            {formatINR(staff.basicPaise)} ({staff.salaryType})
          </p>
          {staff.user && (
            <p className="mt-1 text-zinc-500">Login: {staff.user.email}</p>
          )}
        </div>
      )}

      <section className="sp-card sp-shadow mb-5 p-5">
        <h3 className="font-semibold">Documents</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Paste Drive / WhatsApp file links for ID proof or offer letter.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {staff.documents.length === 0 && (
            <li className="text-zinc-500">No documents yet</li>
          )}
          {staff.documents.map((d) => (
            <li key={d.id}>
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600"
              >
                {d.label}
              </a>
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={addStaffDocument} className="mt-4 space-y-2">
            <input type="hidden" name="staffId" value={staff.id} />
            <Input name="label" required placeholder="Label (e.g. Aadhaar)" />
            <Input name="url" required placeholder="https://…" />
            <Button type="submit" variant="secondary" className="w-full">
              Add document link
            </Button>
          </form>
        )}
      </section>

      <section className="sp-card sp-shadow mb-5 p-5">
        <h3 className="font-semibold">Advances & loans</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {staff.advances.length === 0 && (
            <li className="text-zinc-500">No advances</li>
          )}
          {staff.advances.map((a) => (
            <li key={a.id} className="flex justify-between">
              <span>
                {formatINR(a.amountPaise)} · {a.status}
                <span className="text-zinc-400">
                  {" "}
                  · {format(a.givenAt, "dd MMM yyyy")}
                </span>
              </span>
              <span className="font-medium">
                left {formatINR(a.remainingPaise)}
              </span>
            </li>
          ))}
        </ul>
        {canEdit && (
          <form action={createSalaryAdvance} className="mt-4 space-y-2">
            <input type="hidden" name="staffId" value={staff.id} />
            <Input
              name="amountRupees"
              type="number"
              required
              placeholder="Advance ₹"
            />
            <Input
              name="monthsTotal"
              type="number"
              defaultValue={3}
              placeholder="Repay over months"
            />
            <Input name="note" placeholder="Note" />
            <Button type="submit" variant="secondary" className="w-full">
              Record advance
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sp-card p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
