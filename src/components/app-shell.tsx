"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";

type NavItem = { label: string; href: string };
export function AppShell({ children, navigation, switcher, identity, demoMode }: { children: ReactNode; navigation: NavItem[]; switcher: ReactNode; identity: ReactNode; demoMode: boolean }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <header className="mobile-header"><Link href="/" className="brand-mark"><span>JP</span><b>Joint Procurement</b></Link><button className="icon-button" onClick={() => setOpen(!open)} aria-label={open ? "Chiudi navigazione" : "Apri navigazione"}>{open ? <CloseIcon /> : <MenuIcon />}</button></header>
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}><div><Link href="/" className="brand"><span>JP</span><div><b>Joint Procurement</b><small>Anteo × Coopselios</small></div></Link>{demoMode && <div className="demo-bar"><strong>Ambiente dimostrativo</strong><span>Dati fittizi</span>{switcher}</div>}</div><nav aria-label="Navigazione principale">{navigation.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>{item.label}</Link>; })}</nav>{identity}</aside>
    {open && <button className="scrim" aria-label="Chiudi navigazione" onClick={() => setOpen(false)} />}
    <div className="main-content"><div className="global-bar"><form action="/cerca"><label className="sr-only" htmlFor="global-q">Ricerca globale</label><input id="global-q" name="q" placeholder="Cerca prodotti, fornitori, richieste o ordini…"/><button>Cerca</button></form>{demoMode && <span>Ambiente dimostrativo · dati fittizi</span>}</div>{children}</div>
  </div>;
}
