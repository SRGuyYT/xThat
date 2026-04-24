import type { ProviderAdapter } from "@/lib/providers/types";
import { streamOpenAICompatible } from "@/lib/providers/openai-compatible";

export const xAiProvider: ProviderAdapter = {
  id: "xai",
  label: "xAI / Grok",
  async stream(request) {
    return streamOpenAICompatible(request, {
      baseUrl: "https://api.x.ai/v1",
    });
  },
};
