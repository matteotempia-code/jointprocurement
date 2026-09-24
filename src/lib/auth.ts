import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { RoleCode } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_USER_COOKIE, demoModeEnabled, openDemoUserId } from "@/lib/demo-session";

const primaryAssignmentOrder = [{ createdAt: "asc" as const }, { id: "asc" as const }];
const userContextInclude = { assignments: { where: { active: true }, orderBy: primaryAssignmentOrder, include: { role: true, organization: true } } } as const;

export async function getDemoUsers() {
  if (!demoModeEnabled()) throw new Error("Demo identity is disabled.");
  return prisma.user.findMany({
    where: { assignments: { some: { active: true } } },
    select: { id: true, name: true, assignments: { where: { active: true }, orderBy: primaryAssignmentOrder, take: 1, select: { role: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getCurrentDemoUser() {
  if (!demoModeEnabled()) throw new Error("Demo identity is disabled.");
  const selectedId = openDemoUserId((await cookies()).get(DEMO_USER_COOKIE)?.value);
  const user = selectedId ? await prisma.user.findUnique({ where: { id: selectedId }, include: userContextInclude }) : null;
  const resolved = user ?? await prisma.user.findFirst({ where: { email: "lucia.ferri@demo.local" }, include: userContextInclude });
  if (!resolved?.assignments[0]) throw new Error("Demo users are missing. Run npm run db:seed.");
  const assignment = resolved.assignments[0];
  return { user: resolved, assignment, role: assignment.role, organization: assignment.organization, roleCode: assignment.role.code as RoleCode };
}

export async function getCurrentUserOrNull() {
  if (demoModeEnabled()) return getCurrentDemoUser();

  let email: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    email = !error && typeof data?.claims?.email === "string" ? data.claims.email : null;
  } catch {
    return null;
  }
  if (!email) return null;

  const user = await prisma.user.findUnique({ where: { email }, include: userContextInclude });
  if (!user?.assignments[0]) return null;
  const assignment = user.assignments[0];
  return { user, assignment, role: assignment.role, organization: assignment.organization, roleCode: assignment.role.code as RoleCode };
}

export async function getCurrentUser() {
  const context = await getCurrentUserOrNull();
  if (!context) throw new Error("Authentication required.");
  return context;
}

export async function requireRoles(allowed: RoleCode[]) {
  const context = await getCurrentUser();
  if (!allowed.includes(context.roleCode)) notFound();
  return context;
}
