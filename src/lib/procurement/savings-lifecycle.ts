import type { SavingOpportunityStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SAVING_STATUS_TRANSITIONS: Readonly<
  Record<SavingOpportunityStatus, readonly SavingOpportunityStatus[]>
> = {
  OPEN: ["IDENTIFIED", "DISMISSED"],
  REVIEW_REQUIRED: ["IDENTIFIED", "DISMISSED"],
  IDENTIFIED: ["NEGOTIATED", "DISMISSED", "STALE"],
  NEGOTIATED: ["CONTRACTED", "DISMISSED", "STALE"],
  ACCEPTED: ["CONTRACTED", "DISMISSED", "STALE"],
  CONTRACTED: ["REALIZED", "STALE"],
  REALIZED: [],
  DISMISSED: [],
  STALE: ["IDENTIFIED", "DISMISSED"],
};

export function assertSavingStatusTransition(
  from: SavingOpportunityStatus,
  to: SavingOpportunityStatus,
) {
  if (!SAVING_STATUS_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transizione del risparmio non ammessa: ${from} -> ${to}.`);
  }
}

export async function transitionSavingOpportunity(input: {
  opportunityId: string;
  organizationId: string;
  actorUserId: string;
  from: SavingOpportunityStatus;
  to: SavingOpportunityStatus;
}) {
  assertSavingStatusTransition(input.from, input.to);
  const updated = await prisma.technicalSavingOpportunity.updateMany({
    where: { id: input.opportunityId, organizationId: input.organizationId, status: input.from },
    data: { status: input.to, reviewedByUserId: input.actorUserId, reviewedAt: new Date() },
  });
  if (updated.count !== 1) {
    throw new Error(
      "L'opportunità di risparmio non esiste, appartiene a un'altra organizzazione o è già cambiata.",
    );
  }
  return prisma.technicalSavingOpportunity.findFirstOrThrow({
    where: { id: input.opportunityId, organizationId: input.organizationId },
  });
}
