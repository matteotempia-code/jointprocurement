import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { DemoRoleSwitcher } from "@/components/demo-role-switcher";
import { ScopeBadge } from "@/components/ui";
import { getCurrentDemoUser, getDemoUsers } from "@/lib/auth";
import { navigationByRole } from "@/lib/roles";
import { resolveScope } from "@/lib/scope";

export const metadata: Metadata = {
  title: "Joint Procurement OS",
  description: "Anteo × Coopselios joint procurement workspace",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [context, users] = await Promise.all([getCurrentDemoUser(), getDemoUsers()]);
  const scope = await resolveScope(context.assignment);
  return (
    <html lang="en">
      <body><AppShell navigation={navigationByRole[context.roleCode]} switcher={<DemoRoleSwitcher users={users} currentId={context.user.id} />} identity={<div className="identity"><div className="avatar">{context.user.name.split(" ").map((part) => part[0]).join("")}</div><div><b>{context.user.name}</b><span>{context.role.name}</span><ScopeBadge type={scope.type} label={scope.label} /></div></div>}>{children}</AppShell></body>
    </html>
  );
}
