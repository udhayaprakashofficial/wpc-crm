"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { importContactsCsv } from "@/app/actions/import-contacts";
import { Button } from "@/components/ui/button";

export default function ImportContactsPage() {
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-2xl font-semibold">Import contacts</h2>
      <p className="text-sm text-slate-600">
        Upload a CSV with <strong>name</strong> and <strong>phone</strong> columns.
        Duplicates by phone are skipped.
      </p>

      <form
        className="space-y-4 rounded-2xl border bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await importContactsCsv(fd);
            if (res.error) setResult(res.error);
            else
              setResult(
                `Imported ${res.created}. Skipped ${res.skipped} duplicates/invalid.`,
              );
          });
        }}
      >
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Importing…" : "Import CSV"}
        </Button>
      </form>

      {result && (
        <p className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {result}{" "}
          <Link href="/app/contacts" className="font-semibold underline">
            View contacts
          </Link>
        </p>
      )}
    </div>
  );
}
