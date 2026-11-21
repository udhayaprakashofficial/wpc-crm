import { differenceInCalendarDays, subDays } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";

export const WINBACK_INACTIVE_DAYS = 60;

export function winbackCutoff(ref = new Date()) {
  return subDays(ref, WINBACK_INACTIVE_DAYS);
}

/**
 * Customers with no meaningful activity for 60+ days.
 * Uses lastActivityAt when set; otherwise convertedAt/createdAt (not updatedAt),
 * so editing a contact doesn’t fake “activity” and new customers aren’t flagged.
 */
export function inactiveCustomerWhere(
  businessId: string,
  extra: Prisma.ContactWhereInput = {},
  ref = new Date(),
): Prisma.ContactWhereInput {
  const cutoff = winbackCutoff(ref);
  return {
    businessId,
    deletedAt: null,
    type: "CUSTOMER",
    AND: [
      {
        OR: [
          { lastActivityAt: { lt: cutoff } },
          {
            lastActivityAt: null,
            OR: [
              { convertedAt: { lt: cutoff } },
              { convertedAt: null, createdAt: { lt: cutoff } },
            ],
          },
        ],
      },
      extra,
    ],
  };
}

export function isInactiveCustomer(
  contact: {
    type: string;
    lastActivityAt: Date | null;
    convertedAt?: Date | null;
    createdAt: Date;
  },
  ref = new Date(),
) {
  if (contact.type !== "CUSTOMER") return false;
  const cutoff = winbackCutoff(ref);
  if (contact.lastActivityAt) return contact.lastActivityAt < cutoff;
  const anchor = contact.convertedAt ?? contact.createdAt;
  return anchor < cutoff;
}

export function daysInactive(
  contact: {
    lastActivityAt: Date | null;
    convertedAt?: Date | null;
    createdAt: Date;
  },
  ref = new Date(),
) {
  const anchor =
    contact.lastActivityAt ?? contact.convertedAt ?? contact.createdAt;
  return Math.max(0, differenceInCalendarDays(ref, anchor));
}

export const DEFAULT_WINBACK_MESSAGE = (firstName: string) =>
  `Hi ${firstName}, we miss you! We’d love to see you again this week — reply and we’ll take care of you.`;
