export const BUSINESS_BACKUP_VERSION = 1;

export type BusinessBackup = {
  version: number;
  exportedAt: string;
  business: {
    name: string;
    industry: string;
    gstNumber: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    fyStartMonth: number;
    yearlyRevenueGoalPaise: number | null;
  };
  categories: {
    kind: "INCOME" | "EXPENSE";
    name: string;
  }[];
  pipelineStages: {
    name: string;
    key: string;
    position: number;
    color: string | null;
    isWon: boolean;
    isLost: boolean;
  }[];
  contacts: {
    type: "LEAD" | "CUSTOMER";
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    source: string;
    sourceDetail: string | null;
    notes: string | null;
    birthday: string | null;
    anniversary: string | null;
  }[];
  deals: {
    contactPhone: string;
    stageKey: string;
    title: string;
    valuePaise: number;
    status: "OPEN" | "WON" | "LOST";
    lostReason: string | null;
    notes: string | null;
  }[];
  tasks: {
    contactPhone: string | null;
    title: string;
    note: string | null;
    dueAt: string;
    status: string;
    priority: string;
  }[];
  vendors: {
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  }[];
  transactions: {
    type: "INCOME" | "EXPENSE";
    amountPaise: number;
    occurredAt: string;
    paymentMode: string;
    categoryName: string | null;
    vendorName: string | null;
    contactPhone: string | null;
    note: string | null;
  }[];
  invoices: {
    contactPhone: string;
    number: string;
    status: string;
    issueDate: string;
    dueDate: string | null;
    subtotalPaise: number;
    taxPaise: number;
    discountPaise: number;
    totalPaise: number;
    amountPaidPaise: number;
    notes: string | null;
    items: {
      description: string;
      quantity: number;
      unitPaise: number;
      taxRateBps: number;
      amountPaise: number;
    }[];
  }[];
  appointments: {
    contactPhone: string;
    title: string;
    serviceName: string | null;
    startsAt: string;
    endsAt: string;
    status: string;
    notes: string | null;
  }[];
  staffMembers: {
    name: string;
    phone: string | null;
    jobTitle: string | null;
    joiningDate: string;
    status: string;
    salaryType: string;
    basicPaise: number;
    allowancePaise: number;
    overtimeRatePaise: number;
    commissionBasis: string;
    commissionBps: number;
    commissionFlatPaise: number;
    targetBonusPaise: number;
    upiId: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
    notes: string | null;
  }[];
};

export function isBusinessBackup(data: unknown): data is BusinessBackup {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    d.version === BUSINESS_BACKUP_VERSION &&
    typeof d.business === "object" &&
    Array.isArray(d.contacts)
  );
}
