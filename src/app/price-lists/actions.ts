"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth";

export async function confirmPriceListCondition(formData: FormData) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const conditionId = String(formData.get("conditionId"));
  const condition = await prisma.priceListCommercialCondition.findFirstOrThrow({ where: { id: conditionId, priceList: { importJob: { sourceDocument: { organizationId: context.assignment.organizationId } } } } });
  await prisma.$transaction([
    prisma.priceListCommercialCondition.update({ where: { id: condition.id }, data: { humanConfirmationState: "CONFIRMED", confirmedByUserId: context.user.id, confirmedAt: new Date() } }),
    prisma.procurementMemory.create({ data: { organizationId: context.assignment.organizationId, memoryType: "COMMERCIAL_PHRASE", lookupKey: condition.sourceEvidence.toLocaleLowerCase("it-IT").slice(0,250), canonicalValue: { conditionType: condition.conditionType, numericValue: condition.numericValue, textValue: condition.textValue, currency: condition.currency }, sourceEntityId: condition.id, confirmedByUserId: context.user.id } }),
    prisma.auditEvent.create({ data: { actorUserId: context.user.id, entityType: "PRICE_LIST_CONDITION", entityId: condition.id, action: "COMMERCIAL_CONDITION_CONFIRMED", metadata: { priceListId: condition.priceListId, conditionType: condition.conditionType } } }),
  ]);
  revalidatePath(`/price-lists/${condition.priceListId}`);
}
