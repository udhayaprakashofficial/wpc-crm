import { createExpense } from "@/app/actions/finance";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function NewExpensePage() {
  const ctx = await requireTenant();
  const categories = await prisma.category.findMany({
    where: {
      businessId: ctx.businessId,
      kind: "EXPENSE",
      deletedAt: null,
    },
    orderBy: { name: "asc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-2xl font-semibold">Quick expense</h2>
      <p className="text-sm text-slate-600">Amount, category, done — under 10 seconds.</p>
      <form action={createExpense} className="space-y-4 rounded-2xl border bg-white p-5">
        <label className="block space-y-2 text-sm font-medium">
          Amount (₹)
          <Input
            name="amountRupees"
            type="number"
            min={1}
            step="0.01"
            required
            placeholder="500"
            inputMode="decimal"
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Category
          <Select name="categoryId" required defaultValue={categories[0]?.id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Payment mode
          <Select name="paymentMode" defaultValue="UPI">
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="BANK">Bank</option>
            <option value="CHEQUE">Cheque</option>
            <option value="OTHER">Other</option>
          </Select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Date
          <Input name="occurredAt" type="date" required defaultValue={today} />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          Note
          <Textarea name="note" placeholder="Tea for staff" />
        </label>
        <Button type="submit" className="w-full" size="lg">
          Save expense
        </Button>
      </form>
    </div>
  );
}
