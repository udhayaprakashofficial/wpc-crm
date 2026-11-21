"use client";

import { upsertPortfolioClient } from "@/app/actions/portfolio";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";

type ClientValues = {
  id?: string;
  name?: string;
  businessDetails?: string | null;
  industry?: string | null;
  website?: string | null;
  services?: string | null;
  workHistory?: string | null;
  achievements?: string | null;
  status?: "CURRENT" | "COMPLETED";
  revenuePerSalePaise?: number | null;
  manualSalesCount?: number | null;
  expensePaise?: number | null;
};

export function PortfolioClientForm({
  initial,
}: {
  initial?: ClientValues;
}) {
  return (
    <form action={upsertPortfolioClient} className="sp-card sp-shadow space-y-4 p-5">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <label className="block text-sm font-medium text-zinc-700">
        Client name
        <Input
          name="name"
          required
          className="mt-1.5"
          defaultValue={initial?.name || ""}
          placeholder="Acme Salon"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Status
          <Select
            name="status"
            className="mt-1.5"
            defaultValue={initial?.status || "CURRENT"}
          >
            <option value="CURRENT">Current</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Industry
          <Input
            name="industry"
            className="mt-1.5"
            defaultValue={initial?.industry || ""}
            placeholder="Salon, clinic, retail…"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Business details
        <textarea
          name="businessDetails"
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          defaultValue={initial?.businessDetails || ""}
          placeholder="What they do, locations, audience…"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Website
        <Input
          name="website"
          className="mt-1.5"
          defaultValue={initial?.website || ""}
          placeholder="https://"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Services provided
        <textarea
          name="services"
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          defaultValue={initial?.services || ""}
          placeholder="Meta ads, Google ads, creative, landing pages…"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Work history
        <textarea
          name="workHistory"
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          defaultValue={initial?.workHistory || ""}
          placeholder="Projects and milestones…"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Achievements / results (client-facing)
        <textarea
          name="achievements"
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          defaultValue={initial?.achievements || ""}
          placeholder="e.g. 3× leads in 60 days"
        />
      </label>

      <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-3">
        <p className="text-sm font-semibold text-zinc-900">Sales & profit</p>
        <p className="text-xs text-zinc-500">
          If you know the value of each sale (e.g. digital product price), enter
          it below. Revenue = sales × per-sale value. Leave blank if unknown —
          revenue and profit stay “Not mentioned”.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Per sale / product cost (₹)
            <Input
              name="revenuePerSaleRupees"
              type="number"
              min={0}
              step="1"
              className="mt-1.5"
              defaultValue={
                initial?.revenuePerSalePaise != null
                  ? String(initial.revenuePerSalePaise / 100)
                  : ""
              }
              placeholder="e.g. 999"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Sales count{" "}
            <span className="font-normal text-zinc-400">(optional override)</span>
            <Input
              name="manualSalesCount"
              type="number"
              min={0}
              className="mt-1.5"
              defaultValue={
                initial?.manualSalesCount != null
                  ? String(initial.manualSalesCount)
                  : ""
              }
              placeholder="Uses campaign purchases if empty"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-zinc-700">
          Other expenses (₹){" "}
          <span className="font-normal text-zinc-400">(optional)</span>
          <Input
            name="expenseRupees"
            type="number"
            min={0}
            className="mt-1.5"
            defaultValue={
              initial?.expensePaise != null
                ? String(initial.expensePaise / 100)
                : ""
            }
            placeholder="Non-ad costs"
          />
        </label>
      </div>

      <SubmitButton>
        {initial?.id ? "Save client" : "Add client"}
      </SubmitButton>
    </form>
  );
}
