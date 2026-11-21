"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveLeadFormSettings } from "@/app/actions/lead-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  newCustomFieldId,
  type LeadFormField,
  type LeadFormFieldType,
} from "@/lib/lead-form";

export function LeadFormBuilder({
  businessName,
  initial,
}: {
  businessName: string;
  initial: {
    enabled: boolean;
    title: string;
    subtitle: string;
    publicFormSlug: string;
    formUrl: string;
    fields: LeadFormField[];
  };
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [slug, setSlug] = useState(initial.publicFormSlug);
  const [fields, setFields] = useState<LeadFormField[]>(initial.fields);
  const fieldsJson = useMemo(() => JSON.stringify(fields), [fields]);
  const previewUrl = useMemo(() => {
    const base = initial.formUrl.replace(/\/f\/[^/]+$/, "");
    return `${base}/f/${slug || "your-business"}`;
  }, [initial.formUrl, slug]);

  function updateField(id: string, patch: Partial<LeadFormField>) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  function removeField(id: string) {
    setFields((prev) =>
      prev.filter((f) => f.id !== id || f.builtin),
    );
  }

  function addQuestion(type: LeadFormFieldType = "text") {
    const id = newCustomFieldId();
    setFields((prev) => [
      ...prev,
      {
        id,
        key: id,
        type,
        label: type === "select" ? "Choose one" : "Your question",
        placeholder: type === "select" ? "Select…" : "",
        required: false,
        enabled: true,
        builtin: false,
        options: type === "select" ? ["Option 1", "Option 2"] : undefined,
      },
    ]);
  }

  return (
    <form action={saveLeadFormSettings} className="space-y-5">
      <input type="hidden" name="fieldsJson" value={fieldsJson} />

      <section className="sp-card sp-shadow p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-zinc-900">Share link</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Send this to anyone. Submissions become leads for{" "}
              <span className="font-medium text-zinc-800">{businessName}</span>.
            </p>
            <p className="mt-2 break-all text-sm font-medium text-blue-600">
              {previewUrl}
            </p>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-zinc-600 underline"
            >
              Open form preview
            </a>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              name="leadFormEnabled"
              value="on"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Form is live
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-zinc-700">
          Form URL slug
          <Input
            name="publicFormSlug"
            className="mt-1.5"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="your-business-name"
          />
          <span className="mt-1 block text-xs text-zinc-400">
            From your business profile name. Keep it short and shareable.
          </span>
        </label>
      </section>

      <section className="sp-card sp-shadow space-y-3 p-5">
        <h3 className="font-semibold text-zinc-900">Form copy</h3>
        <label className="block text-sm font-medium text-zinc-700">
          Title
          <Input
            name="leadFormTitle"
            className="mt-1.5"
            defaultValue={initial.title}
            placeholder="Get in touch"
          />
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Subtitle
          <Textarea
            name="leadFormSubtitle"
            className="mt-1.5"
            defaultValue={initial.subtitle}
            placeholder="Leave your details — we’ll get back to you soon."
            rows={2}
          />
        </label>
      </section>

      <section className="sp-card sp-shadow p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-900">Questions & fields</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Name and phone stay required. Toggle optional fields or add your
              own questions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addQuestion("text")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
              Text
            </button>
            <button
              type="button"
              onClick={() => addQuestion("textarea")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
              Long answer
            </button>
            <button
              type="button"
              onClick={() => addQuestion("select")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
              Dropdown
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {fields.map((field) => (
            <li
              key={field.id}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3"
            >
              <div className="flex flex-wrap items-start gap-3">
                <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-zinc-600">
                  <input
                    type="checkbox"
                    checked={field.enabled}
                    disabled={field.key === "name" || field.key === "phone"}
                    onChange={(e) =>
                      updateField(field.id, { enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                  Show
                </label>

                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={field.label}
                    onChange={(e) =>
                      updateField(field.id, { label: e.target.value })
                    }
                    placeholder="Field label"
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={field.placeholder || ""}
                      onChange={(e) =>
                        updateField(field.id, {
                          placeholder: e.target.value,
                        })
                      }
                      placeholder="Placeholder"
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={field.required}
                        disabled={
                          field.key === "name" || field.key === "phone"
                        }
                        onChange={(e) =>
                          updateField(field.id, {
                            required: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      Required
                      {field.builtin ? (
                        <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                          {field.key}
                        </span>
                      ) : null}
                    </label>
                  </div>
                  {field.type === "select" ? (
                    <Input
                      value={(field.options || []).join(", ")}
                      onChange={(e) =>
                        updateField(field.id, {
                          options: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Options, comma separated"
                    />
                  ) : null}
                </div>

                {!field.builtin ? (
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="mt-2 w-9" />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <SubmitButton className="w-full sm:w-auto">Save lead form</SubmitButton>
    </form>
  );
}
