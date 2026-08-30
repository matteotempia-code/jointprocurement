import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const source = await prisma.sourceDocument.findFirst({ where: { id: (await params).id, organizationId: context.assignment.organizationId } });
  if (!source) return new NextResponse("Documento non trovato.", { status: 404 });
  const normalized = path.normalize(source.storagePath);
  const importPrefix = path.join("var", "imports") + path.sep;
  const demoPrefix = `demo-imports${path.sep}`;
  const importRelative = normalized.startsWith(importPrefix) ? normalized.slice(importPrefix.length) : null;
  const demoRelative = normalized.startsWith(demoPrefix) ? normalized.slice(demoPrefix.length) : null;
  const scoped = importRelative ?? demoRelative;
  if (!scoped || scoped.split(path.sep).some((segment) => !segment || segment === ".." || segment === ".")) return new NextResponse("Percorso documento non valido.", { status: 403 });
  const resolved = importRelative ? path.join(process.cwd(), "var", "imports", scoped) : path.join(process.cwd(), "demo-imports", scoped);
  try {
    const data = await readFile(resolved);
    const safeName = path.basename(source.originalFilename).replace(/["\r\n]/g, "-");
    return new NextResponse(data, { headers: { "Content-Type": source.mimeType || "application/octet-stream", "Content-Length": String(data.byteLength), "Content-Disposition": `inline; filename="${safeName}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse("Il file originale non è disponibile nello storage locale.", { status: 404 });
  }
}
