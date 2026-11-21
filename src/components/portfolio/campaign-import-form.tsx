"use client";

import { useState } from "react";
import { importCampaignReport } from "@/app/actions/portfolio";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SubmitButton } from "@/components/ui/submit-button";

export function CampaignImportForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const { showSuccess } = useToast();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="sp-card sp-shadow space-y-4 p-5"
      action={async (fd) => {
        setError(null);
        const res = await importCampaignReport(fd);
        if (res && "error" in res && res.error) {
          setError(res.error);
          return;
        }
        if (res && "ok" in res && res.ok) {
          showSuccess(
            `Imported ${res.upserted} campaign${res.upserted === 1 ? "" : "s"}${
              res.createdClients
                ? ` · ${res.createdClients} new client${res.createdClients === 1 ? "" : "s"}`
                : ""
            }`,
          );
        }
      }}
    >
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          Import campaign report
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Upload CSV or Excel. We extract campaign metrics only — the file is
          not stored. Matching campaigns are updated (no duplicates).
        </p>
      </div>

      <label className="block text-sm font-medium text-zinc-700">
        Map to client (optional if file has a Client column)
        <Select
          name="clientId"
          className="mt-1.5"
          defaultValue={defaultClientId || ""}
        >
          <option value="">Detect from file</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>

      <label className="block text-sm font-medium text-zinc-700">
        Report file
        <Input
          name="file"
          type="file"
          accept=".csv,.xlsx,.xls"
          required
          className="mt-1.5"
        />
      </label>

      <p className="text-xs text-zinc-500">
        Useful headers: Client, Campaign name, Start date, End date, Leads,
        Purchases, Amount spent, Impressions, Reach, Cost per result.
      </p>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <SubmitButton pendingLabel="Importing…">Import & update</SubmitButton>
    </form>
  );
}
