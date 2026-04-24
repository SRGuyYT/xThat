import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { verifyLocalCredentials } from "@/lib/auth/local-user";
import { enforceApiGuard } from "@/lib/security/guards";
import { assertCsrf } from "@/lib/security/csrf";
import { getClientAddress, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const guard = await enforceApiGuard(request, false);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  const limit = rateLimit(`login:${getClientAddress(request)}`, 10, 60_000);
  if (!limit.ok) {
    return jsonError("Too many login attempts.", 429);
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError("Invalid login payload.");
  }

  const user = await verifyLocalCredentials(parsed.data.username, parsed.data.password);
  if (!user) {
    return jsonError("Invalid username or password.", 401);
  }

  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: request.url.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
