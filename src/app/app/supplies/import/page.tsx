"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { importSuppliesCsv } from "@/app/actions/supplies";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function ImportSuppliesPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Import supplies"
        actions={
          <Link href="/app/supplies">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        CSV columns: <strong>name</strong> (required), sku, unit, quantity,
        reorderLevel, cost, sell, vendor, category, notes. Matching SKU or name
        updates stock.
      </p>

      <div className="mb-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
        <p className="font-medium text-zinc-900">Sample header</p>
        <p className="mt-1 break-all font-mono text-xs">
          name,sku,unit,quantity,reorderLevel,cost,sell,vendor,category,notes
        </p>
        <a
          href="/app/supplies/export"
          className="mt-2 inline-block text-sm font-semibold text-blue-600"
        >
          Download current supplies as template →
        </a>
      </div>

      <form
        className="sp-card sp-shadow space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setMessage(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await importSuppliesCsv(fd);
            if (res.error) {
              setError(res.error);
              return;
            }
            setMessage(
              `Created ${res.created}, updated ${res.updated}, skipped ${res.skipped}.`,
            );
          });
        }}
      >
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Importing…" : "Import CSV"}
        </Button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}{" "}
          <Link href="/app/supplies" className="font-semibold underline">
            View supplies
          </Link>
        </p>
      )}
    </div>
  );
}
