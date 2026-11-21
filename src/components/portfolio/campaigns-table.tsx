"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { formatINR, paiseToRupees } from "@/lib/money";
import { updateCampaignMetrics } from "@/app/actions/portfolio";
import { useToast } from "@/components/ui/toast";

export type CampaignRow = {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  dateLabel: string;
  leads: number;
  purchases: number;
  amountSpentPaise: number;
  productPricePaise: number | null;
  /** Client default product price shown as placeholder when campaign price empty. */
  clientProductPricePaise: number | null;
};

export function CampaignsTable({
  campaigns,
  showClient,
  readOnly = false,
}: {
  campaigns: CampaignRow[];
  showClient: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Campaign</th>
            {showClient && (
              <th className="px-4 py-3 font-semibold">Client</th>
            )}
            <th className="px-4 py-3 font-semibold">Dates</th>
            <th className="px-4 py-3 font-semibold">Leads</th>
            <th className="px-4 py-3 font-semibold">Purchases</th>
            <th className="px-4 py-3 font-semibold">Product price</th>
            <th className="px-4 py-3 font-semibold">Spend</th>
            <th className="px-4 py-3 font-semibold">CPL</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-t border-zinc-100 text-zinc-800">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              {showClient && (
                <td className="px-4 py-3">{c.clientName}</td>
              )}
              <td className="px-4 py-3 text-zinc-500">{c.dateLabel}</td>
              <td className="px-4 py-3">{c.leads}</td>
              <td className="px-4 py-3">
                {readOnly ? (
                  <span className="font-medium tabular-nums">{c.purchases}</span>
                ) : (
                  <PurchasesEditor
                    campaignId={c.id}
                    purchases={c.purchases}
                  />
                )}
              </td>
              <td className="px-4 py-3">
                {readOnly ? (
                  <span className="tabular-nums">
                    {c.productPricePaise != null
                      ? formatINR(c.productPricePaise)
                      : c.clientProductPricePaise != null
                        ? `${formatINR(c.clientProductPricePaise)} (default)`
                        : "—"}
                  </span>
                ) : (
                  <ProductPriceInput
                    campaignId={c.id}
                    productPricePaise={c.productPricePaise}
                    clientProductPricePaise={c.clientProductPricePaise}
                  />
                )}
              </td>
              <td className="px-4 py-3">
                {formatINR(c.amountSpentPaise)}
              </td>
              <td className="px-4 py-3">
                {c.leads > 0
                  ? formatINR(Math.round(c.amountSpentPaise / c.leads))
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchasesEditor({
  campaignId,
  purchases,
}: {
  campaignId: string;
  purchases: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(purchases));
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { showSuccess } = useToast();

  useEffect(() => {
    setValue(String(purchases));
  }, [purchases]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function cancel() {
    setValue(String(purchases));
    setEditing(false);
  }

  function save() {
    const next = Math.max(0, Math.round(Number(value) || 0));
    if (next === purchases) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateCampaignMetrics({
        campaignId,
        purchases: next,
      });
      if (res.error) {
        setValue(String(purchases));
        setEditing(false);
        showSuccess(res.error);
        return;
      }
      setEditing(false);
      showSuccess("Purchases updated");
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left hover:bg-zinc-100"
        aria-label={`Edit purchases (${purchases})`}
      >
        <span className="font-medium tabular-nums">{purchases}</span>
        <Pencil className="h-3.5 w-3.5 text-zinc-400 opacity-70 group-hover:text-zinc-600 group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        min={0}
        step={1}
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") cancel();
        }}
        className="h-8 w-16 rounded-lg border border-zinc-200 px-2 text-sm tabular-nums outline-none focus:border-blue-500"
      />
      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
        aria-label="Save purchases"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={cancel}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100"
        aria-label="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ProductPriceInput({
  campaignId,
  productPricePaise,
  clientProductPricePaise,
}: {
  campaignId: string;
  productPricePaise: number | null;
  clientProductPricePaise: number | null;
}) {
  const initial =
    productPricePaise != null ? String(paiseToRupees(productPricePaise)) : "";
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { showSuccess } = useToast();
  const lastSaved = useRef(initial);

  useEffect(() => {
    const next =
      productPricePaise != null
        ? String(paiseToRupees(productPricePaise))
        : "";
    setValue(next);
    lastSaved.current = next;
  }, [productPricePaise]);

  function save() {
    const trimmed = value.trim();
    if (trimmed === lastSaved.current) return;
    startTransition(async () => {
      const res = await updateCampaignMetrics({
        campaignId,
        productPriceRupees: trimmed,
      });
      if (res.error) {
        setValue(lastSaved.current);
        showSuccess(res.error);
        return;
      }
      lastSaved.current = trimmed;
      showSuccess("Product price updated");
      router.refresh();
    });
  }

  const placeholder =
    clientProductPricePaise != null
      ? String(paiseToRupees(clientProductPricePaise))
      : "₹";

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
        ₹
      </span>
      <input
        type="number"
        min={0}
        step="1"
        value={value}
        disabled={pending}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="h-8 w-[6.5rem] rounded-lg border border-zinc-200 bg-white py-1 pl-5 pr-2 text-sm tabular-nums outline-none focus:border-blue-500 disabled:opacity-60"
        aria-label="Product price in rupees"
      />
      {pending && (
        <Loader2 className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-zinc-400" />
      )}
    </div>
  );
}
