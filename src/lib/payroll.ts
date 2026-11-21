import {
  endOfMonth,
  startOfMonth,
  eachDayOfInterval,
  isBefore,
  isAfter,
} from "date-fns";

export type AttendanceCounts = {
  presentDays: number;
  absentDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  overtimeMinutes: number;
};

export type StaffPayInput = {
  salaryType:
    | "MONTHLY_FIXED"
    | "DAILY_WAGE"
    | "HOURLY"
    | "COMMISSION"
    | "FIXED_PLUS_COMMISSION";
  basicPaise: number;
  allowancePaise: number;
  overtimeRatePaise: number;
  targetBonusPaise: number;
  joiningDate: Date;
  leftAt: Date | null;
};

export type PayBreakdown = AttendanceCounts & {
  basePaise: number;
  allowancePaise: number;
  overtimePaise: number;
  commissionPaise: number;
  incentivePaise: number;
  bonusPaise: number;
  absenceDeductionPaise: number;
  advanceDeductionPaise: number;
  otherDeductionPaise: number;
  netPaise: number;
  workingDaysInMonth: number;
};

export function monthBounds(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

/** Weekdays only — simple working-day count for absence deductions. */
export function workingDaysInRange(start: Date, end: Date) {
  return eachDayOfInterval({ start, end }).filter((d) => {
    const day = d.getDay();
    return day !== 0; // Sunday off (common for local shops; tweak later)
  }).length;
}

export function summarizeAttendance(
  rows: { status: string; overtimeMinutes: number }[],
): AttendanceCounts {
  const counts: AttendanceCounts = {
    presentDays: 0,
    absentDays: 0,
    halfDays: 0,
    leaveDays: 0,
    holidayDays: 0,
    overtimeMinutes: 0,
  };
  for (const row of rows) {
    counts.overtimeMinutes += row.overtimeMinutes || 0;
    switch (row.status) {
      case "PRESENT":
        counts.presentDays += 1;
        break;
      case "ABSENT":
        counts.absentDays += 1;
        break;
      case "HALF_DAY":
        counts.halfDays += 1;
        break;
      case "LEAVE":
        counts.leaveDays += 1;
        break;
      case "HOLIDAY":
        counts.holidayDays += 1;
        break;
    }
  }
  return counts;
}

export function calculateStaffPay(input: {
  staff: StaffPayInput;
  year: number;
  month: number;
  attendance: AttendanceCounts;
  commissionPaise: number;
  incentivePaise?: number;
  advanceDeductionPaise: number;
  otherDeductionPaise?: number;
  goalHit: boolean;
}): PayBreakdown {
  const { start, end } = monthBounds(input.year, input.month);
  const join = input.staff.joiningDate;
  const left = input.staff.leftAt;
  const effectiveStart = isAfter(join, start) ? join : start;
  const effectiveEnd = left && isBefore(left, end) ? left : end;
  const workingDays =
    isAfter(effectiveStart, effectiveEnd)
      ? 0
      : workingDaysInRange(effectiveStart, effectiveEnd);

  const att = input.attendance;
  const paidDays =
    att.presentDays + att.halfDays * 0.5 + att.holidayDays + att.leaveDays;

  let basePaise = 0;
  let absenceDeductionPaise = 0;
  let allowancePaise = input.staff.allowancePaise;

  switch (input.staff.salaryType) {
    case "MONTHLY_FIXED":
    case "FIXED_PLUS_COMMISSION": {
      basePaise = input.staff.basicPaise;
      if (workingDays > 0 && att.absentDays > 0) {
        const perDay = Math.round(input.staff.basicPaise / workingDays);
        absenceDeductionPaise = perDay * att.absentDays;
        // half-day already counted in paidDays; deduct half of per-day for half beyond? keep simple: absent only
      }
      // Pro-rate if joined mid-month
      if (workingDays > 0 && (isAfter(join, start) || (left && isBefore(left, end)))) {
        const fullMonthDays = workingDaysInRange(start, end);
        basePaise = Math.round(
          (input.staff.basicPaise * workingDays) / Math.max(1, fullMonthDays),
        );
        allowancePaise = Math.round(
          (input.staff.allowancePaise * workingDays) /
            Math.max(1, fullMonthDays),
        );
      }
      break;
    }
    case "DAILY_WAGE": {
      basePaise = Math.round(input.staff.basicPaise * paidDays);
      allowancePaise = Math.round(
        (input.staff.allowancePaise * paidDays) / Math.max(1, workingDays || 1),
      );
      break;
    }
    case "HOURLY": {
      // Assume 8h present day, 4h half-day
      const hours = att.presentDays * 8 + att.halfDays * 4;
      basePaise = input.staff.basicPaise * hours;
      break;
    }
    case "COMMISSION": {
      basePaise = 0;
      allowancePaise = 0;
      break;
    }
  }

  const overtimePaise = Math.round(
    (input.staff.overtimeRatePaise * att.overtimeMinutes) / 60,
  );
  const commissionPaise =
    input.staff.salaryType === "COMMISSION" ||
    input.staff.salaryType === "FIXED_PLUS_COMMISSION" ||
    input.commissionPaise > 0
      ? input.commissionPaise
      : 0;
  const incentivePaise = input.incentivePaise ?? 0;
  const bonusPaise =
    input.goalHit && input.staff.targetBonusPaise > 0
      ? input.staff.targetBonusPaise
      : 0;
  const otherDeductionPaise = input.otherDeductionPaise ?? 0;

  const gross =
    basePaise +
    allowancePaise +
    overtimePaise +
    commissionPaise +
    incentivePaise +
    bonusPaise;
  const deductions =
    absenceDeductionPaise +
    input.advanceDeductionPaise +
    otherDeductionPaise;
  const netPaise = Math.max(0, gross - deductions);

  return {
    ...att,
    basePaise,
    allowancePaise,
    overtimePaise,
    commissionPaise,
    incentivePaise,
    bonusPaise,
    absenceDeductionPaise,
    advanceDeductionPaise: input.advanceDeductionPaise,
    otherDeductionPaise,
    netPaise,
    workingDaysInMonth: workingDays,
  };
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}
