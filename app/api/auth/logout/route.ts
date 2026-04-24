import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session";
import { enforceApiGuard } from "@/lib/security/guards";
import { assertCsrf } from "@/lib/security/csrf";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const guard = await enforceApiGuard(request, false);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });

  return response;
}
