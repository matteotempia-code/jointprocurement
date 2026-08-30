import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { RoleCode } from "@/lib/roles";

export const DEMO_USER_COOKIE = "jpo-demo-user";

export async function getDemoUsers() {
  return prisma.user.findMany({
    where: { assignments: { some: { active: true } } },
    select: { id: true, name: true, assignments: { where: { active: true }, take: 1, select: { role: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });
}

export async function getCurrentDemoUser() {
  const selectedId = (await cookies()).get(DEMO_USER_COOKIE)?.value;
  const include = { assignments: { where: { active: true }, include: { role: true, organization: true } } } as const;
  const user = selectedId ? await prisma.user.findUnique({ where: { id: selectedId }, include }) : null;
  const resolved = user ?? await prisma.user.findFirst({ where: { email: "lucia.ferri@demo.local" }, include });
  if (!resolved?.assignments[0]) throw new Error("Demo users are missing. Run npm run db:seed.");
  const assignment = resolved.assignments[0];
  return { user: resolved, assignment, role: assignment.role, organization: assignment.organization, roleCode: assignment.role.code as RoleCode };
}

export async function requireRoles(allowed: RoleCode[]) {
  const context = await getCurrentDemoUser();
  if (!allowed.includes(context.roleCode)) notFound();
  return context;
}
