import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatINR } from "@/lib/money";
import { suspendBusiness, reactivateBusiness } from "@/app/actions/admin";

export const instant = false;

async function AdminContent() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user?.isSuperAdmin) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <h1 className="text-2xl font-semibold">Super admin</h1>
        <p className="mt-2 text-slate-600">
          Access denied. You need a super admin account.
        </p>
        <Link href="/app" className="mt-4 inline-block text-teal-700">
          Back to app
        </Link>
      </div>
    );
  }

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { contacts: true, memberships: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeSubs = await prisma.subscription.count({
    where: { status: { in: ["ACTIVE", "TRIALING"] } },
  });
  const mrr = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    include: { plan: true },
  });
  const mrrPaise = mrr.reduce((a, s) => a + s.plan.pricePaise, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Super admin</h1>
        <Link href="/app" className="text-sm font-medium text-teal-700">
          Open CRM
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Businesses" value={String(businesses.length)} />
        <Stat label="Active subs" value={String(activeSubs)} />
        <Stat label="MRR" value={formatINR(mrrPaise)} />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th>Plan</th>
              <th>Usage</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-3">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-slate-500">{b.slug}</p>
                  {b.suspendedAt && (
                    <p className="text-xs font-semibold text-red-600">Suspended</p>
                  )}
                </td>
                <td>{b.subscriptions[0]?.plan.name ?? "—"}</td>
                <td>
                  {b._count.memberships} users · {b._count.contacts} contacts
                </td>
                <td>{format(b.createdAt, "dd MMM yyyy")}</td>
                <td>
                  {b.suspendedAt ? (
                    <form action={reactivateBusiness}>
                      <input type="hidden" name="businessId" value={b.id} />
                      <button type="submit" className="text-teal-700">
                        Reactivate
                      </button>
                    </form>
                  ) : (
                    <form action={suspendBusiness}>
                      <input type="hidden" name="businessId" value={b.id} />
                      <button type="submit" className="text-red-600">
                        Suspend
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading admin…</div>}>
      <AdminContent />
    </Suspense>
  );
}
