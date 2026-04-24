import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import {
  getKnownModels,
  getModelCapability,
  type ModelCapability,
  type ProviderId,
} from "@/lib/model-capabilities";
import { safeJsonParse } from "@/lib/utils";

export type AppSettings = {
  appearance: {
    theme: "dark" | "light" | "system";
    compactMode: boolean;
    glassIntensity: "low" | "medium" | "high";
  };
  providers: {
    enabled: Record<ProviderId, boolean>;
    defaultProvider: ProviderId;
    defaultModel: string;
  };
  safety: {
    maxTokens: number;
    temperature: number;
    uploadSizeLimitMb: number;
    usageLimitPlaceholder: string;
  };
  security: {
    sessionTimeoutMinutes: number;
  };
};

export type ProviderKeyMap = Partial<Record<ProviderId, string>>;

const SETTINGS_KEY = "app-config";

export const defaultSettings: AppSettings = {
  appearance: {
    theme: "dark",
    compactMode: false,
    glassIntensity: "medium",
  },
  providers: {
    enabled: {
      openai: true,
      anthropic: true,
      gemini: true,
      openrouter: true,
      groq: true,
      xai: true,
      mistral: true,
      "custom-openai": true,
    },
    defaultProvider: "openai",
    defaultModel: "gpt-4o",
  },
  safety: {
    maxTokens: 2048,
    temperature: 0.7,
    uploadSizeLimitMb: env.maxUploadMb,
    usageLimitPlaceholder: "Usage budgeting placeholder for future release",
  },
  security: {
    sessionTimeoutMinutes: 10080,
  },
};

export const getSettings = async (): Promise<AppSettings> => {
  const stored = await prisma.setting.findUnique({
    where: { key: SETTINGS_KEY },
  });

  return {
    ...defaultSettings,
    ...safeJsonParse<AppSettings>(stored?.value, defaultSettings),
    appearance: {
      ...defaultSettings.appearance,
      ...safeJsonParse<AppSettings>(stored?.value, defaultSettings).appearance,
    },
    providers: {
      ...defaultSettings.providers,
      ...safeJsonParse<AppSettings>(stored?.value, defaultSettings).providers,
      enabled: {
        ...defaultSettings.providers.enabled,
        ...safeJsonParse<AppSettings>(stored?.value, defaultSettings).providers?.enabled,
      },
    },
    safety: {
      ...defaultSettings.safety,
      ...safeJsonParse<AppSettings>(stored?.value, defaultSettings).safety,
    },
    security: {
      ...defaultSettings.security,
      ...safeJsonParse<AppSettings>(stored?.value, defaultSettings).security,
    },
  };
};

export const saveSettings = async (settings: AppSettings) =>
  prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: JSON.stringify(settings) },
    create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
  });

const envProviderKeys: ProviderKeyMap = {
  openai: env.openaiApiKey,
  anthropic: env.anthropicApiKey,
  gemini: env.geminiApiKey,
  openrouter: env.openrouterApiKey,
  groq: env.groqApiKey,
  xai: env.xaiApiKey,
  mistral: env.mistralApiKey,
  "custom-openai": env.customOpenAiApiKey,
};

export const getProviderApiKey = async (provider: ProviderId) => {
  const stored = await prisma.apiKey.findUnique({
    where: { provider },
  });

  if (stored) {
    return decryptSecret(stored);
  }

  return envProviderKeys[provider] ?? "";
};

export const saveProviderApiKey = async (provider: ProviderId, apiKey: string) => {
  if (!apiKey) {
    await prisma.apiKey.deleteMany({ where: { provider } });
    return;
  }

  const encrypted = encryptSecret(apiKey);

  await prisma.apiKey.upsert({
    where: { provider },
    update: encrypted,
    create: {
      provider,
      ...encrypted,
    },
  });
};

export const getProviderKeySource = async (provider: ProviderId) => {
  const stored = await prisma.apiKey.findUnique({ where: { provider } });
  if (stored) {
    return "database";
  }

  return envProviderKeys[provider] ? "env" : "missing";
};

export const listModels = async () => {
  const customModels = await prisma.customModel.findMany({
    orderBy: [{ provider: "asc" }, { modelId: "asc" }],
  });

  const known = Object.entries({
    openai: getKnownModels("openai"),
    anthropic: getKnownModels("anthropic"),
    gemini: getKnownModels("gemini"),
    openrouter: getKnownModels("openrouter"),
    groq: getKnownModels("groq"),
    xai: getKnownModels("xai"),
    mistral: getKnownModels("mistral"),
    "custom-openai": getKnownModels("custom-openai"),
  }).flatMap(([provider, models]) =>
    models.map((model) => ({
      provider: provider as ProviderId,
      modelId: model.id,
      label: model.label,
      capability: model.capability,
      isCustom: false,
    })),
  );

  const custom = customModels.map((model) => ({
    provider: model.provider as ProviderId,
    modelId: model.modelId,
    label: model.label || model.modelId,
    capability: {
      text: model.text,
      vision: model.vision,
      files: model.files,
      pdf: model.pdf,
      tools: model.tools,
      fast: model.fast,
      cheap: model.cheap,
      bestForCoding: model.bestForCoding,
      maxFileSizeMB: model.maxFileSizeMB,
    } satisfies ModelCapability,
    isCustom: true,
    id: model.id,
  }));

  return [...known, ...custom];
};

export const upsertCustomModel = async (input: {
  id?: string;
  provider: ProviderId;
  modelId: string;
  label?: string;
  capability: ModelCapability;
}) => {
  if (input.id) {
    return prisma.customModel.update({
      where: { id: input.id },
      data: {
        provider: input.provider,
        modelId: input.modelId,
        label: input.label,
        ...input.capability,
      },
    });
  }

  return prisma.customModel.create({
    data: {
      provider: input.provider,
      modelId: input.modelId,
      label: input.label,
      ...input.capability,
    },
  });
};

export const deleteCustomModel = async (id: string) =>
  prisma.customModel.delete({
    where: { id },
  });

export const getCapabilityOrNull = (provider: ProviderId, modelId: string) =>
  getModelCapability(provider, modelId);
