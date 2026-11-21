"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDeal, moveDeal } from "@/app/actions/deals";
import { formatINR } from "@/lib/money";
import { useWonCelebration } from "@/components/pipeline/won-celebration";

type Stage = {
  id: string;
  name: string;
  color: string | null;
  isLost: boolean;
  isWon: boolean;
};

type Deal = {
  id: string;
  title: string;
  valuePaise: number;
  stageId: string;
  status: string;
  contact: { name: string; phone: string };
};

type ContactOption = { id: string; name: string; phone: string };

export function PipelineBoard({
  stages,
  deals: initialDeals,
  contacts,
}: {
  stages: Stage[];
  deals: Deal[];
  contacts: ContactOption[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [pendingLost, setPendingLost] = useState<{
    dealId: string;
    stageId: string;
  } | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { celebrateWon, celebration } = useWonCelebration();

  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  const totals = useMemo(() => {
    const openValue = deals
      .filter((d) => d.status === "OPEN")
      .reduce((s, d) => s + d.valuePaise, 0);
    return { count: deals.length, openValue };
  }, [deals]);

  function onMove(dealId: string, stageId: string) {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;

    if (stage.isLost) {
      setPendingLost({ dealId, stageId });
      setLostReason("");
      return;
    }

    const deal = deals.find((d) => d.id === dealId);
    // Only celebrate a real transition into Won — not edits or already-won deals.
    const becomingWon = Boolean(
      stage.isWon && deal && deal.status !== "WON",
    );

    const previous = deals;
    setDeals((current) =>
      current.map((d) =>
        d.id === dealId
          ? {
              ...d,
              stageId,
              status: stage.isWon ? "WON" : "OPEN",
            }
          : d,
      ),
    );
    setError(null);

    if (becomingWon) {
      celebrateWon(dealId);
    }

    startTransition(async () => {
      const result = await moveDeal({ dealId, stageId });
      if (result.error) {
        setDeals(previous);
        setError(result.error);
        return;
      }
      if (
        "needsPortfolio" in result &&
        result.needsPortfolio &&
        result.contactId
      ) {
        router.push(`/app/contacts/${result.contactId}/convert`);
      }
    });
  }

  function confirmLost() {
    if (!pendingLost) return;
    const previous = deals;
    setDeals((current) =>
      current.map((d) =>
        d.id === pendingLost.dealId
          ? { ...d, stageId: pendingLost.stageId, status: "LOST" }
          : d,
      ),
    );
    const payload = { ...pendingLost, lostReason };
    setPendingLost(null);

    startTransition(async () => {
      const result = await moveDeal(payload);
      if (result.error) {
        setDeals(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {totals.count} deal{totals.count === 1 ? "" : "s"} · open value{" "}
          <span className="font-semibold text-zinc-800">
            {formatINR(totals.openValue)}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex h-10 items-center rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          {showAdd ? "Close" : "+ Deal"}
        </button>
      </div>

      {showAdd && (
        <form
          action={async (fd) => {
            setError(null);
            startTransition(async () => {
              const result = await createDeal(fd);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setShowAdd(false);
              router.refresh();
            });
          }}
          className="sp-card sp-shadow grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="text-sm font-medium text-zinc-700 sm:col-span-2 lg:col-span-1">
            Contact
            <select
              name="contactId"
              required
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select contact
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.phone}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Title
            <input
              name="title"
              required
              placeholder="e.g. Bridal package"
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Value ₹
            <input
              name="valueRupees"
              type="number"
              min={0}
              defaultValue={0}
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-zinc-700">
            Stage
            <select
              name="stageId"
              className="mt-1.5 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"
              defaultValue={stages.find((s) => !s.isWon && !s.isLost)?.id}
            >
              {stages
                .filter((s) => !s.isWon && !s.isLost)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={pending || contacts.length === 0}
              className="inline-flex h-11 items-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {contacts.length === 0
                ? "Add a contact first"
                : pending
                  ? "Saving…"
                  : "Create deal"}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="-mx-4 flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        {stages.map((stage) => {
          const columnDeals = deals.filter((d) => d.stageId === stage.id);
          const columnValue = columnDeals.reduce(
            (s, d) => s + d.valuePaise,
            0,
          );
          return (
            <section
              key={stage.id}
              className="flex w-[280px] shrink-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <header className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-3 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: stage.color || "#71717a" }}
                  />
                  <h3 className="truncate text-sm font-semibold text-zinc-800">
                    {stage.name}
                  </h3>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                    {columnDeals.length}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                  {formatINR(columnValue)}
                </span>
              </header>

              <div className="flex min-h-[280px] flex-1 flex-col gap-2 overflow-y-auto p-3">
                {columnDeals.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-200 px-3 py-8 text-center text-xs text-zinc-400">
                    No deals
                  </p>
                ) : (
                  columnDeals.map((deal) => (
                    <article
                      key={deal.id}
                      className="rounded-xl border border-zinc-200 bg-[#fafafa] p-3"
                    >
                      <p className="font-semibold text-zinc-900">
                        {deal.contact.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {deal.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        {deal.contact.phone}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-zinc-800">
                        {formatINR(deal.valuePaise)}
                      </p>
                      <select
                        className="mt-3 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-blue-500"
                        value={deal.stageId}
                        disabled={pending}
                        onChange={(e) => onMove(deal.id, e.target.value)}
                        aria-label={`Move ${deal.contact.name}`}
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            Move to {s.name}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {pendingLost && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">
              Why was this deal lost?
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Capturing the reason helps you improve follow-ups.
            </p>
            <textarea
              className="mt-3 min-h-24 w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-blue-500"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="Price too high, chose competitor, no reply…"
              autoFocus
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="h-11 flex-1 rounded-xl border border-zinc-200 font-medium"
                onClick={() => setPendingLost(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-11 flex-1 rounded-xl bg-red-600 font-semibold text-white disabled:opacity-50"
                disabled={!lostReason.trim() || pending}
                onClick={confirmLost}
              >
                Mark lost
              </button>
            </div>
          </div>
        </div>
      )}

      {celebration}
    </div>
  );
}
