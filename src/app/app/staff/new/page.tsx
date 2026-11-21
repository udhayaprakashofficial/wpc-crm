import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff } from "@/lib/permissions";
import { createStaffMember } from "@/app/actions/staff";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewStaffPage() {
  const ctx = await requireTenant();
  if (!canManageStaff(ctx.role)) {
    return <p className="sp-card p-6">Only owners/managers can add staff.</p>;
  }

  const members = await prisma.membership.findMany({
    where: { businessId: ctx.businessId, deletedAt: null, isActive: true },
    include: { user: true },
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl pb-8">
      <PageHeader
        title="Add staff"
        actions={
          <Link href="/app/staff">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Profile, pay setup, and payout details. Scroll the page to see every
        section.
      </p>

      <form action={createStaffMember} className="space-y-5">
        <section className="sp-card sp-shadow space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Profile
          </h2>
          <Field label="Full name">
            <Input name="name" required placeholder="e.g. Priya Sharma" />
          </Field>
          <Field label="Phone">
            <Input name="phone" placeholder="+91…" />
          </Field>
          <Field label="Job title">
            <Input name="jobTitle" placeholder="e.g. Senior Stylist" />
          </Field>
          <Field label="Joining date">
            <Input name="joiningDate" type="date" required defaultValue={today} />
          </Field>
          <Field label="Link CRM login (optional)">
            <Select name="userId" defaultValue="">
              <option value="">No CRM login linked</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.role})
                </option>
              ))}
            </Select>
          </Field>
        </section>

        <section className="sp-card sp-shadow space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Salary
          </h2>
          <Field label="Salary type">
            <Select name="salaryType" defaultValue="MONTHLY_FIXED">
              <option value="MONTHLY_FIXED">Monthly fixed</option>
              <option value="DAILY_WAGE">Daily wage</option>
              <option value="HOURLY">Hourly</option>
              <option value="COMMISSION">Commission only</option>
              <option value="FIXED_PLUS_COMMISSION">Fixed + commission</option>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Basic / rate ₹">
              <Input name="basicRupees" type="number" required placeholder="18000" />
            </Field>
            <Field label="Allowances ₹ / month">
              <Input name="allowanceRupees" type="number" placeholder="2000" />
            </Field>
            <Field label="Overtime ₹ / hour">
              <Input name="overtimeRateRupees" type="number" placeholder="200" />
            </Field>
            <Field label="Target bonus ₹">
              <Input
                name="targetBonusRupees"
                type="number"
                placeholder="If goal hit"
              />
            </Field>
          </div>
        </section>

        <section className="sp-card sp-shadow space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Commission
          </h2>
          <Field label="Commission from CRM">
            <Select name="commissionBasis" defaultValue="NONE">
              <option value="NONE">No commission</option>
              <option value="DEAL_WON">% / flat on deals closed</option>
              <option value="APPOINTMENT_COMPLETED">
                Flat per appointment completed
              </option>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Commission %">
              <Input
                name="commissionPct"
                type="number"
                step="0.01"
                placeholder="e.g. 2"
              />
            </Field>
            <Field label="Flat commission ₹">
              <Input
                name="commissionFlatRupees"
                type="number"
                placeholder="e.g. 200"
              />
            </Field>
          </div>
        </section>

        <section className="sp-card sp-shadow space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Payout details
          </h2>
          <Field label="UPI ID">
            <Input name="upiId" placeholder="name@upi" />
          </Field>
          <Field label="Bank name">
            <Input name="bankName" placeholder="Bank name" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Account number">
              <Input name="accountNumber" placeholder="Account number" />
            </Field>
            <Field label="IFSC">
              <Input name="ifsc" placeholder="IFSC" />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea name="notes" placeholder="Optional notes" />
          </Field>
        </section>

        <div className="sticky bottom-20 z-10 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
          <Button type="submit" className="w-full" size="lg">
            Save staff
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      <span className="mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
