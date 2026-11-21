"use client";

import { convertLeadToCustomerAndPortfolio } from "@/app/actions/contacts";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";

export function ConvertToCustomerForm({
  contactId,
  defaultName,
  isLead,
}: {
  contactId: string;
  defaultName: string;
  isLead: boolean;
}) {
  return (
    <form
      action={convertLeadToCustomerAndPortfolio}
      className="sp-card sp-shadow space-y-4 p-5"
    >
      <input type="hidden" name="contactId" value={contactId} />

      <label className="block text-sm font-medium text-zinc-700">
        Client name
        <Input
          name="name"
          required
          className="mt-1.5"
          defaultValue={defaultName}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-zinc-700">
          Portfolio status
          <Select name="status" className="mt-1.5" defaultValue="CURRENT">
            <option value="CURRENT">Current</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Industry
          <Input
            name="industry"
            className="mt-1.5"
            placeholder="Salon, clinic, retail…"
          />
        </label>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Business details
        <textarea
          name="businessDetails"
          rows={3}
          required
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="What they do, locations, audience…"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Website
        <Input name="website" className="mt-1.5" placeholder="https://" />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Services provided
        <textarea
          name="services"
          rows={3}
          required
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="Meta ads, Google ads, creative…"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Work history
        <textarea
          name="workHistory"
          rows={2}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="Projects and milestones…"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Achievements / results
        <textarea
          name="achievements"
          rows={2}
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          placeholder="e.g. 3× leads in 60 days"
        />
      </label>

      <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 space-y-3">
        <p className="text-sm font-semibold text-zinc-900">Sales & profit</p>
        <p className="text-xs text-zinc-500">
          Optional. Add per-sale value if you know it (e.g. digital product).
          Otherwise revenue stays “Not mentioned”.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-zinc-700">
            Per sale / product cost (₹)
            <Input
              name="revenuePerSaleRupees"
              type="number"
              min={0}
              className="mt-1.5"
              placeholder="e.g. 999"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Other expenses (₹)
            <Input
              name="expenseRupees"
              type="number"
              min={0}
              className="mt-1.5"
            />
          </label>
        </div>
      </div>

      <SubmitButton pendingLabel="Saving…">
        {isLead ? "Convert & add to portfolio" : "Add to portfolio"}
      </SubmitButton>
    </form>
  );
}
