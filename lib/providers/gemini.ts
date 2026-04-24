import { attachmentContext, streamSseResponse } from "@/lib/providers/shared";
import type { ProviderAdapter } from "@/lib/providers/types";

export const geminiProvider: ProviderAdapter = {
  id: "gemini",
  label: "Google Gemini",
  async stream(request) {
    // Gemini uses its own streamGenerateContent SSE endpoint rather than an OpenAI-compatible shape.
    const lastMessage = request.messages.at(-1);
    const prompt = `${request.messages
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n\n")}\n\n${attachmentContext(request.attachments)}`.trim();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:streamGenerateContent?alt=sse&key=${request.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt || lastMessage?.content || "",
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxTokens,
          },
        }),
      },
    );

    return streamSseResponse(response, {
      parseDelta: (line) => {
        const json = JSON.parse(line);
        return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      },
    });
  },
};
