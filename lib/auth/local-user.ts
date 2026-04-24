import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const ensureLocalAdmin = async () => {
  const existing = await prisma.user.findFirst();

  if (existing) {
    return existing;
  }

  const passwordHash = await bcrypt.hash(env.authPassword, 12);

  return prisma.user.create({
    data: {
      username: env.authUsername,
      passwordHash,
    },
  });
};

export const verifyLocalCredentials = async (username: string, password: string) => {
  const user = await ensureLocalAdmin();

  if (user.username !== username) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
};

export const updateLocalCredentials = async (userId: string, username: string, password: string) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      username,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
