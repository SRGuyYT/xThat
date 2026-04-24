import type { NextRequest } from "next/server";

import { env, isProduction } from "@/lib/env";
import { hasValidEncryptionKey, testEncryptionRoundTrip } from "@/lib/crypto";
import { testSessionCrypto } from "@/lib/auth/session";
import { getCloudflareEmail, isTrustedCloudflareRequest } from "@/lib/cloudflare";

export type EncryptionHealth = {
  ok: boolean;
  code: number;
  reason: string;
};

export const checkEncryptionHealth = async (
  request: Request | NextRequest,
): Promise<EncryptionHealth> => {
  if (!env.requireAppEncryption) {
    return { ok: true, code: 200, reason: "disabled" };
  }

  const isBlockedRoute = new URL(request.url).pathname.startsWith("/blocked/no-access");
  if (isBlockedRoute) {
    return { ok: true, code: 200, reason: "blocked_route" };
  }

  if (!env.encryptionKey) {
    return { ok: false, code: 401, reason: "missing_encryption_key" };
  }

  if (!hasValidEncryptionKey()) {
    return { ok: false, code: 401, reason: "invalid_encryption_key_length" };
  }

  const usesHttps = new URL(request.url).protocol === "https:";
  const hostname = new URL(request.url).hostname;
  const trustedCloudflare = isTrustedCloudflareRequest(request);
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);

  if (isProduction() && !isLocalHost && !usesHttps && !trustedCloudflare) {
    return { ok: false, code: 401, reason: "https_required" };
  }

  if (!(await testEncryptionRoundTrip())) {
    return { ok: false, code: 500, reason: "api_key_encryption_failed" };
  }

  if (!(await testSessionCrypto())) {
    return { ok: false, code: 500, reason: "session_encryption_failed" };
  }

  if (env.cloudflareAccessEnabled) {
    const email = getCloudflareEmail(request);
    const assertion = request.headers.get("cf-access-jwt-assertion");

    if (!email || !assertion) {
      return { ok: false, code: 401, reason: "cloudflare_access_missing" };
    }
  }

  return { ok: true, code: 200, reason: "ok" };
};
