import path from "node:path";
import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentStorage, locatorFromSourceDocument } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const source = await prisma.sourceDocument.findFirst({ where: { id: (await params).id, organizationId: context.assignment.organizationId } });
  if (!source) return new NextResponse("Documento non trovato.", { status: 404 });
  try {
    const locator = locatorFromSourceDocument(source);
    const storage = getDocumentStorage(locator.provider);
    const signedUrl = await storage.createSignedUrl(locator, 60);
    if (signedUrl) return NextResponse.redirect(signedUrl, { headers: { "Cache-Control": "private, no-store" } });
    const data = await storage.get(locator);
    const safeName = path.basename(source.originalFilename).replace(/["\r\n]/g, "-");
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": source.mimeType || "application/octet-stream", "Content-Length": String(data.byteLength), "Content-Disposition": `inline; filename="${safeName}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("Il file originale non e disponibile nello storage configurato.", { status: 404 });
  }
}
