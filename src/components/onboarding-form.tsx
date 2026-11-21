"use client";

import { useState } from "react";
import { INDUSTRY_TEMPLATES } from "@/lib/industry-templates";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const FY_MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export function OnboardingForm() {
  const [industry, setIndustry] = useState("salon");
  const [fyMonth, setFyMonth] = useState("4");
  const showIndustryOther = industry === "other";

  return (
    <form action={completeOnboarding} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Business name
        <Input name="businessName" required placeholder="Shine Salon" />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Industry
        <Select
          name="industry"
          required
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
        >
          {INDUSTRY_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </label>

      {showIndustryOther && (
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          Describe your industry
          <Input
            name="industryOther"
            required
            placeholder="e.g. Catering, Photography, CA firm"
          />
        </label>
      )}

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Financial year starts
        <Select
          name="fyStartMonth"
          value={fyMonth}
          onChange={(e) => setFyMonth(e.target.value)}
        >
          {FY_MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
          <option value="other">Other</option>
        </Select>
      </label>

      {fyMonth === "other" && (
        <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
          FY start month (1–12)
          <Input
            name="fyStartMonthOther"
            type="number"
            min={1}
            max={12}
            required
            placeholder="e.g. 7 for July"
          />
        </label>
      )}

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        GST number (optional)
        <Input name="gstNumber" placeholder="22AAAAA0000A1Z5" />
      </label>

      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
        Yearly revenue goal ₹ (optional)
        <Input
          name="yearlyRevenueGoalRupees"
          type="number"
          placeholder="2400000"
        />
      </label>

      <Button type="submit" size="lg" className="mt-2 w-full">
        Create workspace
      </Button>
    </form>
  );
}
