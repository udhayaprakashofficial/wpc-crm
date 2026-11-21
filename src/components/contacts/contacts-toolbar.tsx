"use client";

import { FormEvent, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowUpDown, Download, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SOURCES = [
  "WALK_IN",
  "INSTAGRAM",
  "FACEBOOK_AD",
  "GOOGLE",
  "WEBSITE",
  "REFERRAL",
  "WHATSAPP",
  "OTHER",
] as const;

export function ContactsToolbar({
  totalLabel,
}: {
  totalLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const source = searchParams.get("source") || "";
  const sort = searchParams.get("sort") || "updated_desc";
  const segment = searchParams.get("segment") || "";
  const filterCount = [type, source].filter(Boolean).length;

  function push(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "contacts");
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function onSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    push({ q: String(fd.get("q") || "").trim() || null });
  }

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form onSubmit={onSearch} className="relative min-w-0 flex-1">
          {segment ? <input type="hidden" name="segment" value={segment} /> : null}
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search name or phone"
            className="pl-10"
          />
        </form>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setShowFilters((v) => !v);
              setShowSort(false);
            }}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl border bg-white px-3.5 text-sm font-semibold",
              showFilters || filterCount
                ? "border-blue-300 text-blue-700"
                : "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {filterCount > 0 ? (
              <span className="rounded-full bg-blue-600 px-1.5 text-[10px] text-white">
                {filterCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSort((v) => !v);
              setShowFilters(false);
            }}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-xl border bg-white px-3.5 text-sm font-semibold",
              showSort
                ? "border-blue-300 text-blue-700"
                : "border-zinc-200 text-zinc-700 hover:bg-zinc-50",
            )}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort
          </button>
          <a
            href={`/app/contacts/export${segment ? `?segment=${segment}` : ""}`}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </a>
        </div>
      </div>

      {showFilters && (
        <div className="sp-card sp-shadow grid gap-3 p-4 sm:grid-cols-3">
          <label className="text-sm font-medium text-zinc-700">
            Type
            <Select
              className="mt-1.5"
              value={type || "all"}
              onChange={(e) =>
                push({
                  type: e.target.value === "all" ? null : e.target.value,
                  segment: null,
                })
              }
            >
              <option value="all">All</option>
              <option value="LEAD">Lead</option>
              <option value="CUSTOMER">Customer</option>
            </Select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Source
            <Select
              className="mt-1.5"
              value={source || "all"}
              onChange={(e) =>
                push({
                  source: e.target.value === "all" ? null : e.target.value,
                })
              }
            >
              <option value="all">All sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                push({ type: null, source: null });
                setShowFilters(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </Button>
          </div>
          {totalLabel ? (
            <p className="text-xs text-zinc-500 sm:col-span-3">{totalLabel}</p>
          ) : null}
        </div>
      )}

      {showSort && (
        <div className="sp-card sp-shadow p-2">
          {(
            [
              ["updated_desc", "Newest updated"],
              ["created_desc", "Newest created"],
              ["name_asc", "Name A–Z"],
              ["name_desc", "Name Z–A"],
              ["activity_desc", "Last activity"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                push({ sort: value });
                setShowSort(false);
              }}
              className={cn(
                "flex w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium",
                sort === value
                  ? "bg-blue-50 text-blue-700"
                  : "text-zinc-700 hover:bg-zinc-50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
