export type ProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "groq"
  | "xai"
  | "mistral"
  | "custom-openai";

export type ModelCapability = {
  text: boolean;
  vision: boolean;
  files: boolean;
  pdf: boolean;
  tools: boolean;
  fast: boolean;
  cheap: boolean;
  bestForCoding: boolean;
  maxFileSizeMB: number;
};

export type KnownModel = {
  id: string;
  label: string;
  capability: ModelCapability;
};

const base = (overrides: Partial<ModelCapability> = {}): ModelCapability => ({
  text: true,
  vision: false,
  files: false,
  pdf: false,
  tools: false,
  fast: false,
  cheap: false,
  bestForCoding: false,
  maxFileSizeMB: 25,
  ...overrides,
});

export const PROVIDER_MODELS: Record<ProviderId, KnownModel[]> = {
  openai: [
    { id: "gpt-4o", label: "GPT-4o", capability: base({ vision: true, files: true, pdf: true, tools: true }) },
    { id: "gpt-4o-mini", label: "GPT-4o mini", capability: base({ vision: true, files: true, pdf: true, tools: true, fast: true, cheap: true }) },
    { id: "gpt-4.1", label: "GPT-4.1", capability: base({ vision: true, files: true, pdf: true, tools: true, bestForCoding: true }) },
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini", capability: base({ vision: true, files: true, pdf: true, tools: true, fast: true, cheap: true, bestForCoding: true }) },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", capability: base({ vision: true, files: true, pdf: true, tools: true, bestForCoding: true }) },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", capability: base({ vision: true, files: true, pdf: true, fast: true, cheap: true }) },
  ],
  gemini: [
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", capability: base({ vision: true, files: true, pdf: true, tools: true, bestForCoding: true }) },
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", capability: base({ vision: true, files: true, pdf: true, tools: true, fast: true, cheap: true }) },
  ],
  openrouter: [
    { id: "openai/gpt-4o", label: "OpenAI GPT-4o", capability: base({ vision: true, files: true, pdf: true, tools: true }) },
    { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", capability: base({ vision: true, files: true, pdf: true, tools: true, bestForCoding: true }) },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", capability: base({ vision: true, files: true, pdf: true, tools: true }) },
    { id: "deepseek/deepseek-chat", label: "DeepSeek Chat", capability: base({ cheap: true, bestForCoding: true }) },
    { id: "qwen/qwen3-coder", label: "Qwen3 Coder", capability: base({ fast: true, cheap: true, bestForCoding: true }) },
    { id: "meta-llama/llama-3.1-70b-instruct", label: "Llama 3.1 70B Instruct", capability: base({ fast: true }) },
  ],
  groq: [
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", capability: base({ fast: true, cheap: true }) },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", capability: base({ fast: true, bestForCoding: true }) },
  ],
  xai: [
    { id: "grok-4", label: "Grok 4", capability: base({ vision: true, tools: true, bestForCoding: true }) },
    { id: "grok-4-fast", label: "Grok 4 Fast", capability: base({ vision: true, tools: true, fast: true }) },
  ],
  mistral: [
    { id: "mistral-large-latest", label: "Mistral Large Latest", capability: base({ tools: true }) },
    { id: "codestral-latest", label: "Codestral Latest", capability: base({ fast: true, bestForCoding: true }) },
  ],
  "custom-openai": [],
};

export const getKnownModels = (provider: ProviderId) => PROVIDER_MODELS[provider];

export const getModelCapability = (provider: ProviderId, modelId: string) =>
  PROVIDER_MODELS[provider].find((item) => item.id === modelId)?.capability ?? null;
