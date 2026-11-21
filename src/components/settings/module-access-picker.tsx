"use client";

import { useEffect, useRef, useState } from "react";
import {
  CRM_MODULES,
  defaultModulesForRole,
  type CrmModuleKey,
} from "@/lib/modules";
import type { Role } from "@/generated/prisma/client";
import { addTeamMember, updateMemberAccess } from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

function ModuleAccessPicker({
  role,
  initialModules,
  name = "moduleAccess",
}: {
  role: Role;
  initialModules?: CrmModuleKey[];
  name?: string;
}) {
  const [selected, setSelected] = useState<CrmModuleKey[]>(
    initialModules?.length ? initialModules : defaultModulesForRole(role),
  );
  const prevRole = useRef(role);

  useEffect(() => {
    if (prevRole.current === role) return;
    prevRole.current = role;
    setSelected(defaultModulesForRole(role));
  }, [role]);

  function toggle(key: CrmModuleKey) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">
            What this person can access
          </p>
          <p className="text-xs text-zinc-500">
            Only checked areas appear in their menu. They can view and edit
            those — nothing else.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSelected(defaultModulesForRole(role))}
            className="text-xs font-medium text-zinc-600 underline"
          >
            Role defaults
          </button>
          <button
            type="button"
            onClick={() => setSelected(CRM_MODULES.map((m) => m.key))}
            className="text-xs font-medium text-blue-600 underline"
          >
            Select all
          </button>
        </div>
      </div>

      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2">
        {CRM_MODULES.map((mod) => {
          const checked = selected.includes(mod.key);
          return (
            <li key={mod.key}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(mod.key)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-zinc-900">
                    {mod.label}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {mod.description}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-zinc-400">
        {selected.length} area{selected.length === 1 ? "" : "s"} selected · Home
        stays available for everyone
      </p>
    </div>
  );
}

function RoleSelect({
  value,
  onChange,
}: {
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      Role
      <select
        name="role"
        value={value}
        onChange={(e) => onChange(e.target.value as Role)}
        className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
      >
        <option value="MANAGER">Manager</option>
        <option value="STAFF">Staff</option>
        <option value="ACCOUNTANT">Accountant</option>
      </select>
    </label>
  );
}

export function AddTeamMemberForm() {
  const [role, setRole] = useState<Role>("STAFF");

  return (
    <form action={addTeamMember} className="sp-card sp-shadow space-y-3 p-5">
      <h3 className="font-semibold text-zinc-900">Add team member</h3>
      <p className="text-sm text-zinc-500">
        Creates their login directly (no invite link).
      </p>
      <Input name="name" required placeholder="Full name" />
      <Input name="email" type="email" required placeholder="Email" />
      <Input
        name="password"
        type="password"
        required
        placeholder="Temp password"
        minLength={8}
      />
      <RoleSelect value={role} onChange={setRole} />
      <ModuleAccessPicker role={role} />
      <Button type="submit" className="w-full">
        Add member
      </Button>
    </form>
  );
}

export function EditMemberAccessForm({
  membershipId,
  defaultRole,
  initialModules,
}: {
  membershipId: string;
  defaultRole: Role;
  initialModules: CrmModuleKey[];
}) {
  const [role, setRole] = useState<Role>(defaultRole);

  return (
    <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-zinc-700">
        Edit role & access
      </summary>
      <form action={updateMemberAccess} className="mt-3 space-y-3">
        <input type="hidden" name="membershipId" value={membershipId} />
        <RoleSelect value={role} onChange={setRole} />
        <ModuleAccessPicker role={role} initialModules={initialModules} />
        <SubmitButton>Save access</SubmitButton>
      </form>
    </details>
  );
}
