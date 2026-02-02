import { PrismaClient } from "@prisma/client";
import { getStudioContext } from "./middleware/tenant";

// Models that don't have studioId (non-tenant models)
const nonTenantModels = [
  "Studio",
  "Role",
  "CustomerRole",
  "StaffTeachingRole",
  "Account",
  "Session",
  "ClassSessionInstructor",
  "ClassSessionAssistant",
  "RegistrationSession",
];

// Create base Prisma client
const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

// Extend Prisma client with tenant filtering using Prisma Client Extensions
const extendedPrisma = basePrisma.$extends({
  name: "tenantExtension",
  query: {
    $allModels: {
      async create({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.data = args.data || {};
          if (!args.data.studioId) {
            args.data.studioId = tenantId;
          }
        }
        return query(args);
      },
      async createMany({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          if (args.data && Array.isArray(args.data)) {
            args.data = args.data.map((item: any) => ({
              ...item,
              studioId: item.studioId || tenantId,
            }));
          }
        }
        return query(args);
      },
      async findUnique({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async findFirst({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async findMany({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async update({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async updateMany({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async delete({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async deleteMany({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
      async count({ model, operation, args, query }: any) {
        const tenantId = getStudioContext();
        if (tenantId && !nonTenantModels.includes(model)) {
          args.where = args.where || {};
          if (!args.where.studioId) {
            args.where.studioId = tenantId;
          }
        }
        return query(args);
      },
    },
  },
});

const globalForPrisma = global as unknown as {
  prisma: typeof extendedPrisma;
};

export const prisma = globalForPrisma.prisma || extendedPrisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
