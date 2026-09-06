"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();
const target = (path: string, result: string) => redirect(`${path}?esito=${result}`);
const admin = () => requireRoles(["PROCUREMENT_ADMIN"]);

async function audit(actorUserId: string, entityType: string, entityId: string, action: string, metadata: Record<string, unknown> = {}) {
  await prisma.auditEvent.create({ data: { actorUserId, entityType, entityId, action, metadata: metadata as Prisma.InputJsonValue } });
}

export async function updateOrganization(formData: FormData) {
  const context = await admin();
  const name = clean(formData.get("name"));
  if (name.length < 3) target("/organization", "nome-non-valido");
  await prisma.organization.update({ where: { id: context.organization.id }, data: { name } });
  await audit(context.user.id, "ORGANIZATION", context.organization.id, "UPDATED", { name });
  revalidatePath("/organization");
  target("/organization", "salvata");
}

export async function manageLegalEntity(formData: FormData) {
  const context = await admin();
  const intent = clean(formData.get("intent"));
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (intent === "create") {
    if (name.length < 3) target("/organization", "nome-non-valido");
    const duplicate = await prisma.legalEntity.findFirst({ where: { organizationId: context.organization.id, name: { equals: name, mode: "insensitive" } } });
    if (duplicate) target("/organization", "duplicato");
    const entity = await prisma.legalEntity.create({ data: { organizationId: context.organization.id, name } });
    await audit(context.user.id, "LEGAL_ENTITY", entity.id, "CREATED", { name });
  } else {
    const entity = await prisma.legalEntity.findFirstOrThrow({ where: { id, organizationId: context.organization.id }, include: { areas: true } });
    if (intent === "update") {
      if (name.length < 3) target("/organization", "nome-non-valido");
      await prisma.legalEntity.update({ where: { id }, data: { name } });
      await audit(context.user.id, "LEGAL_ENTITY", id, "UPDATED", { name });
    } else if (intent === "delete") {
      if (entity.areas.length) target("/organization", "entita-in-uso");
      await audit(context.user.id, "LEGAL_ENTITY", id, "DELETED", { name: entity.name });
      await prisma.legalEntity.delete({ where: { id } });
    }
  }
  revalidatePath("/organization");
  target("/organization", "salvata");
}

export async function manageUser(formData: FormData) {
  const context = await admin();
  const intent = clean(formData.get("intent"));
  const assignmentId = clean(formData.get("assignmentId"));
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLocaleLowerCase("it-IT");
  const roleId = clean(formData.get("roleId"));
  const scopeType = clean(formData.get("scopeType")) || "ORGANIZATION";
  const scopeId = clean(formData.get("scopeId")) || null;
  if (intent === "create") {
    if (name.length < 3 || !email.includes("@")) target("/users", "dati-non-validi");
    const duplicate = await prisma.user.findUnique({ where: { email } });
    if (duplicate) target("/users", "duplicato");
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) target("/users", "ruolo-non-valido");
    const user = await prisma.user.create({ data: { name, email, assignments: { create: { roleId, organizationId: context.organization.id, scopeType, scopeId } } } });
    await audit(context.user.id, "USER", user.id, "CREATED", { email, roleId, scopeType, scopeId });
  } else {
    const assignment = await prisma.userAssignment.findFirstOrThrow({ where: { id: assignmentId, organizationId: context.organization.id }, include: { user: true } });
    if (intent === "update") {
      if (name.length < 3 || !email.includes("@")) target("/users", "dati-non-validi");
      await prisma.$transaction([
        prisma.user.update({ where: { id: assignment.userId }, data: { name, email } }),
        prisma.userAssignment.update({ where: { id: assignment.id }, data: { roleId, scopeType, scopeId, active: true } }),
      ]);
      await audit(context.user.id, "USER", assignment.userId, "UPDATED", { roleId, scopeType, scopeId });
    } else if (intent === "deactivate") {
      if (assignment.userId === context.user.id) target("/users", "auto-disattivazione-vietata");
      await prisma.userAssignment.update({ where: { id: assignment.id }, data: { active: false } });
      await audit(context.user.id, "USER", assignment.userId, "DEACTIVATED", { assignmentId });
    } else if (intent === "delete") {
      const linked = await prisma.user.findUnique({ where: { id: assignment.userId }, include: { _count: { select: { requisitions: true, approvals: true, receipts: true, auditEvents: true, uploadedDocuments: true } } } });
      if (!linked || Object.values(linked._count).some(Boolean)) target("/users", "utente-in-uso");
      await prisma.user.delete({ where: { id: assignment.userId } });
    }
  }
  revalidatePath("/users");
  target("/users", "salvato");
}

