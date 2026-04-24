import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/require-session";
import { createConversation, getConversationList } from "@/lib/chat";
import { jsonError } from "@/lib/http";
import { assertCsrf } from "@/lib/security/csrf";
import { enforceApiGuard } from "@/lib/security/guards";
import type { ProviderId } from "@/lib/model-capabilities";

const schema = z.object({
  title: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const guard = await enforceApiGuard(request, true);
    if (guard.error) {
      return guard.error;
    }

    const session = guard.session ?? (await requireSession());
    const items = await getConversationList(session.userId);
    return NextResponse.json({ items });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  const guard = await enforceApiGuard(request, true);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  try {
    const session = guard.session ?? (await requireSession());
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid conversation payload.");
    }

    const conversation = await createConversation(session.userId, {
      title: parsed.data.title,
      provider: parsed.data.provider as ProviderId,
      model: parsed.data.model,
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
