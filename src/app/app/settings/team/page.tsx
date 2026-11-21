import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { canManageTeam } from "@/lib/permissions";
import { resolveMemberModules, CRM_MODULES } from "@/lib/modules";
import {
  AddTeamMemberForm,
  EditMemberAccessForm,
} from "@/components/settings/module-access-picker";
import { PageHeader } from "@/components/ui/page-header";
import type { Role } from "@/generated/prisma/client";

export default async function TeamPage() {
  const ctx = await requireTenant();
  const members = await prisma.membership.findMany({
    where: { businessId: ctx.businessId, deletedAt: null, isActive: true },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const labelFor = (keys: string[]) => {
    const map = Object.fromEntries(CRM_MODULES.map((m) => [m.key, m.label]));
    if (keys.length >= CRM_MODULES.length) return "All areas";
    if (keys.length === 0) return "No areas";
    return keys.map((k) => map[k] || k).join(", ");
  };

  return (
    <div>
      <PageHeader title="Team" />
      <p className="-mt-3 mb-5 text-sm text-zinc-500">
        Invite people and choose exactly what they can open and edit.
      </p>

      <ul className="sp-card sp-shadow mb-5 divide-y divide-zinc-100 overflow-hidden">
        {members.map((m) => {
          const modules = resolveMemberModules({
            role: m.role,
            moduleAccess: m.moduleAccess,
          });
          const editableRole =
            m.role === "OWNER" ? null : (m.role as Exclude<Role, "OWNER">);

          return (
            <li key={m.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{m.user.name}</p>
                  <p className="text-sm text-zinc-500">{m.user.email}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Access: {labelFor(modules)}
                  </p>
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
                  {m.role}
                </span>
              </div>

              {canManageTeam(ctx.role) && editableRole ? (
                <EditMemberAccessForm
                  membershipId={m.id}
                  defaultRole={editableRole}
                  initialModules={modules}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {canManageTeam(ctx.role) ? (
        <AddTeamMemberForm />
      ) : (
        <p className="text-sm text-zinc-500">Only owners can add members.</p>
      )}
    </div>
  );
}
