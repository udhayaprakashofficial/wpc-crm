"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { importBusinessBackup } from "@/app/actions/business-import";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default function ImportBusinessPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Import business"
        actions={
          <Link href="/app/business">
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Upload a WPC CRM backup JSON. Existing contacts (same phone) are
        skipped. Owner only.
      </p>

      <form
        className="sp-card sp-shadow space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setMessage(null);
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await importBusinessBackup(fd);
            if (res.error) {
              setError(res.error);
              return;
            }
            const s = res.stats!;
            setMessage(
              `Imported ${s.contacts} contacts, ${s.deals} deals, ${s.tasks} tasks, ${s.transactions} transactions, ${s.invoices} invoices, ${s.appointments} appointments, ${s.staff} staff, ${s.vendors} vendors. Skipped ${s.skippedContacts} contacts.`,
            );
          });
        }}
      >
        <input
          type="file"
          name="file"
          accept="application/json,.json"
          required
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Importing…" : "Import backup"}
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
          <Link href="/app/contacts" className="font-semibold underline">
            View contacts
          </Link>
        </p>
      )}
    </div>
  );
}
