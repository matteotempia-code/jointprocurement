"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_USER_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { homeByRole, type RoleCode } from "@/lib/roles";

export async function switchDemoUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { assignments: { where: { active: true }, include: { role: true } } } });
  if (!user?.assignments[0]) redirect("/");
  (await cookies()).set(DEMO_USER_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(homeByRole[user.assignments[0].role.code as RoleCode]);
}
