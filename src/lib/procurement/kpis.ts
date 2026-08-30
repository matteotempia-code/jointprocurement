import "server-only";

import { prisma } from "@/lib/prisma";
import { deliveriesTodayWhere, openOrdersWhere, overdueWhere, type FacilityScope } from "./kpi-definitions";

export function openIssuesWhere(scope: FacilityScope): import("@prisma/client").Prisma.QualityIssueWhereInput {
  return { purchaseOrderLine: { purchaseOrder: { facilityId: { in: scope.facilityIds } } }, status: { in: ["OPEN", "UNDER_REVIEW"] } };
}

export async function getOperationalKpis(scope: FacilityScope) {
  const [overdue, today, openOrders, openIssues, pendingApprovals] = await Promise.all([
    prisma.purchaseOrder.count({ where: overdueWhere(scope) }),
    prisma.purchaseOrder.count({ where: deliveriesTodayWhere(scope) }),
    prisma.purchaseOrder.count({ where: openOrdersWhere(scope) }),
    prisma.qualityIssue.count({ where: openIssuesWhere(scope) }),
    prisma.purchaseRequisition.count({ where: { facilityId: { in: scope.facilityIds }, status: "PENDING_APPROVAL" } }),
  ]);
  return { overdue, today, openOrders, openIssues, pendingApprovals };
}

export async function getPreferredCompliance(scope: FacilityScope) {
  const lines = await prisma.purchaseRequisitionLine.findMany({ where: { requisition: { facilityId: { in: scope.facilityIds }, status: "APPROVED" } }, select: { quantity: true, supplierOffer: { select: { preferred: true } } } });
  const total = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const preferred = lines.filter((line) => line.supplierOffer.preferred).reduce((sum, line) => sum + Number(line.quantity), 0);
  return { rate: total ? (preferred / total) * 100 : 0, sample: lines.length, quantity: total };
}
