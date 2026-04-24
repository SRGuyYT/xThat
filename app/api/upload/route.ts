import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { getConversation } from "@/lib/chat";
import { jsonError } from "@/lib/http";
import { assertCsrf } from "@/lib/security/csrf";
import { enforceApiGuard } from "@/lib/security/guards";
import { storeUpload } from "@/lib/uploads";

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
    const formData = await request.formData();
    const conversationId = formData.get("conversationId");
    const file = formData.get("file");

    if (typeof conversationId !== "string") {
      return jsonError("Conversation is required.");
    }

    const conversation = await getConversation(session.userId, conversationId);
    if (!conversation) {
      return jsonError("Conversation not found.", 404);
    }

    if (!(file instanceof File)) {
      return jsonError("File upload missing.");
    }

    const attachment = await storeUpload(conversationId, file);
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return jsonError(message, 400);
  }
}
