import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { formatINR } from "@/lib/money";
import { createBudget } from "@/app/actions/finance-extra";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { startOfMonth } from "date-fns";

export default async function BudgetsPage() {
  const ctx = await requireTenant();
  const fyYear = new Date().getFullYear();
  const monthStart = startOfMonth(new Date());

  const [budgets, categories, spent] = await Promise.all([
    prisma.budget.findMany({
      where: { businessId: ctx.businessId, fyYear },
      include: { category: true },
    }),
    prisma.category.findMany({
      where: { businessId: ctx.businessId, kind: "EXPENSE", deletedAt: null },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        businessId: ctx.businessId,
        type: "EXPENSE",
        deletedAt: null,
        occurredAt: { gte: monthStart },
      },
      _sum: { amountPaise: true },
    }),
  ]);

  const spentMap = Object.fromEntries(
    spent.map((s) => [s.categoryId ?? "", s._sum.amountPaise ?? 0]),
  );

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold">Budgets</h2>
      <ul className="space-y-3">
        {budgets.map((b) => {
          const used = spentMap[b.categoryId] ?? 0;
          const pct = b.limitPaise > 0 ? Math.round((used / b.limitPaise) * 100) : 0;
          return (
            <li key={b.id} className="rounded-2xl border bg-white p-4">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{b.category.name}</span>
                <span>
                  {formatINR(used)} / {formatINR(b.limitPaise)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full ${pct >= 100 ? "bg-red-600" : pct >= 80 ? "bg-amber-500" : "bg-teal-600"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              {pct >= 80 && (
                <p className="mt-2 text-xs font-medium text-amber-700">
                  {pct >= 100 ? "Budget exceeded" : "Alert: 80%+ used"}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <form action={createBudget} className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Set category budget</h3>
        <Select name="categoryId" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input name="limitRupees" type="number" required placeholder="Limit ₹" />
        <input type="hidden" name="fyYear" value={fyYear} />
        <Input name="month" type="number" min={1} max={12} placeholder="Month (blank = yearly)" />
        <Button type="submit" className="w-full">
          Save budget
        </Button>
      </form>
    </div>
  );
}
