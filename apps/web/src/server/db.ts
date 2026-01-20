import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const createPrismaClient = () => {
  // 1. Create a standard PostgreSQL connection pool
  const connectionString = process.env.DATABASE_URL;
  
  const pool = new Pool({ 
    connectionString 
  });
  
  // 2. Wrap it in the Prisma Adapter
  const adapter = new PrismaPg(pool);

  // 3. Pass the adapter to the Prisma Client
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;