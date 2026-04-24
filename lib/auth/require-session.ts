import { readSession } from "@/lib/auth/session";

export const requireSession = async () => {
  const session = await readSession();

  if (!session) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
};
