"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { demoModeEnabled } from "@/lib/demo-session";

const credentialsSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8).max(256),
});

export async function login(formData: FormData) {
  if (demoModeEnabled()) redirect("/");
  const credentials = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!credentials.success) redirect("/login?error=credentials");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(credentials.data);
  if (error) redirect("/login?error=credentials");
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  if (!demoModeEnabled()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
