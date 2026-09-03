import "dotenv/config";
import { defineConfig } from "prisma/config";

// Client generation and type checking do not need a database connection.
// Keep clean/cloud builds independent from a local .env while migrations still
// use DIRECT_URL whenever it is configured by the deployment environment.
const directUrl = process.env.DIRECT_URL ?? "postgresql://prisma:prisma@localhost:5432/prisma";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: directUrl,
  },
});
