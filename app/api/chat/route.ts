import { TextEncoder } from "node:util";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/require-session";
import { appendAssistantMessage, appendUserMessage, getConversation, streamConversationReply } from "@/lib/chat";
import { getCapabilityOrNull, getSettings } from "@/lib/settings";
import { getClientAddress, jsonError } from "@/lib/http";
import { assertCsrf } from "@/lib/security/csrf";
import { enforceApiGuard } from "@/lib/security/guards";
import { rateLimit } from "@/lib/security/rate-limit";
import { buildAttachmentPayload } from "@/lib/uploads";
import { titleFromMessage } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import type { ProviderId } from "@/lib/model-capabilities";

const schema = z.object({
  conversationId: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  message: z.string().min(1),
  attachmentIds: z.array(z.string()).default([]),
});

const encoder = new TextEncoder();

export async function POST(request: Request) {
  const guard = await enforceApiGuard(request, true);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  const limit = rateLimit(`chat:${getClientAddress(request)}`, 60, 60_000);
  if (!limit.ok) {
    return jsonError("Rate limit exceeded.", 429);
  }

  try {
    const session = guard.session ?? (await requireSession());
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid chat payload.");
    }

    const conversation = await getConversation(session.userId, parsed.data.conversationId);
    if (!conversation) {
      return jsonError("Conversation not found.", 404);
    }

    const settings = await getSettings();
    const capability = getCapabilityOrNull(parsed.data.provider as ProviderId, parsed.data.model);
    const attachments = await buildAttachmentPayload(parsed.data.attachmentIds);

    if (attachments.some((file) => file.mimeType.startsWith("image/")) && capability && !capability.vision) {
      return jsonError("Selected model does not support vision uploads.", 400);
    }

    if (
      attachments.some((file) => !file.mimeType.startsWith("image/")) &&
      capability &&
      !capability.files
    ) {
      return jsonError("Selected model does not support file uploads.", 400);
    }

    const userMessage = await appendUserMessage(
      conversation.id,
      parsed.data.message,
      parsed.data.attachmentIds,
    );

    if (conversation.messages.length === 0 && conversation.title === "New conversation") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: titleFromMessage(parsed.data.message) },
      });
    }

    const providerMessages = [
      ...conversation.messages.map((message) => ({
        role: message.role as "system" | "user" | "assistant",
        content: message.content,
      })),
      {
        role: "user" as const,
        content: userMessage.content,
      },
    ];

    const providerResult = await streamConversationReply({
      provider: parsed.data.provider as ProviderId,
      model: parsed.data.model,
      messages: providerMessages,
      attachments,
      temperature: settings.safety.temperature,
      maxTokens: settings.safety.maxTokens,
      systemPrompt:
        "You are xThat, a private multi-model AI assistant. Be accurate, concise, and helpful.",
    });

    const assistantTextPromise = (async () => {
      const text = await providerResult.textPromise;
      await appendAssistantMessage(
        conversation.id,
        text,
        parsed.data.provider as ProviderId,
        parsed.data.model,
      );
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          provider: parsed.data.provider,
          model: parsed.data.model,
          updatedAt: new Date(),
        },
      });
      return text;
    })();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = providerResult.stream.getReader();

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }

            controller.enqueue(value);
          }

          await assistantTextPromise;
          controller.enqueue(encoder.encode("\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return jsonError(message === "UNAUTHORIZED" ? "Unauthorized" : message, message === "UNAUTHORIZED" ? 401 : 400);
  }
}
