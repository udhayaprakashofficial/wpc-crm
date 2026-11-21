import Link from "next/link";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { updateAppointmentStatus } from "@/app/actions/appointments";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function AppointmentsPage() {
  const ctx = await requireTenant();
  const from = startOfDay(new Date());
  const to = endOfDay(addDays(new Date(), 14));

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: ctx.businessId,
      deletedAt: null,
      startsAt: { gte: from, lte: to },
    },
    include: { contact: true, assignedTo: true },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Schedule"
        actions={
          <Link href="/app/appointments/new">
            <Button>+ Booking</Button>
          </Link>
        }
      />

      {appointments.length === 0 ? (
        <div className="sp-card px-5 py-8 text-sm text-zinc-500">
          No bookings in the next 14 days.
        </div>
      ) : (
        <ul className="sp-card sp-shadow divide-y divide-zinc-100 overflow-hidden">
          {appointments.map((a) => (
            <li key={a.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">{a.title}</p>
                  <p className="text-sm text-zinc-500">
                    {a.contact.name} · {format(a.startsAt, "dd MMM, h:mm a")}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {a.assignedTo?.name || "Unassigned"} · {a.status}
                  </p>
                </div>
                <form
                  action={updateAppointmentStatus}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="id" value={a.id} />
                  <Select
                    name="status"
                    defaultValue={a.status}
                    className="h-9 text-xs"
                  >
                    <option value="BOOKED">Booked</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="NO_SHOW">No-show</option>
                    <option value="CANCELLED">Cancelled</option>
                  </Select>
                  <button
                    type="submit"
                    className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Update
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
