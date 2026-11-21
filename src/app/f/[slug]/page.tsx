import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitPublicLead } from "@/app/actions/public-lead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  enabledFields,
  parseLeadFormConfig,
  type LeadFormField,
} from "@/lib/lead-form";

async function PublicForm({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await prisma.business.findFirst({
    where: {
      publicFormSlug: slug,
      deletedAt: null,
      suspendedAt: null,
      leadFormEnabled: true,
    },
    select: {
      name: true,
      logoUrl: true,
      leadFormTitle: true,
      leadFormSubtitle: true,
      leadFormConfig: true,
    },
  });
  if (!business) notFound();

  const fields = enabledFields(parseLeadFormConfig(business.leadFormConfig));
  const title = business.leadFormTitle?.trim() || "Get in touch";
  const subtitle =
    business.leadFormSubtitle?.trim() ||
    "Leave your details — we’ll get back to you soon.";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <div className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt=""
                className="h-11 w-11 rounded-xl object-contain ring-1 ring-zinc-200"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
                {business.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {business.name}
              </p>
              <h1 className="truncate text-xl font-semibold text-zinc-900">
                {title}
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-600">{subtitle}</p>
        </div>

        <form action={submitPublicLead} className="space-y-4 px-6 py-6">
          <input type="hidden" name="slug" value={slug} />
          {fields.map((field) => (
            <FieldInput key={field.id} field={field} />
          ))}
          <Button type="submit" className="w-full" size="lg">
            Submit
          </Button>
          <p className="text-center text-[11px] text-zinc-400">
            Your details go to {business.name} — not shared elsewhere.
          </p>
        </form>
      </div>
    </div>
  );
}

function FieldInput({ field }: { field: LeadFormField }) {
  const name = `field_${field.key}`;
  const label = (
    <span className="mb-1.5 block text-sm font-medium text-zinc-700">
      {field.label}
      {field.required ? (
        <span className="text-red-500"> *</span>
      ) : (
        <span className="font-normal text-zinc-400"> (optional)</span>
      )}
    </span>
  );

  if (field.type === "textarea") {
    return (
      <label className="block">
        {label}
        <Textarea
          name={name}
          required={field.required}
          placeholder={field.placeholder}
          rows={4}
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        {label}
        <select
          name={name}
          required={field.required}
          defaultValue=""
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
        >
          <option value="" disabled>
            {field.placeholder || "Select…"}
          </option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      {label}
      <Input
        name={name}
        type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"}
        inputMode={field.type === "tel" ? "tel" : undefined}
        required={field.required}
        placeholder={field.placeholder}
      />
    </label>
  );
}

export default function PublicLeadFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-zinc-500">Loading…</div>
      }
    >
      <PublicForm params={params} />
    </Suspense>
  );
}
