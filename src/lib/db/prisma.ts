import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env/server";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function prisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const env = serverEnv();
    const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
