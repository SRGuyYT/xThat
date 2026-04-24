import { attachmentContext, streamSseResponse } from "@/lib/providers/shared";
import type { ProviderAdapter } from "@/lib/providers/types";

export const openAiProvider: ProviderAdapter = {
  id: "openai",
  label: "OpenAI",
  async stream(request) {
    // OpenAI uses the Responses API here instead of chat completions to match the requested integration.
    const input = request.messages.map((message, index, array) => ({
      role: message.role,
      content: [
        {
          type: "input_text",
          text:
            message.role === "user" && index === array.length - 1
              ? `${message.content}\n\n${attachmentContext(request.attachments)}`
              : message.content,
        },
      ],
    }));

    if (!request.attachments.length) {
      // Keep the last user turn clean when there are no files.
      input[input.length - 1].content[0].text = request.messages.at(-1)?.content ?? "";
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        input,
        temperature: request.temperature,
        max_output_tokens: request.maxTokens,
        stream: true,
      }),
    });

    return streamSseResponse(response, {
      parseDelta: (line) => {
        const json = JSON.parse(line);

        if (json.type === "response.output_text.delta") {
          return json.delta ?? null;
        }

        return null;
      },
    });
  },
};
