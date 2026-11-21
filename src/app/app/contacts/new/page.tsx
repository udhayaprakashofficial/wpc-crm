import { createContact } from "@/app/actions/contacts";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewContactPage() {
  const ctx = await requireTenant();
  const members = await prisma.membership.findMany({
    where: { businessId: ctx.businessId, isActive: true, deletedAt: null },
    include: { user: { select: { id: true, name: true } } },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultFollowUp = tomorrow.toISOString().slice(0, 16);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Add lead</h2>
      <p className="text-sm text-slate-600">Name and phone are enough to start.</p>

      <form action={createContact} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="block space-y-2 text-sm font-medium">
          Name
          <Input name="name" required placeholder="Priya Sharma" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Phone
          <Input name="phone" required inputMode="tel" placeholder="9876543210" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Email (optional)
          <Input name="email" type="email" placeholder="priya@email.com" />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Source
          <Select name="source" defaultValue="WALK_IN">
            <option value="WALK_IN">Walk-in</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK_AD">Facebook Ad</option>
            <option value="GOOGLE">Google</option>
            <option value="WEBSITE">Website</option>
            <option value="REFERRAL">Referral</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="OTHER">Other</option>
          </Select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Assign to
          <Select name="assignedToId" defaultValue={ctx.user.id}>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Notes
          <Textarea name="notes" placeholder="Interested in bridal package" />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="createFollowUp" defaultChecked className="h-4 w-4" />
          Create first follow-up
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Follow-up at
          <Input name="followUpAt" type="datetime-local" defaultValue={defaultFollowUp} />
        </label>
        <Button type="submit" className="w-full" size="lg">
          Save lead
        </Button>
      </form>
    </div>
  );
}
