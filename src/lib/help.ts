/** Public support contacts (safe for client components). */

export function helpEmail() {
  return (
    process.env.NEXT_PUBLIC_HELP_EMAIL?.trim() ||
    "webproductcreator@gmail.com"
  );
}

export function helpMailto(subject = "WPC CRM support") {
  const email = helpEmail();
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function helpWhatsAppUrl(message?: string) {
  const raw = process.env.NEXT_PUBLIC_HELP_WHATSAPP?.replace(/\D/g, "") ?? "";
  const phone = raw.startsWith("91") ? raw : raw ? `91${raw.slice(-10)}` : "";
  const text = encodeURIComponent(
    message || "Hi — I need help with WPC CRM.",
  );
  return phone
    ? `https://wa.me/${phone}?text=${text}`
    : `https://wa.me/?text=${text}`;
}
