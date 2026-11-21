import { createTask } from "@/app/actions/tasks";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ contactId?: string }>;
}) {
  const { contactId } = await searchParams;
  const ctx = await requireTenant();
  const contacts = await prisma.contact.findMany({
    where: { businessId: ctx.businessId, deletedAt: null },
    orderBy: { name: "asc" },
    take: 200,
    select: { id: true, name: true },
  });

  const defaultDue = new Date();
  defaultDue.setHours(defaultDue.getHours() + 2);
  const dueValue = defaultDue.toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-2xl font-semibold">New follow-up</h2>
      <form action={createTask} className="space-y-4 rounded-2xl border bg-white p-5">
        <label className="block space-y-2 text-sm font-medium">
          Title
          <Input name="title" required placeholder="Call back about package" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Due
          <Input name="dueAt" type="datetime-local" required defaultValue={dueValue} />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Contact
          <Select name="contactId" defaultValue={contactId || ""}>
            <option value="">None</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Priority
          <Select name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Note
          <Textarea name="note" />
        </label>
        <Button type="submit" className="w-full" size="lg">
          Save follow-up
        </Button>
      </form>
    </div>
  );
}
