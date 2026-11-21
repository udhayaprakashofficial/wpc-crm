import type { Role } from "@/generated/prisma/client";

export function canViewAllContacts(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

export function canManageTeam(role: Role) {
  return role === "OWNER";
}

export function canManageSettings(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

export function canEditFinance(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

export function canViewFinance(role: Role) {
  return role === "OWNER" || role === "MANAGER" || role === "ACCOUNTANT";
}

export function canManagePipeline(role: Role) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

export function canManageStaff(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}

export function canViewPayroll(role: Role) {
  return role === "OWNER" || role === "MANAGER" || role === "ACCOUNTANT";
}

export function canPaySalary(role: Role) {
  return role === "OWNER" || role === "MANAGER";
}
