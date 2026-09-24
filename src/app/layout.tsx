import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Public_Sans } from "next/font/google";
import "./design-system.css";
import { AppShell } from "@/components/app-shell";
import { DemoRoleSwitcher } from "@/components/demo-role-switcher";
import { ScopeBadge } from "@/components/ui";
import { getCurrentUserOrNull, getDemoUsers } from "@/lib/auth";
import { demoModeEnabled } from "@/lib/demo-session";
import { navigationByRole } from "@/lib/roles";
import { roleNameLabel } from "@/lib/presentation/role";
import { resolveScope } from "@/lib/scope";
import { logout } from "@/app/login/actions";

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display-loaded",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  title: "Joint Procurement OS",
  description: "Spazio operativo condiviso per gli acquisti Anteo × Coopselios",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const context = await getCurrentUserOrNull();
  if (!context)
    return (
      <html lang="it" className={`${display.variable} ${body.variable}`}>
        <body>{children}</body>
      </html>
    );
  const scope = await resolveScope(context.assignment);
  const demoMode = demoModeEnabled();
  const users = demoMode ? await getDemoUsers() : [];
  return (
    <html
      lang="it"
      className={`${display.variable} ${body.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <AppShell
          navigation={navigationByRole[context.roleCode]}
          demoMode={demoMode}
          switcher={
            demoMode ? <DemoRoleSwitcher users={users} currentId={context.user.id} /> : null
          }
          identity={
            <div className="identity">
              <div className="avatar">
                {context.user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
              <div>
                <b>{context.user.name}</b>
                <span>{roleNameLabel(context.role.name)}</span>
                <ScopeBadge type={scope.type} label={scope.label} />
                {!demoMode && (
                  <form action={logout}>
                    <button type="submit">Esci</button>
                  </form>
                )}
              </div>
            </div>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
