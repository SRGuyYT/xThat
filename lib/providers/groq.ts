import type { ProviderAdapter } from "@/lib/providers/types";
import { streamOpenAICompatible } from "@/lib/providers/openai-compatible";

export const groqProvider: ProviderAdapter = {
  id: "groq",
  label: "Groq",
  async stream(request) {
    return streamOpenAICompatible(request, {
      baseUrl: "https://api.groq.com/openai/v1",
    });
  },
};
