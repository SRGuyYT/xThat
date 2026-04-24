import { PrismaClient } from "@prisma/client";

declare global {
  var __xthatPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__xthatPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__xthatPrisma = prisma;
}
