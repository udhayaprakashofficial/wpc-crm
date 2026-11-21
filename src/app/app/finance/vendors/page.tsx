import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { createVendor } from "@/app/actions/finance-extra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function VendorsPage() {
  const ctx = await requireTenant();
  const vendors = await prisma.vendor.findMany({
    where: { businessId: ctx.businessId, deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Vendors</h2>
      <ul className="overflow-hidden rounded-2xl border bg-white">
        {vendors.length === 0 ? (
          <li className="p-4 text-sm text-slate-500">No vendors yet</li>
        ) : (
          vendors.map((v) => (
            <li key={v.id} className="border-b px-4 py-3 last:border-0">
              <p className="font-medium">{v.name}</p>
              <p className="text-sm text-slate-500">{v.phone || v.email || "—"}</p>
            </li>
          ))
        )}
      </ul>
      <form action={createVendor} className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Add vendor</h3>
        <Input name="name" required placeholder="Supplier name" />
        <Input name="phone" placeholder="Phone" />
        <Input name="email" type="email" placeholder="Email" />
        <Button type="submit" className="w-full">
          Save vendor
        </Button>
      </form>
    </div>
  );
}
