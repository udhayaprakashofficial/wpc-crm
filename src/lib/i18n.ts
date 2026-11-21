export type Locale = "en" | "hi" | "ta";

const dict = {
  en: {
    home: "Home",
    pipeline: "Pipeline",
    contacts: "Contacts",
    tasks: "Follow-ups",
    finance: "Finance",
    goals: "Goals",
    more: "More",
    addLead: "+ Lead",
    addExpense: "+ Expense",
    addFollowUp: "+ Follow-up",
    save: "Save",
    upgrade: "Upgrade plan",
  },
  hi: {
    home: "होम",
    pipeline: "पाइपलाइन",
    contacts: "संपर्क",
    tasks: "फॉलो-अप",
    finance: "वित्त",
    goals: "लक्ष्य",
    more: "और",
    addLead: "+ लीड",
    addExpense: "+ खर्च",
    addFollowUp: "+ फॉलो-अप",
    save: "सेव",
    upgrade: "प्लान अपग्रेड",
  },
  ta: {
    home: "முகப்பு",
    pipeline: "பைப்லைன்",
    contacts: "தொடர்புகள்",
    tasks: "பின்தொடர்தல்",
    finance: "நிதி",
    goals: "இலக்குகள்",
    more: "மேலும்",
    addLead: "+ லீட்",
    addExpense: "+ செலவு",
    addFollowUp: "+ பின்தொடர்தல்",
    save: "சேமி",
    upgrade: "திட்டம் மேம்படுத்து",
  },
} as const;

export type MessageKey = keyof (typeof dict)["en"];

export function t(locale: Locale, key: MessageKey) {
  return dict[locale][key] ?? dict.en[key];
}

export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "ta", label: "தமிழ்" },
];
