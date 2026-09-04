import { ImportUploadForm } from "@/components/import-upload-form";
import { PageHeader } from "@/components/ui";
import { requireRoles } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { procurementAIStatus } from "@/lib/procurement-ai";

export default async function NewImportPage() {
  await requireRoles(["PROCUREMENT_MANAGER", "PROCUREMENT_ADMIN"]);
  const suppliers = await prisma.supplier.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <main>
    <PageHeader eyebrow="Nuova importazione" title="Carica un documento" description="Il file originale viene conservato. La lettura non aggiorna il catalogo: prima vedrai mapping, anomalie e corrispondenze proposte." />
    <div className="import-new-layout">
      <ImportUploadForm suppliers={suppliers} />
      <aside className="import-guidance"><p className="eyebrow">Prima di iniziare</p><h2>Un percorso controllato</h2><ol><li><strong>Carica</strong><span>Conserviamo originale, checksum e versione.</span></li><li><strong>Verifica</strong><span>Le eccezioni vengono mostrate per prime.</span></li><li><strong>Conferma</strong><span>Matching e correzioni restano tracciati.</span></li><li><strong>Pubblica</strong><span>Solo dati approvati entrano nei listini.</span></li></ol><div className="provider-runtime-status" role="status"><strong>AI status: {procurementAIStatus.state}</strong><span>{procurementAIStatus.reason}</span></div><p className="muted">I file con macro non vengono eseguiti. Per PDF scannerizzati o immagini serve un provider OCR non configurato in questo ambiente.</p></aside>
    </div>
  </main>;
}
