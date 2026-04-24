import type { ProviderAdapter } from "@/lib/providers/types";
import { streamOpenAICompatible } from "@/lib/providers/openai-compatible";

export const mistralProvider: ProviderAdapter = {
  id: "mistral",
  label: "Mistral",
  async stream(request) {
    return streamOpenAICompatible(request, {
      baseUrl: "https://api.mistral.ai/v1",
    });
  },
};
