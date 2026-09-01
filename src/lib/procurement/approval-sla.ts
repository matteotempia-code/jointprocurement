import { daysBetween } from "@/lib/presentation/format";

export const DEFAULT_APPROVAL_SLA_DAYS = 3;
export function approvalSla(requestedAt: Date, now = new Date(), targetDays = DEFAULT_APPROVAL_SLA_DAYS) {
  const ageDays = daysBetween(requestedAt, now);
  const state = ageDays > targetDays ? "overdue" : ageDays === targetDays ? "warn" : "ok";
  return { ageDays, targetDays, state, label: state === "overdue" ? "SLA superato" : state === "warn" ? "SLA in scadenza" : "Nei tempi" } as const;
}
