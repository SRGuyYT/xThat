import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth/require-session";
import { updateLocalCredentials } from "@/lib/auth/local-user";
import { getCloudflareEmail } from "@/lib/cloudflare";
import type { ModelCapability, ProviderId } from "@/lib/model-capabilities";
import { jsonError } from "@/lib/http";
import { assertCsrf } from "@/lib/security/csrf";
import { enforceApiGuard } from "@/lib/security/guards";
import {
  type AppSettings,
  deleteCustomModel,
  getProviderKeySource,
  getSettings,
  listModels,
  saveProviderApiKey,
  saveSettings,
  upsertCustomModel,
} from "@/lib/settings";
import { prisma } from "@/lib/prisma";

const capabilitySchema = z.object({
  text: z.boolean(),
  vision: z.boolean(),
  files: z.boolean(),
  pdf: z.boolean(),
  tools: z.boolean(),
  fast: z.boolean(),
  cheap: z.boolean(),
  bestForCoding: z.boolean(),
  maxFileSizeMB: z.number().int().positive(),
});

const schema = z.object({
  settings: z.object({
    appearance: z.object({
      theme: z.enum(["dark", "light", "system"]),
      compactMode: z.boolean(),
      glassIntensity: z.enum(["low", "medium", "high"]),
    }),
    providers: z.object({
      enabled: z.record(z.string(), z.boolean()),
      defaultProvider: z.string(),
      defaultModel: z.string(),
    }),
    safety: z.object({
      maxTokens: z.number().int().positive(),
      temperature: z.number().min(0).max(2),
      uploadSizeLimitMb: z.number().int().positive(),
      usageLimitPlaceholder: z.string(),
    }),
    security: z.object({
      sessionTimeoutMinutes: z.number().int().positive(),
    }),
  }),
  providerKeys: z.record(z.string(), z.string()),
  security: z
    .object({
      username: z.string().min(1),
      password: z.string().min(8),
    })
    .nullable(),
  customModels: z.array(
    z.object({
      id: z.string().optional(),
      provider: z.string(),
      modelId: z.string().min(1),
      label: z.string().optional(),
      capability: capabilitySchema,
      deleted: z.boolean().optional(),
    }),
  ),
});

export async function GET(request: Request) {
  try {
    const guard = await enforceApiGuard(request, true);
    if (guard.error) {
      return guard.error;
    }

    const settings = await getSettings();
    const models = await listModels();
    const providerSources = Object.fromEntries(
      await Promise.all(
        ([
          "openai",
          "anthropic",
          "gemini",
          "openrouter",
          "groq",
          "xai",
          "mistral",
          "custom-openai",
        ] as ProviderId[]).map(async (provider) => [
          provider,
          await getProviderKeySource(provider),
        ]),
      ),
    );

    return NextResponse.json({
      settings,
      models,
      providerSources,
      cloudflareEmail: getCloudflareEmail(request),
    });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  const guard = await enforceApiGuard(request, true);
  if (guard.error) {
    return guard.error;
  }

  if (!assertCsrf(request)) {
    return jsonError("CSRF validation failed.", 403);
  }

  try {
    const session = guard.session ?? (await requireSession());
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Invalid settings payload.");
    }

    await saveSettings({
      ...parsed.data.settings,
      providers: {
        ...parsed.data.settings.providers,
        defaultProvider: parsed.data.settings.providers.defaultProvider as ProviderId,
        enabled: parsed.data.settings.providers.enabled as AppSettings["providers"]["enabled"],
      },
    });

    for (const [provider, key] of Object.entries(parsed.data.providerKeys)) {
      await saveProviderApiKey(provider as ProviderId, key);
    }

    if (parsed.data.security) {
      await updateLocalCredentials(
        session.userId,
        parsed.data.security.username,
        parsed.data.security.password,
      );
    }

    const submittedIds = parsed.data.customModels
      .map((model) => model.id)
      .filter((value): value is string => Boolean(value));

    await prisma.customModel.deleteMany({
      where: {
        id: {
          notIn: submittedIds.length ? submittedIds : ["__none__"],
        },
      },
    });

    for (const model of parsed.data.customModels) {
      if (model.deleted && model.id) {
        await deleteCustomModel(model.id);
      } else if (!model.deleted) {
        await upsertCustomModel({
          id: model.id,
          provider: model.provider as ProviderId,
          modelId: model.modelId,
          label: model.label,
          capability: model.capability as ModelCapability,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      settings: await getSettings(),
      models: await listModels(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save settings.";
    return jsonError(message, 400);
  }
}
