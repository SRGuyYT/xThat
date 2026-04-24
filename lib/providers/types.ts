import type { ProviderId } from "@/lib/model-capabilities";

export type ChatAttachmentInput = {
  filename: string;
  mimeType: string;
  dataUrl?: string;
  extractedText?: string;
};

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderRequest = {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string;
  systemPrompt?: string;
  messages: ProviderMessage[];
  attachments: ChatAttachmentInput[];
  temperature: number;
  maxTokens: number;
};

export type ProviderStreamResult = {
  stream: ReadableStream<Uint8Array>;
  textPromise: Promise<string>;
};

export type ProviderAdapter = {
  id: ProviderId;
  label: string;
  stream: (request: ProviderRequest) => Promise<ProviderStreamResult>;
};
