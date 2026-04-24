import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { readSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { checkEncryptionHealth } from "@/lib/security/encryption-health";

const buildRequest = async (pathname: string) => {
  const headerList = await headers();
  const host = headerList.get("host") ?? new URL(env.appUrl).host;
  const proto =
    headerList.get("x-forwarded-proto") ?? new URL(env.appUrl).protocol.replace(":", "");
  const url = `${proto}://${host}${pathname}`;

  return new Request(url, {
    headers: headerList,
  });
};

export const enforcePageGuard = async (pathname: string, requireAuth: boolean) => {
  const request = await buildRequest(pathname);
  const health = await checkEncryptionHealth(request);

  if (!health.ok) {
    const blockedUrl = new URL(env.blockedRedirectUrl);
    blockedUrl.searchParams.set("code", String(health.code || 401));
    blockedUrl.searchParams.set("reason", health.reason);
    redirect(blockedUrl.toString());
  }

  const session = await readSession();
  if (requireAuth && !session) {
    redirect("/blocked/no-access?code=401&reason=missing_access_identity");
  }

  if (!requireAuth && session) {
    redirect("/chat");
  }

  return session;
};

export const enforceApiGuard = async (request: Request, requireAuth = true) => {
  const health = await checkEncryptionHealth(request);

  if (!health.ok) {
    const blockedUrl = new URL(env.blockedRedirectUrl);
    blockedUrl.searchParams.set("code", String(health.code || 401));
    blockedUrl.searchParams.set("reason", health.reason);

    return {
      error: NextResponse.json(
        {
          error: "Encryption or access security check failed.",
          redirectTo: blockedUrl.toString(),
          code: health.code,
          reason: health.reason,
        },
        { status: health.code || 401 },
      ),
      session: null,
    };
  }

  if (!requireAuth) {
    return { error: null, session: null };
  }

  const session = await readSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", reason: "missing_access_identity" },
        { status: 401 },
      ),
      session: null,
    };
  }

  return { error: null, session };
};
