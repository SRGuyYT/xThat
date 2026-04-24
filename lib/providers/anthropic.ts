import { attachmentContext, streamSseResponse } from "@/lib/providers/shared";
import type { ProviderAdapter } from "@/lib/providers/types";

export const anthropicProvider: ProviderAdapter = {
  id: "anthropic",
  label: "Anthropic Claude",
  async stream(request) {
    // Anthropic streams `content_block_delta` events from the Messages API.
    const messages = request.messages.map((message, index, array) => ({
      role: message.role,
      content:
        message.role === "user" && index === array.length - 1 && request.attachments.length
          ? `${message.content}\n\n${attachmentContext(request.attachments)}`
          : message.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": request.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: request.model,
        system: request.systemPrompt,
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: true,
      }),
    });

    return streamSseResponse(response, {
      parseDelta: (line) => {
        const json = JSON.parse(line);
        return json.type === "content_block_delta" ? json.delta?.text ?? null : null;
      },
    });
  },
};
