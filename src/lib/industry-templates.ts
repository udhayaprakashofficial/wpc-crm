export type IndustryTemplate = {
  id: string;
  label: string;
  stages: { name: string; key: string; color: string; isWon?: boolean; isLost?: boolean }[];
  expenseCategories: string[];
  incomeCategories: string[];
  tags: string[];
};

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: "salon",
    label: "Salon / Spa",
    stages: [
      { name: "New", key: "new", color: "#64748b" },
      { name: "Contacted", key: "contacted", color: "#0ea5e9" },
      { name: "Quote Sent", key: "quote_sent", color: "#a855f7" },
      { name: "Won", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Rent", "Salaries", "Products", "Marketing/Ads", "Utilities"],
    incomeCategories: ["Services", "Products", "Packages"],
    tags: ["VIP", "Regular", "Bridal"],
  },
  {
    id: "clinic",
    label: "Clinic",
    stages: [
      { name: "New enquiry", key: "new", color: "#64748b" },
      { name: "Consultation", key: "contacted", color: "#0ea5e9" },
      { name: "Treatment planned", key: "quote_sent", color: "#a855f7" },
      { name: "Converted", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Rent", "Salaries", "Medicines", "Equipment", "Marketing/Ads"],
    incomeCategories: ["Consultations", "Procedures", "Pharmacy"],
    tags: ["Follow-up", "New patient"],
  },
  {
    id: "gym",
    label: "Gym / Fitness",
    stages: [
      { name: "New lead", key: "new", color: "#64748b" },
      { name: "Trial booked", key: "contacted", color: "#0ea5e9" },
      { name: "Membership offered", key: "quote_sent", color: "#a855f7" },
      { name: "Joined", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Rent", "Salaries", "Equipment", "Marketing/Ads", "Utilities"],
    incomeCategories: ["Memberships", "Personal training", "Merchandise"],
    tags: ["PT interest", "Corporate"],
  },
  {
    id: "interior",
    label: "Interior design",
    stages: [
      { name: "New", key: "new", color: "#64748b" },
      { name: "Site visit", key: "contacted", color: "#0ea5e9" },
      { name: "Proposal sent", key: "quote_sent", color: "#a855f7" },
      { name: "Won", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Materials", "Labour", "Transport", "Marketing/Ads", "Rent"],
    incomeCategories: ["Projects", "Consultation"],
    tags: ["Residential", "Commercial"],
  },
  {
    id: "coaching",
    label: "Coaching / Tuition",
    stages: [
      { name: "Enquiry", key: "new", color: "#64748b" },
      { name: "Demo done", key: "contacted", color: "#0ea5e9" },
      { name: "Fee shared", key: "quote_sent", color: "#a855f7" },
      { name: "Enrolled", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Rent", "Salaries", "Materials", "Marketing/Ads"],
    incomeCategories: ["Fees", "Workshops"],
    tags: ["Batch A", "Online"],
  },
  {
    id: "shop",
    label: "Retail / Shop",
    stages: [
      { name: "New", key: "new", color: "#64748b" },
      { name: "Contacted", key: "contacted", color: "#0ea5e9" },
      { name: "Quote Sent", key: "quote_sent", color: "#a855f7" },
      { name: "Won", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Rent", "Inventory", "Salaries", "Marketing/Ads", "Transport"],
    incomeCategories: ["Sales", "Services"],
    tags: ["Wholesale", "Retail"],
  },
  {
    id: "other",
    label: "Other",
    stages: [
      { name: "New", key: "new", color: "#64748b" },
      { name: "Contacted", key: "contacted", color: "#0ea5e9" },
      { name: "Proposal", key: "quote_sent", color: "#a855f7" },
      { name: "Won", key: "won", color: "#16a34a", isWon: true },
      { name: "Lost", key: "lost", color: "#dc2626", isLost: true },
    ],
    expenseCategories: ["Rent", "Salaries", "Marketing/Ads", "Utilities", "Other"],
    incomeCategories: ["Sales", "Services", "Other"],
    tags: ["Important", "Follow-up"],
  },
];

export function getIndustryTemplate(id: string) {
  if (id === "other" || !INDUSTRY_TEMPLATES.some((t) => t.id === id)) {
    return INDUSTRY_TEMPLATES.find((t) => t.id === "other") ?? INDUSTRY_TEMPLATES[0];
  }
  return INDUSTRY_TEMPLATES.find((t) => t.id === id) ?? INDUSTRY_TEMPLATES[0];
}
