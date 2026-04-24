import { attachmentContext, streamSseResponse } from "@/lib/providers/shared";
import type { ProviderRequest, ProviderStreamResult } from "@/lib/providers/types";

type OpenAICompatibleOptions = {
  baseUrl: string;
  extraHeaders?: Record<string, string>;
};

export const streamOpenAICompatible = async (
  request: ProviderRequest,
  options: OpenAICompatibleOptions,
): Promise<ProviderStreamResult> => {
  // Groq, xAI, Mistral, OpenRouter, and custom endpoints all expose OpenAI-style chat completions.
  const messageContent = attachmentContext(request.attachments);
  const messages = request.messages.map((message, index, array) => ({
    role: message.role,
    content:
      message.role === "user" && index === array.length - 1 && messageContent
        ? `${message.content}\n\n${messageContent}`
        : message.content,
  }));

  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
      ...options.extraHeaders,
    },
    body: JSON.stringify({
      model: request.model,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true,
      messages,
    }),
  });

  return streamSseResponse(response, {
    parseDelta: (line) => {
      const json = JSON.parse(line);
      return json.choices?.[0]?.delta?.content ?? null;
    },
  });
};
