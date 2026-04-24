import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth/require-session";
import { getConversation, getConversationList } from "@/lib/chat";
import { getCloudflareEmail } from "@/lib/cloudflare";
import { listModels, getProviderKeySource, getSettings } from "@/lib/settings";
import { providerRegistry } from "@/lib/providers";
import type { ProviderId } from "@/lib/model-capabilities";
import { enforceApiGuard } from "@/lib/security/guards";

export async function GET(request: Request) {
  try {
    const guard = await enforceApiGuard(request, true);
    if (guard.error) {
      return guard.error;
    }

    const session = guard.session ?? (await requireSession());
    const settings = await getSettings();
    const conversations = await getConversationList(session.userId);
    const selectedConversationId = new URL(request.url).searchParams.get("conversationId");
    const selectedConversation =
      selectedConversationId && selectedConversationId !== "new"
        ? await getConversation(session.userId, selectedConversationId)
        : conversations[0]
          ? await getConversation(session.userId, conversations[0].id)
          : null;

    const providerSources = Object.fromEntries(
      await Promise.all(
        providerRegistry.map(async (provider) => [
          provider.id,
          await getProviderKeySource(provider.id as ProviderId),
        ]),
      ),
    );

    return NextResponse.json({
      session,
      settings,
      providers: providerRegistry.map((provider) => ({
        id: provider.id,
        label: provider.label,
      })),
      providerSources,
      models: await listModels(),
      conversations,
      selectedConversation,
      cloudflareEmail: getCloudflareEmail(request),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Failed to load workspace." }, { status: 500 });
  }
}