export async function manageDelegation(formData: FormData) {
  const context = await admin();
  const intent = clean(formData.get("intent"));
  const id = clean(formData.get("id"));
  const delegatorId = clean(formData.get("delegatorId"));
  const delegateId = clean(formData.get("delegateId"));
  const validFrom = new Date(clean(formData.get("validFrom")));
  const validUntil = new Date(clean(formData.get("validUntil")));
  if (intent === "create") {
    if (!delegatorId || delegatorId === delegateId || Number.isNaN(+validFrom) || +validUntil <= +validFrom) target("/deleghe", "dati-non-validi");
    const members = await prisma.userAssignment.count({ where: { organizationId: context.organization.id, userId: { in: [delegatorId, delegateId] }, active: true } });
    if (members < 2) target("/deleghe", "scope-non-valido");
    const conflict = await prisma.approvalDelegation.findFirst({ where: { organizationId: context.organization.id, delegatorId, delegateId, active: true, validFrom: { lte: validUntil }, validUntil: { gte: validFrom } } });
    if (conflict) target("/deleghe", "conflitto");
    const row = await prisma.approvalDelegation.create({ data: { delegatorId, delegateId, organizationId: context.organization.id, scopeType: "ORGANIZATION", validFrom, validUntil } });
    await audit(context.user.id, "APPROVAL_DELEGATION", row.id, "CREATED");
  } else {
    const row = await prisma.approvalDelegation.findFirstOrThrow({ where: { id, organizationId: context.organization.id } });
    if (intent === "update") {
      if (+validUntil <= +validFrom) target("/deleghe", "dati-non-validi");
      await prisma.approvalDelegation.update({ where: { id }, data: { validFrom, validUntil, active: true } });
      await audit(context.user.id, "APPROVAL_DELEGATION", row.id, "UPDATED");
    } else {
      await prisma.approvalDelegation.update({ where: { id }, data: { active: false } });
      await audit(context.user.id, "APPROVAL_DELEGATION", row.id, "DEACTIVATED");
    }
  }
  revalidatePath("/deleghe");
  target("/deleghe", "salvata");
}

export async function manageSupplier(formData: FormData) {
  const context = await admin(); const intent = clean(formData.get("intent")); const id = clean(formData.get("id"));
  const name = clean(formData.get("name")); const vatNumber = clean(formData.get("vatNumber")) || null; const contactEmail = clean(formData.get("contactEmail")) || null;
  if (intent === "create") {
    if (name.length < 3) target("/suppliers", "dati-non-validi");
    if (vatNumber && await prisma.supplier.findUnique({ where: { vatNumber } })) target("/suppliers", "duplicato");
    const row = await prisma.supplier.create({ data: { name, vatNumber, contactEmail } }); await audit(context.user.id, "SUPPLIER", row.id, "CREATED");
  } else {
    const row = await prisma.supplier.findUniqueOrThrow({ where: { id } });
    if (intent === "update") { await prisma.supplier.update({ where: { id }, data: { name, vatNumber, contactEmail } }); await audit(context.user.id, "SUPPLIER", id, "UPDATED"); }
    else { await prisma.supplier.update({ where: { id }, data: { active: false, offers: { updateMany: { where: { active: true }, data: { active: false } } } } }); await audit(context.user.id, "SUPPLIER", row.id, "DEACTIVATED"); }
  }
  revalidatePath("/suppliers"); target("/suppliers", "salvato");
}

export async function manageProduct(formData: FormData) {
  const context = await admin(); const intent = clean(formData.get("intent")); const id = clean(formData.get("id"));
  const name = clean(formData.get("name")); const categoryId = clean(formData.get("categoryId")); const uom = clean(formData.get("uom")) || "PACK";
  if (intent === "create") {
    if (name.length < 3 || !await prisma.category.findUnique({ where: { id: categoryId } })) target("/products", "dati-non-validi");
    const duplicate = await prisma.canonicalProduct.findFirst({ where: { name: { equals: name, mode: "insensitive" }, categoryId } }); if (duplicate) target("/products", "duplicato");
    const row = await prisma.canonicalProduct.create({ data: { name, categoryId, uom, purchaseUom: uom, unitsPerPackage: 1, consumptionUom: "PIECE", active: true } }); await audit(context.user.id, "CANONICAL_PRODUCT", row.id, "CREATED");
  } else {
    const row = await prisma.canonicalProduct.findUniqueOrThrow({ where: { id } });
    if (intent === "update") { await prisma.canonicalProduct.update({ where: { id }, data: { name, categoryId, uom, purchaseUom: uom } }); await audit(context.user.id, "CANONICAL_PRODUCT", id, "UPDATED"); }
    else { await prisma.canonicalProduct.update({ where: { id }, data: { active: false, offers: { updateMany: { where: { active: true }, data: { active: false } } } } }); await audit(context.user.id, "CANONICAL_PRODUCT", row.id, "DEACTIVATED"); }
  }
  revalidatePath("/products"); target("/products", "salvato");
}

export async function manageCategory(formData: FormData) {
  const context = await admin(); const intent = clean(formData.get("intent")); const id = clean(formData.get("id")); const name = clean(formData.get("name")); const code = clean(formData.get("code")).toUpperCase();
  if (intent === "create") {
    if (name.length < 3 || code.length < 2) target("/categorie", "dati-non-validi");
    if (await prisma.category.findUnique({ where: { code } })) target("/categorie", "duplicato");
    const row = await prisma.category.create({ data: { name, code } }); await audit(context.user.id, "CATEGORY", row.id, "CREATED");
  } else {
    const row = await prisma.category.findUniqueOrThrow({ where: { id }, include: { _count: { select: { products: true, budgets: true, procurementLimits: true } } } });
    if (intent === "update") { await prisma.category.update({ where: { id }, data: { name, code } }); await audit(context.user.id, "CATEGORY", id, "UPDATED"); }
    else { if (Object.values(row._count).some(Boolean)) target("/categorie", "categoria-in-uso"); await audit(context.user.id, "CATEGORY", id, "DELETED", { name: row.name }); await prisma.category.delete({ where: { id } }); }
  }
  revalidatePath("/categorie"); target("/categorie", "salvata");
}
