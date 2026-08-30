import Link from "next/link";
import { confidenceClass, confidenceLabel, importStatusLabel, sourceLocatorLabel } from "@/lib/imports/presentation";

const steps = ["Caricato", "Letto", "Interpretato", "Normalizzato", "Associato", "Da verificare", "Pronto", "Pubblicato"];

export function ImportProgress({ status }: { status: string }) {
  const completed = status === "PUBLISHED" ? 8 : status === "READY_TO_PUBLISH" ? 7 : status === "NEEDS_REVIEW" ? 5 : status === "FAILED" ? 1 : ["PARSING", "PARSED"].includes(status) ? 2 : ["INTERPRETING", "INTERPRETED"].includes(status) ? 3 : 1;
  return <ol className="import-progress" aria-label="Avanzamento importazione">{steps.map((step, index) => <li key={step} className={index < completed ? "done" : index === completed ? "current" : ""}><i aria-hidden="true" /><span>{step}</span></li>)}</ol>;
}

export function Confidence({ value, detail }: { value: number | null | undefined; detail?: string }) {
  return <span className={`confidence ${confidenceClass(value)}`} title={value == null ? undefined : `${Math.round(value * 100)}%`}><i />{detail ?? confidenceLabel(value)}</span>;
}

export function SourceReference({ locator }: { locator: unknown }) {
  return <span className="source-reference">Fonte: {sourceLocatorLabel(locator)}</span>;
}

export function ImportStatus({ status }: { status: string }) {
  return <span className={`import-status import-status-${status.toLocaleLowerCase("it-IT")}`}><i />{importStatusLabel(status)}</span>;
}

export function ImportTabs({ jobId, active = "preview" }: { jobId: string; active?: string }) {
  const tabs = [
    ["preview", "Anteprima", `/imports/${jobId}`],
    ["mapping", "Mapping colonne", `/imports/${jobId}/mapping`],
    ["review", "Da verificare", `/imports/${jobId}?filtro=attenzione`],
    ["summary", "Riepilogo", `/imports/${jobId}/summary`],
    ["changes", "Variazioni", `/imports/${jobId}/changes`],
  ];
  return <nav className="import-tabs" aria-label="Sezioni importazione">{tabs.map(([key, label, href]) => <Link key={key} className={active === key ? "active" : ""} href={href}>{label}</Link>)}</nav>;
}
