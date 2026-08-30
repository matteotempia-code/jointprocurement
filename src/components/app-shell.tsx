"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, MenuIcon } from "@/components/icons";
import type { ReactNode } from "react";

type NavItem = { label: string; href: string };

export function AppShell({ children, navigation, switcher, identity }: { children: ReactNode; navigation: NavItem[]; switcher: ReactNode; identity: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <header className="mobile-header"><Link href="/" className="brand-mark"><span>JP</span><b>Joint Procurement</b></Link><button className="icon-button" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"}>{open ? <CloseIcon /> : <MenuIcon />}</button></header>
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div><Link href="/" className="brand"><span>JP</span><div><b>Joint Procurement</b><small>Anteo × Coopselios</small></div></Link><div className="demo-label">Demo environment</div>{switcher}</div>
      <nav aria-label="Main navigation">{navigation.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>{item.label}</Link>; })}</nav>
      {identity}
    </aside>
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <main className="main-content">{children}</main>
  </div>;
}
