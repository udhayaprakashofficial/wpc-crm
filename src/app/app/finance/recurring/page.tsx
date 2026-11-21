import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import {
  createRecurringExpense,
  runDueRecurringRules,
} from "@/app/actions/finance-extra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function RecurringPage() {
  const ctx = await requireTenant();
  const [rules, categories, vendors] = await Promise.all([
    prisma.recurringRule.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
      include: { category: true },
      orderBy: { nextRunAt: "asc" },
    }),
    prisma.category.findMany({
      where: { businessId: ctx.businessId, kind: "EXPENSE", deletedAt: null },
    }),
    prisma.vendor.findMany({
      where: { businessId: ctx.businessId, deletedAt: null },
    }),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Recurring expenses</h2>
        <form action={runDueRecurringRules}>
          <Button type="submit" variant="secondary">
            Run due now
          </Button>
        </form>
      </div>

      <ul className="overflow-hidden rounded-2xl border bg-white">
        {rules.length === 0 ? (
          <li className="p-4 text-sm text-slate-500">No recurring rules</li>
        ) : (
          rules.map((r) => (
            <li key={r.id} className="flex justify-between border-b px-4 py-3 last:border-0">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-sm text-slate-500">
                  {r.category?.name} · next {format(r.nextRunAt, "dd MMM")}
                </p>
              </div>
              <p className="font-semibold">{formatINR(r.amountPaise)}</p>
            </li>
          ))
        )}
      </ul>

      <form action={createRecurringExpense} className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Add monthly rule</h3>
        <Input name="title" required placeholder="Shop rent" />
        <Input name="amountRupees" type="number" required placeholder="25000" />
        <Select name="categoryId" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="vendorId">
          <option value="">No vendor</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
        <Input name="dayOfMonth" type="number" min={1} max={28} defaultValue={1} />
        <Button type="submit" className="w-full">
          Save rule
        </Button>
      </form>
    </div>
  );
}
