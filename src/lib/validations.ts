import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const signinSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2),
  industryOther: z.string().trim().max(80).optional().or(z.literal("")),
  fyStartMonth: z.union([z.coerce.number().int().min(1).max(12), z.literal("other")]),
  fyStartMonthOther: z.coerce.number().int().min(1).max(12).optional(),
  gstNumber: z.string().trim().max(20).optional().or(z.literal("")),
  yearlyRevenueGoalRupees: z.coerce.number().min(0).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(15)
    .regex(/^[0-9+\-\s]+$/, "Enter a valid phone number"),
  email: z.string().trim().email().optional().or(z.literal("")),
  source: z.enum([
    "WALK_IN",
    "INSTAGRAM",
    "FACEBOOK_AD",
    "GOOGLE",
    "WEBSITE",
    "REFERRAL",
    "WHATSAPP",
    "OTHER",
  ]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  createFollowUp: z.boolean().optional(),
  followUpAt: z.string().optional().or(z.literal("")),
});

export const dealMoveSchema = z.object({
  dealId: z.string().min(1),
  stageId: z.string().min(1),
  lostReason: z.string().trim().max(500).optional(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(2).max(200),
  note: z.string().max(2000).optional().or(z.literal("")),
  dueAt: z.string().min(1),
  contactId: z.string().optional().or(z.literal("")),
  dealId: z.string().optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignedToId: z.string().optional().or(z.literal("")),
});

export const publicLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(15),
  email: z.string().trim().email().optional().or(z.literal("")),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export const teamMemberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["MANAGER", "STAFF", "ACCOUNTANT"]),
});

export const expenseSchema = z.object({
  amountRupees: z.coerce.number().positive(),
  categoryId: z.string().min(1),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK", "CHEQUE", "OTHER"]),
  note: z.string().max(500).optional().or(z.literal("")),
  occurredAt: z.string().min(1),
});
