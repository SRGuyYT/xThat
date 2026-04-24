import crypto from "node:crypto";

import { env } from "@/lib/env";

const getRawKey = () => Buffer.from(env.encryptionKey, "utf8");

export const hasValidEncryptionKey = () => getRawKey().byteLength === 32;

const getCipherKey = () => {
  const raw = getRawKey();

  if (raw.byteLength !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes long.");
  }

  return raw;
};

export const encryptSecret = (value: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
};

export const decryptSecret = (payload: {
  encrypted: string;
  iv: string;
  authTag: string;
}) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getCipherKey(),
    Buffer.from(payload.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
};

export const testEncryptionRoundTrip = () => {
  const sample = `xthat:${Date.now()}`;
  return decryptSecret(encryptSecret(sample)) === sample;
};
