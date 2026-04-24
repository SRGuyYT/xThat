import { EncryptJWT, jwtDecrypt } from "jose";
import { cookies, headers } from "next/headers";

import { ensureUserByUsername } from "@/lib/auth/local-user";
import { env } from "@/lib/env";
import { hasValidEncryptionKey } from "@/lib/crypto";

export const SESSION_COOKIE = "xthat_session";

const sessionSecret = () => {
  const bytes = Buffer.from(env.encryptionKey, "utf8");

  if (bytes.byteLength !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes for session cookies.");
  }

  return new Uint8Array(bytes);
};

export type SessionUser = {
  userId: string;
  username: string;
};

export const testSessionCrypto = async () => {
  if (!hasValidEncryptionKey()) {
    return false;
  }

  const token = await new EncryptJWT({ sub: "health-check", username: "health" })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .encrypt(sessionSecret());

  const result = await jwtDecrypt(token, sessionSecret());
  return result.payload.sub === "health-check";
};

export const createSessionToken = async (session: SessionUser) =>
  new EncryptJWT({ sub: session.userId, username: session.username })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(sessionSecret());

export const readSession = async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token && hasValidEncryptionKey()) {
    try {
      const result = await jwtDecrypt(token, sessionSecret());
      const userId = result.payload.sub;
      const username =
        typeof result.payload.username === "string" ? result.payload.username : "";

      if (userId && username) {
        return { userId, username };
      }
    } catch {
      // Fall through to automatic identity resolution.
    }
  }

  const headerList = await headers();
  const cloudflareEmail = headerList.get("cf-access-authenticated-user-email");

  if (env.cloudflareAccessEnabled) {
    if (!cloudflareEmail) {
      return null;
    }

    const user = await ensureUserByUsername(cloudflareEmail);
    return { userId: user.id, username: user.username };
  }

  const user = await ensureUserByUsername(env.authUsername || "local");
  return { userId: user.id, username: user.username };
};
