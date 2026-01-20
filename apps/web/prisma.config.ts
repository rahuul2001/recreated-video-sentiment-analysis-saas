// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // ⚠️ CRITICAL: Use DIRECT_URL here so the CLI can run migrations
    url: process.env.DIRECT_URL, 
  },
});