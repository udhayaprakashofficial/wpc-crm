import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { createAppointment } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function NewAppointmentPage() {
  const ctx = await requireTenant();
  const [contacts, members] = await Promise.all([
    prisma.contact.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.membership.findMany({
      where: { businessId: ctx.businessId, isActive: true, deletedAt: null },
      include: { user: true },
    }),
  ]);

  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 2, 0, 0, 0);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-2xl font-semibold">New appointment</h2>
      <form action={createAppointment} className="space-y-4 rounded-2xl border bg-white p-5">
        <label className="block space-y-2 text-sm font-medium">
          Contact
          <Select name="contactId" required>
            <option value="">Select</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <Input name="title" required placeholder="Haircut / Consultation" />
        <Input name="serviceName" placeholder="Service name" />
        <Input
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={defaultStart.toISOString().slice(0, 16)}
        />
        <Input name="durationMins" type="number" defaultValue={60} />
        <Select name="assignedToId" defaultValue={ctx.user.id}>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.user.name}
            </option>
          ))}
        </Select>
        <Button type="submit" className="w-full" size="lg">
          Book
        </Button>
      </form>
    </div>
  );
}
