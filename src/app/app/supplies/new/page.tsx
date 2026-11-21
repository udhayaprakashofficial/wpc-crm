import Link from "next/link";
import type { ReactNode } from "react";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import { createSupply } from "@/app/actions/supplies";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewSupplyPage() {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return <p className="sp-card p-6">Only owners/managers can add supplies.</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Add supply"
        actions={
          <Link href="/app/supplies">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <form action={createSupply} className="sp-card sp-shadow space-y-3 p-5">
        <Field label="Name">
          <Input name="name" required placeholder="e.g. Hair colour — ash brown" />
        </Field>
        <Field label="SKU / code (optional)">
          <Input name="sku" placeholder="SKU-001" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit">
            <Select name="unit" defaultValue="PCS">
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
            <Input name="quantity" type="number" step="0.01" defaultValue={0} />
          </Field>
          <Field label="Reorder level">
            <Input
              name="reorderLevel"
              type="number"
              step="0.01"
              defaultValue={0}
            />
          </Field>
          <Field label="Category">
            <Input name="category" placeholder="Colour, gloves…" />
          </Field>
          <Field label="Cost ₹ / unit">
            <Input name="costRupees" type="number" step="0.01" placeholder="0" />
          </Field>
          <Field label="Sell ₹ / unit">
            <Input name="sellRupees" type="number" step="0.01" placeholder="0" />
          </Field>
        </div>
        <Field label="Vendor / supplier">
          <Input name="vendorName" placeholder="Supplier name" />
        </Field>
        <Field label="Notes">
          <Textarea name="notes" placeholder="Optional" />
        </Field>
        <Button type="submit" className="w-full">
          Save supply
        </Button>
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
