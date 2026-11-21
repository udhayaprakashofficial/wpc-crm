import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageStaff } from "@/lib/permissions";
import { markAttendance, bulkMarkPresent } from "@/app/actions/attendance";
import { PageHeader } from "@/components/ui/page-header";
import { PillTabs } from "@/components/ui/pill-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateQ } = await searchParams;
  const ctx = await requireTenant();
  const dateStr = dateQ || new Date().toISOString().slice(0, 10);
  const date = new Date(dateStr);

  const staff = await prisma.staffMember.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      status: "ACTIVE",
      ...(ctx.role === "STAFF" ? { userId: ctx.user.id } : {}),
    },
    orderBy: { name: "asc" },
  });

  const marks = await prisma.attendance.findMany({
    where: {
      businessId: ctx.businessId,
      date,
      staffId: { in: staff.map((s) => s.id) },
    },
  });
  const byStaff = Object.fromEntries(marks.map((m) => [m.staffId, m]));
  const manage = canManageStaff(ctx.role);

  return (
    <div>
      <PageHeader title="Attendance" />
      <PillTabs
        items={[
          { href: "/app/staff", label: "People" },
          {
            href: "/app/staff/attendance",
            label: "Attendance",
            active: true,
          },
          { href: "/app/staff/payroll", label: "Payroll" },
          { href: "/app/staff/advances", label: "Advances" },
          { href: "/app/staff/reports", label: "Reports" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <form className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-medium text-zinc-700">
            Date
            <Input
              name="date"
              type="date"
              defaultValue={dateStr}
              className="mt-1 w-auto"
            />
          </label>
          <Button type="submit" variant="secondary">
            Go
          </Button>
        </form>
        {manage && (
          <form action={bulkMarkPresent}>
            <input type="hidden" name="date" value={dateStr} />
            <Button type="submit">Mark all present</Button>
          </form>
        )}
      </div>

      <p className="mb-3 text-sm text-zinc-500">
        {format(date, "EEEE, dd MMM yyyy")} · {staff.length} people
      </p>

      <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
        {staff.map((s) => {
          const mark = byStaff[s.id];
          return (
            <li key={s.id} className="px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">{s.name}</p>
                  <p className="text-sm text-zinc-500">
                    {mark
                      ? `${mark.status.replaceAll("_", " ")}${
                          mark.overtimeMinutes
                            ? ` · OT ${mark.overtimeMinutes}m`
                            : ""
                        }`
                      : "Not marked"}
                  </p>
                </div>
                <form
                  action={markAttendance}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="staffId" value={s.id} />
                  <input type="hidden" name="date" value={dateStr} />
                  <Select
                    name="status"
                    defaultValue={mark?.status ?? "PRESENT"}
                    className="h-9 w-auto text-xs"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half-day</option>
                    <option value="LEAVE">Leave</option>
                    <option value="HOLIDAY">Holiday</option>
                  </Select>
                  {manage && (
                    <Input
                      name="overtimeMinutes"
                      type="number"
                      placeholder="OT min"
                      defaultValue={mark?.overtimeMinutes || ""}
                      className="h-9 w-24"
                    />
                  )}
                  <Button type="submit" size="sm">
                    {mark ? "Update" : "Mark"}
                  </Button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
