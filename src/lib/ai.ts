/** Lightweight AI stubs — swap for real LLM later. */

export function draftFollowUpMessage(input: {
  contactName: string;
  context?: string;
  tone?: "friendly" | "formal";
}) {
  const tone = input.tone === "formal" ? "formal" : "friendly";
  if (tone === "formal") {
    return `Dear ${input.contactName},\n\nFollowing up regarding ${input.context || "our discussion"}. Please let us know a convenient time to connect.\n\nRegards`;
  }
  return `Hi ${input.contactName}! 👋 Just checking in about ${input.context || "your enquiry"}. Happy to help whenever you're free.`;
}

export function scoreLead(input: {
  source: string;
  hasEmail: boolean;
  hasPhone: boolean;
  activityCount: number;
  daysSinceCreated: number;
}) {
  let score = 40;
  if (input.hasPhone) score += 15;
  if (input.hasEmail) score += 10;
  if (["REFERRAL", "WEBSITE", "GOOGLE"].includes(input.source)) score += 15;
  if (["INSTAGRAM", "FACEBOOK_AD"].includes(input.source)) score += 8;
  score += Math.min(20, input.activityCount * 4);
  if (input.daysSinceCreated > 14) score -= 10;
  if (input.daysSinceCreated > 30) score -= 15;
  return Math.max(0, Math.min(100, score));
}

export function summarizeWeek(input: {
  newLeads: number;
  wonDeals: number;
  incomePaise: number;
  expensePaise: number;
  overdueTasks: number;
}) {
  const net = input.incomePaise - input.expensePaise;
  return `This week: ${input.newLeads} new leads, ${input.wonDeals} deals won. Net ₹${(net / 100).toFixed(0)}. ${input.overdueTasks} overdue follow-ups.`;
}
