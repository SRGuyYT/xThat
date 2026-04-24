import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/require-session";
import { deleteConversation, getConversation, updateConversation } from "@/lib/chat";
import { jsonError } from "@/lib/http";
import type { ProviderId } from "@/lib/model-capabilities";
import { assertCsrf } from "@/lib/security/csrf";
import { enforceApiGuard } from "@/lib/security/guards";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const guard = await enforceApiGuard(_request, true);
    if (guard.error) {
      return guard.error;
    }

    const session = guard.session ?? (await requireSession());
    const { conversationId } = await params;
    const conversation = await getConversation(session.userId, conversationId);

    if (!conversation) {
      return jsonError("Conversation not found.", 404);
    }

    return NextResponse.json({ conversation });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const guard = await enforceApiGuard(request, true);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  try {
    const session = guard.session ?? (await requireSession());
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid conversation update.");
    }

    const { conversationId } = await params;
    const conversation = await updateConversation(session.userId, conversationId, {
      title: parsed.data.title,
      model: parsed.data.model,
      provider: parsed.data.provider as ProviderId | undefined,
    });
    return NextResponse.json({ conversation });
  } catch {
    return jsonError("Unable to rename conversation.", 400);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const guard = await enforceApiGuard(request, true);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  try {
    const session = guard.session ?? (await requireSession());
    const { conversationId } = await params;
    await deleteConversation(session.userId, conversationId);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Unable to delete conversation.", 400);
  }
}
