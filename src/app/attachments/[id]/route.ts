import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveScope } from "@/lib/scope";
import { getDocumentStorage } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["RSA_DIRECTOR", "AREA_MANAGER", "PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const scope = await resolveScope(context.assignment), { id } = await params;
  const attachment = await prisma.operationalAttachment.findFirst({ where: { id, organizationId: context.organization.id, ...(context.roleCode === "PROCUREMENT_MANAGER" || context.roleCode === "PROCUREMENT_ADMIN" ? {} : { facilityId: { in: scope.facilityIds } }) } });
  if (!attachment) return new NextResponse("Allegato non trovato.", { status: 404 });
  try {
    const provider = attachment.storageProvider as "local" | "supabase";
    const storage = getDocumentStorage(provider), locator = { provider, bucket: attachment.storageBucket, objectKey: attachment.storageObjectKey };
    const signedUrl = await storage.createSignedUrl(locator, 60);
    if (signedUrl) return NextResponse.redirect(signedUrl, { headers: { "Cache-Control": "private, no-store" } });
    const data = await storage.get(locator);
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": attachment.mimeType, "Content-Length": String(data.length), "Content-Disposition": `inline; filename="${attachment.originalFilename.replace(/["\r\n]/g, "-")}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("Il file non è disponibile nello storage configurato.", { status: 404 });
  }
}
