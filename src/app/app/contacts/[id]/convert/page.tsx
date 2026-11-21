import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { contactVisibilityFilter, requireTenant } from "@/lib/tenant";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConvertToCustomerForm } from "@/components/contacts/convert-to-customer-form";

export default async function ConvertContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireTenant();

  const contact = await prisma.contact.findFirst({
    where: {
      id,
      businessId: ctx.businessId,
      deletedAt: null,
      ...contactVisibilityFilter(ctx),
    },
  });
  if (!contact) notFound();

  const existingPortfolio = await prisma.portfolioClient.findFirst({
    where: {
      businessId: ctx.businessId,
      contactId: contact.id,
      deletedAt: null,
    },
  });

  if (existingPortfolio) {
    redirect(`/app/portfolio?clientId=${existingPortfolio.id}`);
  }

  const isLead = contact.type === "LEAD";

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={isLead ? "Convert to customer" : "Add to portfolio"}
        actions={
          <Link href={`/app/contacts/${contact.id}`}>
            <Button type="button" variant="secondary">
              Back
            </Button>
          </Link>
        }
      />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        {isLead
          ? "This lead becomes a customer and is added to your Portfolio. Fill in client details so you can track campaigns and results."
          : "This customer isn’t in Portfolio yet. Add client details to track campaigns and performance."}
      </p>
      <ConvertToCustomerForm
        contactId={contact.id}
        defaultName={contact.name}
        isLead={isLead}
      />
    </div>
  );
}
