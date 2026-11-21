import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { AppShell } from "@/components/layout/AppShell";
import {
  filterModulesByPlan,
  getBusinessPlanLimits,
} from "@/lib/plan-limits";

export const instant = false;

async function Shell({ children }: { children: ReactNode }) {
  const ctx = await requireTenant();
  const [business, limits] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: ctx.businessId },
      select: { name: true, logoUrl: true },
    }),
    getBusinessPlanLimits(ctx.businessId),
  ]);

  // Landing → sign-in → payment → dashboard (no free access)
  if (!limits.isPaid) {
    redirect("/pay");
  }

  const modules = filterModulesByPlan(ctx.modules, limits);

  return (
    <AppShell
      businessName={business.name}
      businessLogoUrl={business.logoUrl}
      userName={ctx.user.name}
      modules={modules}
    >
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] text-zinc-500">
          Loading…
        </div>
      }
    >
      <Shell>{children}</Shell>
    </Suspense>
  );
}
