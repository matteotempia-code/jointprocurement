import { databaseHealth } from "@/lib/database-health";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return Response.json({ status: "error", code: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    return Response.json(await databaseHealth(prisma, connectionString), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { status: "error", code: "DATABASE_HEALTH_CHECK_FAILED" },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
