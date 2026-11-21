"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ClientOption = {
  id: string;
  name: string;
  status: "CURRENT" | "COMPLETED";
};

export function PortfolioFilters({
  clients,
  selectedClientId,
  preset,
  from,
  to,
  statusFilter,
}: {
  clients: ClientOption[];
  selectedClientId: string;
  preset: string;
  from: string;
  to: string;
  statusFilter: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    }
    start(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="sp-card sp-shadow mb-5 space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm font-medium text-zinc-700">
          Client
          <Select
            className="mt-1.5"
            value={selectedClientId || "all"}
            onChange={(e) =>
              update({
                clientId: e.target.value === "all" ? "" : e.target.value,
              })
            }
            disabled={pending}
          >
            <option value="all">All clients</option>
            {clients
              .filter((c) => c.status === "CURRENT")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · Current
                </option>
              ))}
            {clients.some((c) => c.status === "COMPLETED") && (
              <option disabled>── Completed ──</option>
            )}
            {clients
              .filter((c) => c.status === "COMPLETED")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · Completed
                </option>
              ))}
          </Select>
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Category
          <Select
            className="mt-1.5"
            value={statusFilter || "all"}
            onChange={(e) => update({ status: e.target.value })}
            disabled={pending || !!selectedClientId}
          >
            <option value="all">Current + completed</option>
            <option value="CURRENT">Current only</option>
            <option value="COMPLETED">Completed only</option>
          </Select>
        </label>

        <label className="block text-sm font-medium text-zinc-700">
          Period
          <Select
            className="mt-1.5"
            value={preset}
            onChange={(e) => update({ preset: e.target.value })}
            disabled={pending}
          >
            <option value="day">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
            <option value="custom">Custom dates</option>
          </Select>
        </label>

        <div className="flex items-end gap-2">
          {preset === "custom" && (
            <>
              <label className="block flex-1 text-sm font-medium text-zinc-700">
                From
                <Input
                  type="date"
                  className="mt-1.5"
                  defaultValue={from}
                  onChange={(e) => update({ from: e.target.value, preset: "custom" })}
                />
              </label>
              <label className="block flex-1 text-sm font-medium text-zinc-700">
                To
                <Input
                  type="date"
                  className="mt-1.5"
                  defaultValue={to}
                  onChange={(e) => update({ to: e.target.value, preset: "custom" })}
                />
              </label>
            </>
          )}
          {!selectedClientId && (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => update({ clientId: "", status: "all" })}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
