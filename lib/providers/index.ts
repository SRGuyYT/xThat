import type { ProviderAdapter } from "@/lib/providers/types";
import { anthropicProvider } from "@/lib/providers/anthropic";
import { customOpenAiProvider } from "@/lib/providers/custom-openai";
import { geminiProvider } from "@/lib/providers/gemini";
import { groqProvider } from "@/lib/providers/groq";
import { mistralProvider } from "@/lib/providers/mistral";
import { openAiProvider } from "@/lib/providers/openai";
import { openRouterProvider } from "@/lib/providers/openrouter";
import { xAiProvider } from "@/lib/providers/xai";

export const providerRegistry: ProviderAdapter[] = [
  openAiProvider,
  anthropicProvider,
  geminiProvider,
  openRouterProvider,
  groqProvider,
  xAiProvider,
  mistralProvider,
  customOpenAiProvider,
];

export const getProviderAdapter = (providerId: string) => {
  const adapter = providerRegistry.find((provider) => provider.id === providerId);

  if (!adapter) {
    throw new Error(`Unsupported provider: ${providerId}`);
  }

  return adapter;
};
