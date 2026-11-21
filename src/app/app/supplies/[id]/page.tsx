import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import { updateSupply, deleteSupply } from "@/app/actions/supplies";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function SupplyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();
  const item = await prisma.supplyItem.findFirst({
    where: { id, businessId: ctx.businessId, deletedAt: null },
  });
  if (!item) notFound();

  const canEdit = canManageSettings(ctx.role);
  const lowStock = item.quantity <= item.reorderLevel;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={item.name}
        actions={
          <Link href="/app/supplies">
            <Button variant="secondary">All supplies</Button>
          </Link>
        }
      />

      {lowStock && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Low stock — {item.quantity} left (reorder at {item.reorderLevel}).
        </div>
      )}

      {canEdit ? (
        <>
          <form action={updateSupply} className="sp-card sp-shadow space-y-3 p-5">
            <input type="hidden" name="id" value={item.id} />
            <Field label="Name">
              <Input name="name" defaultValue={item.name} required />
            </Field>
            <Field label="SKU">
              <Input name="sku" defaultValue={item.sku ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit">
                <Select name="unit" defaultValue={item.unit}>
                  <option value="PCS">Pcs</option>
                  <option value="BOX">Box</option>
                  <option value="KG">Kg</option>
                  <option value="LITRE">Litre</option>
                  <option value="ML">ml</option>
                  <option value="PACK">Pack</option>
                  <option value="SET">Set</option>
                  <option value="OTHER">Other</option>
                </Select>
              </Field>
              <Field label="Quantity">
                <Input
                  name="quantity"
                  type="number"
                  step="0.01"
                  defaultValue={item.quantity}
                />
              </Field>
              <Field label="Reorder level">
                <Input
                  name="reorderLevel"
                  type="number"
                  step="0.01"
                  defaultValue={item.reorderLevel}
                />
              </Field>
              <Field label="Category">
                <Input name="category" defaultValue={item.category ?? ""} />
              </Field>
              <Field label="Cost ₹">
                <Input
                  name="costRupees"
                  type="number"
                  step="0.01"
                  defaultValue={item.costPaise / 100}
                />
              </Field>
              <Field label="Sell ₹">
                <Input
                  name="sellRupees"
                  type="number"
                  step="0.01"
                  defaultValue={item.sellPaise / 100}
                />
              </Field>
            </div>
            <Field label="Vendor">
              <Input name="vendorName" defaultValue={item.vendorName ?? ""} />
            </Field>
            <Field label="Notes">
              <Textarea name="notes" defaultValue={item.notes ?? ""} />
            </Field>
            <Button type="submit" className="w-full">
              Save changes
            </Button>
          </form>

          <form action={deleteSupply} className="mt-4">
            <input type="hidden" name="id" value={item.id} />
            <Button type="submit" variant="danger" className="w-full">
              Delete supply
            </Button>
          </form>
        </>
      ) : (
        <div className="sp-card p-5 text-sm text-zinc-600">
          <p>
            Qty: {item.quantity} {item.unit}
          </p>
          <p className="mt-1">Vendor: {item.vendorName || "—"}</p>
        </div>
      )}
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
