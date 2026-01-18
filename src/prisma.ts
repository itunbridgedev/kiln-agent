import { PrismaClient } from "@prisma/client";
import { createTenantMiddleware } from "./middleware/tenant";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Apply tenant middleware
prisma.$use(createTenantMiddleware());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
