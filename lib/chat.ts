import type { ProviderId } from "@/lib/model-capabilities";
import { prisma } from "@/lib/prisma";
import { getProviderAdapter } from "@/lib/providers";
import { getProviderApiKey } from "@/lib/settings";
import { env } from "@/lib/env";

export const getConversationList = async (userId: string) =>
  prisma.conversation.findMany({
    where: { userId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

export const getConversation = async (userId: string, conversationId: string) =>
  prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: {
      messages: {
        include: {
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

export const createConversation = async (
  userId: string,
  input: { title: string; provider: ProviderId; model: string },
) =>
  prisma.conversation.create({
    data: {
      userId,
      title: input.title,
      provider: input.provider,
      model: input.model,
    },
  });

export const updateConversation = async (
  userId: string,
  conversationId: string,
  data: Partial<{ title: string; provider: ProviderId; model: string }>,
) => {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error("Conversation not found.");
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data,
  });
};

export const deleteConversation = async (userId: string, conversationId: string) =>
  prisma.conversation.deleteMany({
    where: { id: conversationId, userId },
  });

export const appendUserMessage = async (conversationId: string, content: string, attachmentIds: string[]) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content,
      attachments: attachmentIds.length
        ? {
            connect: attachmentIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      attachments: true,
    },
  });

  return message;
};

export const appendAssistantMessage = async (
  conversationId: string,
  content: string,
  provider: ProviderId,
  model: string,
) =>
  prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content,
      provider,
      model,
    },
  });

export const streamConversationReply = async (input: {
  provider: ProviderId;
  model: string;
  systemPrompt?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  attachments: Array<{
    filename: string;
    mimeType: string;
    dataUrl?: string;
    extractedText?: string;
  }>;
  temperature: number;
  maxTokens: number;
}) => {
  const adapter = getProviderAdapter(input.provider);
  const apiKey = await getProviderApiKey(input.provider);

  if (!apiKey) {
    throw new Error(`No API key configured for ${input.provider}.`);
  }

  return adapter.stream({
    ...input,
    apiKey,
    baseUrl: env.customOpenAiBaseUrl,
  });
};
