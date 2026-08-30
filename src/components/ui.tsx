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
  return <span className={`status ${active ? "status-active" : "status-inactive"}`}><i />{label ?? (active ? "Active" : "Inactive")}</span>;
}

export function ScopeBadge({ type, label }: { type: string; label: string }) {
  return <span className="scope-badge"><small>{type}</small>{label}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><h2>{title}</h2><p>{description}</p></div>;
}

export function SearchField({ defaultValue, placeholder = "Search" }: { defaultValue?: string; placeholder?: string }) {
  return <label className="search-field"><SearchIcon /><span className="sr-only">Search</span><input name="q" defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

export function DataTable({ children, label }: { children: ReactNode; label: string }) {
  return <div className="table-wrap"><table><caption className="sr-only">{label}</caption>{children}</table></div>;
}

export function ProductLink({ id, name, detail }: { id: string; name: string; detail?: string }) {
  return <Link className="product-link" href={`/products/${id}`}><strong>{name}</strong>{detail && <span>{detail}</span>}</Link>;
}

export function FutureButton({ children }: { children: ReactNode }) {
  return <div className="future-action"><button disabled>{children}</button><span>Coming in next milestone</span></div>;
}
