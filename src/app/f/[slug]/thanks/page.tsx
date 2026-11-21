import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

async function ThanksBody({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await prisma.business.findFirst({
    where: { publicFormSlug: slug, deletedAt: null },
    select: { name: true, logoUrl: true },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        {business?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logoUrl}
            alt=""
            className="mx-auto mb-4 h-12 w-12 rounded-xl object-contain"
          />
        ) : null}
        <h1 className="text-2xl font-semibold text-zinc-900">Thank you!</h1>
        <p className="mt-2 text-zinc-600">
          {business
            ? `${business.name} received your details and will contact you shortly.`
            : "We received your details and will contact you shortly."}
        </p>
      </div>
    </div>
  );
}

export default function ThanksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ThanksBody params={params} />
    </Suspense>
  );
}
