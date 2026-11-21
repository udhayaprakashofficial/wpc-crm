export type LeadFormFieldType =
  | "text"
  | "tel"
  | "email"
  | "textarea"
  | "select";

export type LeadFormField = {
  id: string;
  /** Builtin keys: name | phone | email | message — custom use q_* */
  key: string;
  type: LeadFormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  enabled: boolean;
  builtin?: boolean;
  options?: string[];
};

export type LeadFormConfig = {
  fields: LeadFormField[];
};

export const DEFAULT_LEAD_FORM_FIELDS: LeadFormField[] = [
  {
    id: "name",
    key: "name",
    type: "text",
    label: "Your name",
    placeholder: "Full name",
    required: true,
    enabled: true,
    builtin: true,
  },
  {
    id: "phone",
    key: "phone",
    type: "tel",
    label: "Phone",
    placeholder: "WhatsApp / mobile number",
    required: true,
    enabled: true,
    builtin: true,
  },
  {
    id: "email",
    key: "email",
    type: "email",
    label: "Email",
    placeholder: "Optional",
    required: false,
    enabled: true,
    builtin: true,
  },
  {
    id: "message",
    key: "message",
    type: "textarea",
    label: "How can we help?",
    placeholder: "Tell us what you need",
    required: false,
    enabled: true,
    builtin: true,
  },
];

export function defaultLeadFormConfig(): LeadFormConfig {
  return { fields: DEFAULT_LEAD_FORM_FIELDS.map((f) => ({ ...f })) };
}

export function parseLeadFormConfig(raw: unknown): LeadFormConfig {
  if (!raw || typeof raw !== "object") return defaultLeadFormConfig();
  const fields = (raw as { fields?: unknown }).fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    return defaultLeadFormConfig();
  }

  const parsed: LeadFormField[] = [];
  for (const item of fields) {
    if (!item || typeof item !== "object") continue;
    const f = item as Record<string, unknown>;
    const key = String(f.key || "").trim();
    const id = String(f.id || key || "").trim();
    const type = String(f.type || "text") as LeadFormFieldType;
    if (!id || !key) continue;
    if (!["text", "tel", "email", "textarea", "select"].includes(type)) continue;
    parsed.push({
      id,
      key,
      type,
      label: String(f.label || key).trim() || key,
      placeholder:
        f.placeholder != null ? String(f.placeholder) : undefined,
      required: Boolean(f.required),
      enabled: f.enabled !== false,
      builtin: Boolean(f.builtin) || ["name", "phone", "email", "message"].includes(key),
      options: Array.isArray(f.options)
        ? f.options.map((o) => String(o).trim()).filter(Boolean)
        : undefined,
    });
  }

  // Ensure name + phone always exist and stay enabled/required
  const ensure = (key: string, fallback: LeadFormField) => {
    const idx = parsed.findIndex((f) => f.key === key);
    if (idx < 0) {
      parsed.unshift({ ...fallback });
      return;
    }
    parsed[idx] = {
      ...parsed[idx],
      enabled: true,
      required: key === "name" || key === "phone" ? true : parsed[idx].required,
      builtin: true,
    };
  };
  ensure("phone", DEFAULT_LEAD_FORM_FIELDS[1]);
  ensure("name", DEFAULT_LEAD_FORM_FIELDS[0]);

  return { fields: parsed };
}

export function enabledFields(config: LeadFormConfig) {
  return config.fields.filter((f) => f.enabled);
}

export function newCustomFieldId() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
