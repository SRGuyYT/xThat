import { env } from "@/lib/env";

export const assertCsrf = (request: Request) => {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const expected = new URL(env.appUrl).origin;
  const requestUrl = new URL(request.url);

  return origin === expected || origin === requestUrl.origin;
};
