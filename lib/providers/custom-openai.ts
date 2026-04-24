import type { ProviderAdapter } from "@/lib/providers/types";
import { streamOpenAICompatible } from "@/lib/providers/openai-compatible";

export const customOpenAiProvider: ProviderAdapter = {
  id: "custom-openai",
  label: "Custom OpenAI-Compatible",
  async stream(request) {
    if (!request.baseUrl) {
      throw new Error("Custom OpenAI base URL is required.");
    }

    return streamOpenAICompatible(request, {
      baseUrl: request.baseUrl.replace(/\/$/, ""),
    });
  },
};
