import { NextResponse, type NextRequest } from "next/server";
import { updateAuthSession } from "@/lib/supabase/proxy";

const publicPaths = ["/login", "/auth"];

export async function proxy(request: NextRequest) {
  if (process.env.DEMO_MODE === "true") return NextResponse.next();

  const loginPath = publicPaths.some((path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`));
  try {
    const { response, authenticated } = await updateAuthSession(request);
    if (!authenticated && !loginPath) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(login);
    }
    if (authenticated && request.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
    return response;
  } catch {
    if (loginPath) return NextResponse.next();
    return NextResponse.redirect(new URL("/login?error=auth-configuration", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|\\.well-known/workflow).*)"],
};
