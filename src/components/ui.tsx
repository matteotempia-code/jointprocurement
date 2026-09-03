import Link from "next/link";
import type { ReactNode } from "react";
import { SearchIcon } from "@/components/icons";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{action && <div className="page-action">{action}</div>}</header>;
}

export function Metric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <div className="metric"><p>{label}</p><strong>{value}</strong>{detail && <span>{detail}</span>}</div>;
}

export function StatusIndicator({ active, label }: { active: boolean; label?: string }) {
  return <StatusChip variant={active ? "ok" : "neutral"}>{label ?? (active ? "Attivo" : "Non attivo")}</StatusChip>;
}

export function StatusChip({ variant = "neutral", children }: { variant?: "neutral" | "ok" | "warn" | "danger"; children: ReactNode }) {
  return <span className={`status-chip status-chip-${variant}`}>{children}</span>;
}

export function InlineMeta({ items, separator = "·", className = "" }: { items: ReactNode[]; separator?: ReactNode; className?: string }) {
  const visible = items.filter((item) => item !== null && item !== undefined && item !== "");
  return <span className={`inline-meta ${className}`.trim()}>{visible.map((item, index) => <span key={index}>{index > 0 && <i aria-hidden>{separator}</i>}<span>{item}</span></span>)}</span>;
}

export function Num({ value, kind = "number", digits, className = "" }: { value: number; kind?: "number" | "currency" | "percent"; digits?: number; className?: string }) {
  const options: Intl.NumberFormatOptions = kind === "currency" ? { style: "currency", currency: "EUR", minimumFractionDigits: digits ?? 2, maximumFractionDigits: digits ?? 2 } : kind === "percent" ? { style: "percent", minimumFractionDigits: digits ?? 0, maximumFractionDigits: digits ?? 1 } : { minimumFractionDigits: digits ?? 0, maximumFractionDigits: digits ?? 2 };
  return <span className={`num ${className}`.trim()}>{new Intl.NumberFormat("it-IT", options).format(kind === "percent" ? value / 100 : value)}</span>;
}

export function PriceBlock({ normalizedPrice, normalizedUom, packPrice, packSize, variant = "default" }: { normalizedPrice: number | null; normalizedUom?: string | null; packPrice: number; packSize?: string | null; variant?: "default" | "compact" | "table" | "mobile" }) {
  return <span className={`price-block price-block-${variant}`}><strong>{normalizedPrice == null ? "Non confrontabile" : <><Num value={normalizedPrice} kind="currency" digits={4} />{normalizedUom && ` / ${normalizedUom}`}</>}</strong><small><Num value={packPrice} kind="currency" />{packSize ? ` · ${packSize}` : " · confezione"}</small></span>;
}

export function StickyActionBar({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return <div className="sticky-action-bar"><div>{summary}</div><div className="sticky-action-buttons">{children}</div></div>;
}

export function ScopeBadge({ type, label }: { type: string; label: string }) {
  const typeLabel = ({ ORGANIZATION: "Organizzazione", AREA: "Area", FACILITY: "Struttura" } as Record<string, string>)[type] ?? type;
  return <span className="scope-badge"><small>{typeLabel}</small>{label}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><h2>{title}</h2><p>{description}</p>{action && <div className="empty-state-action">{action}</div>}</div>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return <tr><td className="empty-row" colSpan={colSpan}>{children}</td></tr>;
}

export function SearchField({ defaultValue, placeholder = "Cerca" }: { defaultValue?: string; placeholder?: string }) {
  return <label className="search-field"><SearchIcon /><span className="sr-only">Cerca</span><input name="q" defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return <div className="table-wrap"><table><caption className="sr-only">{label}</caption>{children}</table></div>;
}

export function Pagination({ page, pages, pathname, params = {} }: { page: number; pages: number; pathname: string; params?: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (next: number) => { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); query.set("pagina", String(next)); return `${pathname}?${query}`; };
  return <nav className="phase1-pagination" aria-label="Paginazione"><Link className={page <= 1 ? "is-disabled" : ""} aria-disabled={page <= 1} href={href(Math.max(1, page - 1))}>Precedente</Link><span>Pagina {page} di {pages}</span><Link className={page >= pages ? "is-disabled" : ""} aria-disabled={page >= pages} href={href(Math.min(pages, page + 1))}>Successiva</Link></nav>;
}

export function ProductLink({ id, name, detail }: { id: string; name: string; detail?: string }) {
  return <Link className="product-link" href={`/products/${id}`}><strong>{name}</strong>{detail && <span>{detail}</span>}</Link>;
}

export function FutureButton({ children }: { children: ReactNode }) {
  return <div className="future-action"><button disabled>{children}</button><span>Disponibile nella prossima fase</span></div>;
}
