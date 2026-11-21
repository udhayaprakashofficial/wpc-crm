import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageSettings } from "@/lib/permissions";
import {
  saveWhatsAppSettings,
  sendWhatsAppTest,
} from "@/app/actions/whatsapp-settings";
import { getWhatsAppConfig, isWhatsAppReady } from "@/lib/whatsapp";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WhatsAppTestForm } from "@/components/whatsapp-test-form";

export default async function WhatsAppSettingsPage() {
  const ctx = await requireTenant();
  if (!canManageSettings(ctx.role)) {
    return (
      <div>
        <PageHeader title="WhatsApp API" />
        <p className="text-sm text-zinc-500">Only owners/managers can configure.</p>
      </div>
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: ctx.businessId },
  });
  const config = await getWhatsAppConfig(ctx.businessId);
  const ready = isWhatsAppReady(config);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="WhatsApp API"
        actions={
          <Link href="/app/messages">
            <Button variant="secondary">Messages</Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Connect Meta WhatsApp Cloud API for broadcasts and automations.
      </p>

      <div
        className={`mb-5 rounded-2xl px-4 py-3 text-sm ${
          ready
            ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border border-amber-200 bg-amber-50 text-amber-950"
        }`}
      >
        {ready
          ? "Connected — broadcasts and automations can send live."
          : "Not connected — messages stay queued until you add credentials."}
      </div>

      <form
        action={saveWhatsAppSettings}
        className="sp-card sp-shadow mb-5 space-y-4 p-5"
      >
        <label className="flex items-center gap-3 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            name="waEnabled"
            defaultChecked={business.waEnabled}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Enable live WhatsApp sending
        </label>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Phone number ID
          </label>
          <Input
            name="waPhoneNumberId"
            defaultValue={business.waPhoneNumberId ?? ""}
            placeholder="From Meta → WhatsApp → API Setup"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Access token
          </label>
          <Input
            name="waAccessToken"
            type="password"
            defaultValue={business.waAccessToken ? "••••••••" : ""}
            placeholder="Permanent system user token"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Webhook verify token
          </label>
          <Input
            name="waVerifyToken"
            defaultValue={business.waVerifyToken ?? ""}
            placeholder="Any secret string you choose"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700">
            Default country code
          </label>
          <Input
            name="waDefaultCountryCode"
            defaultValue={business.waDefaultCountryCode || "91"}
            placeholder="91"
          />
        </div>

        <Button type="submit" className="w-full">
          Save WhatsApp settings
        </Button>
      </form>

      <section className="sp-card sp-shadow mb-5 space-y-2 p-5 text-sm">
        <h3 className="font-semibold text-zinc-900">Webhook (Meta)</h3>
        <p className="text-zinc-500">
          Callback URL — paste in Meta Developer → WhatsApp → Configuration:
        </p>
        <p className="break-all rounded-xl bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800">
          {webhookUrl}
        </p>
        <p className="text-xs text-zinc-500">
          Subscribe to <strong>messages</strong> and <strong>message_status</strong>.
          Use the same verify token as above.
        </p>
      </section>

      <WhatsAppTestForm action={sendWhatsAppTest} />

      <p className="mt-4 text-xs text-zinc-400">
        Outside the 24h window, Meta requires approved templates. Set{" "}
        <code className="rounded bg-zinc-100 px-1">waTemplateName</code> on a
        CRM template to match the Meta template name.
      </p>
    </div>
  );
}
