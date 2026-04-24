import type { ProviderAdapter } from "@/lib/providers/types";
import { streamOpenAICompatible } from "@/lib/providers/openai-compatible";

export const openRouterProvider: ProviderAdapter = {
  id: "openrouter",
  label: "OpenRouter",
  async stream(request) {
    return streamOpenAICompatible(request, {
      baseUrl: "https://openrouter.ai/api/v1",
      extraHeaders: {
        "HTTP-Referer": "https://xthat.local",
        "X-Title": "xThat",
      },
    });
  },
};
