import Link from "next/link";
import { Download, Upload, Shield } from "lucide-react";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings, canManageTeam } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function BusinessDataPage() {
  const ctx = await requireTenant();
  const canExport = canManageSettings(ctx.role);
  const canImport = canManageTeam(ctx.role);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Business data" />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Back up or restore your workspace — contacts, pipeline, money, staff,
        and more. Your customer list stays with the business.
      </p>

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <p className="text-sm text-zinc-700">
          Export downloads a JSON backup. Import merges into this workspace
          (duplicate contacts by phone are skipped). Team logins and passwords
          are never imported.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sp-card sp-shadow flex flex-col p-5">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <Download className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-zinc-900">Export business</h2>
          <p className="mt-1 flex-1 text-sm text-zinc-500">
            Download contacts, deals, invoices, expenses, appointments, and
            staff as one backup file.
          </p>
          {canExport ? (
            <a href="/app/business/export" className="mt-4 block">
              <Button className="w-full">Download backup</Button>
            </a>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">Owner/manager only</p>
          )}
        </div>

        <div className="sp-card sp-shadow flex flex-col p-5">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
            <Upload className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-zinc-900">Import business</h2>
          <p className="mt-1 flex-1 text-sm text-zinc-500">
            Restore from a WPC backup JSON. Safe merge — won&apos;t wipe existing
            data.
          </p>
          {canImport ? (
            <Link href="/app/business/import" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                Upload backup
              </Button>
            </Link>
          ) : (
            <p className="mt-4 text-sm text-zinc-400">Owner only</p>
          )}
        </div>
      </div>

      <div className="mt-5 sp-card divide-y divide-zinc-100 overflow-hidden">
        <Link
          href="/app/contacts/export"
          className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50"
        >
          <div>
            <p className="font-semibold text-zinc-900">Export contacts only</p>
            <p className="text-sm text-zinc-500">CSV download</p>
          </div>
          <span className="text-sm text-blue-600">Open →</span>
        </Link>
        <Link
          href="/app/contacts/import"
          className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50"
        >
          <div>
            <p className="font-semibold text-zinc-900">Import contacts only</p>
            <p className="text-sm text-zinc-500">CSV upload</p>
          </div>
          <span className="text-sm text-blue-600">Open →</span>
        </Link>
      </div>
    </div>
  );
}
