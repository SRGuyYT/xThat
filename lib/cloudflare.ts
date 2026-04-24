import type { NextRequest } from "next/server";

import { env } from "@/lib/env";

export const getCloudflareEmail = (request: Request | NextRequest) =>
  request.headers.get("cf-access-authenticated-user-email");

export const isTrustedCloudflareRequest = (request: Request | NextRequest) => {
  if (!env.trustCloudflare) {
    return false;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const cfVisitor = request.headers.get("cf-visitor");

  return forwardedProto === "https" || (cfVisitor ? cfVisitor.includes('"scheme":"https"') : false);
};
