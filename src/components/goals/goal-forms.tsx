"use client";

import { upsertRevenueGoal, assignStaffTarget } from "@/app/actions/goals";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";

type Member = { userId: string; name: string };

export function UpdateGoalForm({
  fyYear,
  targetRupees,
  hasTarget,
}: {
  fyYear: number;
  targetRupees: string;
  hasTarget: boolean;
}) {
  const { showSuccess } = useToast();

  return (
    <section className="sp-card sp-shadow mb-5 p-5">
      <h2 className="text-base font-semibold text-zinc-900">
        {hasTarget ? "Update yearly goal" : "Set yearly goal"}
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Enter the amount in rupees (e.g. 2500000 for ₹25 lakh).
      </p>
      <form
        className="mt-4 space-y-3"
        action={async (formData) => {
          await upsertRevenueGoal(formData);
          showSuccess(hasTarget ? "Goal updated" : "Goal saved");
        }}
      >
        <label className="block text-sm font-medium text-zinc-700">
          Target (₹)
          <Input
            name="targetRupees"
            type="number"
            required
            min={1}
            defaultValue={targetRupees}
            placeholder="2500000"
            className="mt-1.5"
          />
        </label>
        <input type="hidden" name="fyYear" value={fyYear} />
        <label className="block text-sm font-medium text-zinc-700">
          Note <span className="font-normal text-zinc-400">(optional)</span>
          <Input
            name="note"
            placeholder="Why did you change it?"
            className="mt-1.5"
          />
        </label>
        <SubmitButton className="w-full sm:w-auto">
          {hasTarget ? "Save changes" : "Save goal"}
        </SubmitButton>
      </form>
    </section>
  );
}

export function AssignStaffTargetForm({
  goalId,
  members,
}: {
  goalId: string;
  members: Member[];
}) {
  const { showSuccess } = useToast();

  return (
    <section className="sp-card sp-shadow mb-5 p-5">
      <h2 className="text-base font-semibold text-zinc-900">
        Assign a staff target
      </h2>
      <p className="mt-1 text-sm text-zinc-500">
        Give someone on your team their own revenue number.
      </p>
      <form
        className="mt-4 space-y-3"
        action={async (formData) => {
          await assignStaffTarget(formData);
          showSuccess("Staff target assigned");
        }}
      >
        <input type="hidden" name="goalId" value={goalId} />
        <label className="block text-sm font-medium text-zinc-700">
          Team member
          <Select name="userId" required className="mt-1.5">
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="block text-sm font-medium text-zinc-700">
          Their target (₹)
          <Input
            name="targetRupees"
            type="number"
            required
            min={1}
            placeholder="500000"
            className="mt-1.5"
          />
        </label>
        <SubmitButton
          variant="secondary"
          pendingLabel="Assigning…"
          className="w-full sm:w-auto"
        >
          Assign target
        </SubmitButton>
      </form>
    </section>
  );
}
