import { revalidatePath } from "next/cache";

/**
 * CRM modules share the same business data. After a write in one area,
 * refresh every screen that can show derived numbers from that change.
 */

export function revalidatePortfolioGraph(opts?: {
  clientId?: string | null;
  contactId?: string | null;
}) {
  revalidatePath("/app");
  revalidatePath("/app/portfolio");
  revalidatePath("/app/portfolio/import");
  revalidatePath("/app/reports/roi");
  revalidatePath("/app/finance");
  revalidatePath("/app/finance/reports");
  revalidatePath("/app/contacts");
  revalidatePath("/app/pipeline");
  revalidatePath("/app/goals");
  revalidatePath("/app/more");

  if (opts?.clientId) {
    revalidatePath(`/app/portfolio/clients/${opts.clientId}`);
    revalidatePath(`/app/portfolio/clients/${opts.clientId}/edit`);
  }
  if (opts?.contactId) {
    revalidatePath(`/app/contacts/${opts.contactId}`);
    revalidatePath(`/app/contacts/${opts.contactId}/convert`);
  }
}

export function revalidateDealGraph(opts?: { contactId?: string | null }) {
  revalidatePath("/app");
  revalidatePath("/app/pipeline");
  revalidatePath("/app/contacts");
  revalidatePath("/app/portfolio");
  revalidatePath("/app/reports/roi");
  revalidatePath("/app/goals");
  if (opts?.contactId) {
    revalidatePath(`/app/contacts/${opts.contactId}`);
  }
}

export function revalidateFinanceGraph() {
  revalidatePath("/app");
  revalidatePath("/app/finance");
  revalidatePath("/app/finance/reports");
  revalidatePath("/app/reports/roi");
  revalidatePath("/app/goals");
  revalidatePath("/app/portfolio");
}
