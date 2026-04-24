"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  File,
  ImageIcon,
  LoaderCircle,
  LogOut,
  PanelLeft,
  Pencil,
  Plus,
  SendHorizontal,
  Settings,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { MarkdownMessage } from "@/components/markdown-message";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AppSettings } from "@/lib/settings";
import { cn, formatBytes, titleFromMessage } from "@/lib/utils";

type BootstrapPayload = {
  session: { userId: string; username: string };
  settings: AppSettings;
  providers: Array<{ id: string; label: string }>;
  providerSources: Record<string, string>;
  models: Array<{
    id?: string;
    provider: string;
    modelId: string;
    label: string;
    capability: {
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
    isCustom: boolean;
  }>;
  conversations: Array<{
    id: string;
    title: string;
    provider: string;
    model: string;
    updatedAt: string;
  }>;
  selectedConversation: null | {
    id: string;
    title: string;
    provider: string;
    model: string;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      attachments: Array<{
        id: string;
        filename: string;
        mimeType: string;
        size: number;
      }>;
    }>;
  };
};

type UploadedAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

const capabilityBadges = [
  { key: "vision", label: "Vision" },
  { key: "files", label: "Files" },
  { key: "fast", label: "Fast" },
  { key: "cheap", label: "Cheap" },
  { key: "bestForCoding", label: "Best for Coding" },
] as const;

export function ChatWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversationId");
  const [payload, setPayload] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedConversation =
    payload?.selectedConversation ??
    (conversationParam === "new" || !payload?.conversations.length ? null : null);

  const providerModels = useMemo(() => {
    if (!payload) {
      return [];
    }

    const provider =
      selectedConversation?.provider ?? payload.settings.providers.defaultProvider;

    return payload.models.filter((model) => model.provider === provider);
  }, [payload, selectedConversation?.provider]);

  const selectedModel =
    payload?.models.find(
      (model) =>
        model.provider === (selectedConversation?.provider ?? payload.settings.providers.defaultProvider) &&
        model.modelId === (selectedConversation?.model ?? payload.settings.providers.defaultModel),
    ) ?? null;

  const loadData = async (conversationId?: string | null) => {
    setLoading(true);
    const query = conversationId ? `?conversationId=${conversationId}` : "";
    const response = await fetch(`/api/bootstrap${query}`, { cache: "no-store" });

    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const data = (await response.json()) as BootstrapPayload;
    setPayload(data);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const query = conversationParam ? `?conversationId=${conversationParam}` : "";
        const response = await fetch(`/api/bootstrap${query}`, { cache: "no-store" });

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        const data = (await response.json()) as BootstrapPayload;
        setPayload(data);
        setLoading(false);
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [conversationParam, router]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    document.documentElement.dataset.glassIntensity = payload.settings.appearance.glassIntensity;
    document.documentElement.dataset.compact = String(payload.settings.appearance.compactMode);
  }, [payload]);

  const ensureConversation = async () => {
    if (payload?.selectedConversation) {
      return payload.selectedConversation.id;
    }

    if (!payload) {
      throw new Error("Workspace is still loading.");
    }

    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "New conversation",
        provider: payload.settings.providers.defaultProvider,
        model: payload.settings.providers.defaultModel,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Unable to create conversation.");
    }

    router.push(`/chat?conversationId=${data.conversation.id}`);
    return data.conversation.id as string;
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }

    try {
      const conversationId = await ensureConversation();
      const nextAttachments: UploadedAttachment[] = [];

      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append("conversationId", conversationId);
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Upload failed.");
        }

        nextAttachments.push(data.attachment as UploadedAttachment);
      }

      setAttachments((current) => [...current, ...nextAttachments]);
      setWarning(null);
      await loadData(conversationId);
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || sending || !payload) {
      return;
    }

    setSending(true);
    setStreamingText("");

    try {
      const conversationId = await ensureConversation();
      const activeConversation =
        payload.selectedConversation ??
        payload.conversations.find((conversation) => conversation.id === conversationId);
      const provider = activeConversation?.provider ?? payload.settings.providers.defaultProvider;
      const model = activeConversation?.model ?? payload.settings.providers.defaultModel;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          provider,
          model,
          message,
          attachmentIds: attachments.map((attachment) => attachment.id),
        }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error || "Message failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let collected = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        collected += chunk;
        setStreamingText(collected);
      }

      setMessage("");
      setAttachments([]);
      setWarning(null);
      await loadData(conversationId);
    } catch (error) {
      setWarning(error instanceof Error ? error.message : "Message failed.");
    } finally {
      setSending(false);
      setStreamingText("");
    }
  };

  const renameConversation = async (conversationId: string, currentTitle: string) => {
    const nextTitle = window.prompt("Rename conversation", currentTitle)?.trim();
    if (!nextTitle) {
      return;
    }

    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: nextTitle }),
    });

    await loadData(conversationId);
  };

  const removeConversation = async (conversationId: string) => {
    if (!window.confirm("Delete this conversation?")) {
      return;
    }

    await fetch(`/api/conversations/${conversationId}`, {
      method: "DELETE",
    });

    router.push("/chat?conversationId=new");
    await loadData("new");
  };

  const handleModelChange = async (key: "provider" | "model", value: string) => {
    if (!payload?.selectedConversation) {
      return;
    }

    const patch: Record<string, string> = {
      title: payload.selectedConversation.title || titleFromMessage(message),
      provider: payload.selectedConversation.provider,
      model: payload.selectedConversation.model,
    };
    patch[key] = value;

    await fetch(`/api/conversations/${payload.selectedConversation.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

    await loadData(payload.selectedConversation.id);
  };

  if (loading || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-200">
        <div className="glass-panel rounded-[2rem] px-6 py-4">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Loading xThat...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1600px] gap-3">
        <aside
          className={cn(
            "glass-panel-strong fixed inset-y-3 left-3 z-40 w-[280px] rounded-[2rem] p-4 transition md:static md:block",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-[120%] md:translate-x-0",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-sky-400/20 text-lg font-bold text-sky-100">
                XT
              </div>
              <h1 className="mt-3 text-lg font-semibold">xThat</h1>
              <p className="text-sm text-slate-300">Private multi-model AI workspace</p>
            </div>
            <button
              type="button"
              className="rounded-full p-2 text-slate-300 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>

          <button
            type="button"
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-400/20 px-4 py-3 text-sm font-medium text-sky-100"
            onClick={() => router.push("/chat?conversationId=new")}
          >
            <Plus className="size-4" />
            New conversation
          </button>

          <div className="scrollbar-thin space-y-2 overflow-y-auto pb-4">
            {payload.conversations.map((conversation) => {
              const active = conversation.id === payload.selectedConversation?.id;

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "rounded-3xl border px-4 py-3",
                    active
                      ? "border-sky-300/30 bg-sky-300/10"
                      : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/8",
                  )}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      router.push(`/chat?conversationId=${conversation.id}`);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <div className="line-clamp-1 text-sm font-medium">{conversation.title}</div>
                    <div className="mt-1 text-xs text-slate-300">
                      {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                    </div>
                  </button>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/10 p-2 text-slate-200"
                      onClick={() => renameConversation(conversation.id, conversation.title)}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/10 p-2 text-rose-300"
                      onClick={() => removeConversation(conversation.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto space-y-2 pt-4">
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200"
            >
              <Settings className="size-4" />
              Settings
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/login");
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex flex-1 flex-col gap-3">
          <header className="glass-panel-strong flex flex-wrap items-center justify-between gap-3 rounded-[2rem] px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-full border border-white/10 p-2 md:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <PanelLeft className="size-4" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Provider</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <select
                    value={selectedConversation?.provider ?? payload.settings.providers.defaultProvider}
                    className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm"
                    onChange={(event) => void handleModelChange("provider", event.target.value)}
                  >
                    {payload.providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedConversation?.model ?? payload.settings.providers.defaultModel}
                    className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm"
                    onChange={(event) => void handleModelChange("model", event.target.value)}
                  >
                    {providerModels.map((model) => (
                      <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedModel && (
                <div className="hidden flex-wrap gap-2 md:flex">
                  {capabilityBadges.map((badge) =>
                    selectedModel.capability[badge.key] ? (
                      <span
                        key={badge.key}
                        className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100"
                      >
                        {badge.label}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
              <ThemeToggle />
            </div>
          </header>

          <main className="glass-panel-strong flex min-h-[calc(100vh-8rem)] flex-1 flex-col rounded-[2rem]">
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedConversation?.title ?? "Welcome to xThat. Choose a model and start building."}
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    {payload.providerSources[selectedConversation?.provider ?? payload.settings.providers.defaultProvider] ===
                    "missing"
                      ? "API key missing for the selected provider."
                      : `Signed in as ${payload.session.username}`}
                  </p>
                </div>
                <Link
                  href="/settings#security"
                  className="hidden items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200 md:flex"
                >
                  <Shield className="size-4" />
                  Security
                </Link>
              </div>

              {selectedModel ? (
                <div className="mt-3 flex flex-wrap gap-2 md:hidden">
                  {capabilityBadges.map((badge) =>
                    selectedModel.capability[badge.key] ? (
                      <span
                        key={badge.key}
                        className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100"
                      >
                        {badge.label}
                      </span>
                    ) : null,
                  )}
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                  <AlertTriangle className="size-3.5" />
                  Capabilities unknown for this model.
                </div>
              )}
            </div>

            <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6">
              {selectedConversation?.messages.length ? (
                selectedConversation.messages.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "rounded-[2rem] border px-4 py-4",
                      entry.role === "assistant"
                        ? "border-white/10 bg-white/5"
                        : "ml-auto max-w-3xl border-sky-300/20 bg-sky-400/10",
                    )}
                  >
                    <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                      {entry.role === "assistant" ? "Assistant" : "You"}
                    </div>
                    <MarkdownMessage content={entry.content} />
                    {entry.attachments.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.attachments.map((attachment) => (
                          <span
                            key={attachment.id}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                          >
                            {attachment.mimeType.startsWith("image/") ? (
                              <ImageIcon className="size-3.5" />
                            ) : (
                              <File className="size-3.5" />
                            )}
                            {attachment.filename}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-[320px] items-center justify-center">
                  <div className="max-w-lg text-center">
                    <div className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-[1.75rem] bg-sky-400/15 text-2xl font-bold text-sky-100">
                      XT
                    </div>
                    <h3 className="text-2xl font-semibold">
                      Welcome to xThat. Choose a model and start building.
                    </h3>
                    <p className="mt-3 text-sm text-slate-300">
                      Stream responses, switch providers, attach files, and keep your chat history local.
                    </p>
                  </div>
                </div>
              )}

              {sending && streamingText ? (
                <div className="rounded-[2rem] border border-white/10 bg-white/5 px-4 py-4">
                  <div className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                    <LoaderCircle className="size-3.5 animate-spin" />
                    Streaming
                  </div>
                  <MarkdownMessage content={streamingText} />
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/10 px-4 py-4 md:px-6">
              {warning ? (
                <div className="mb-3 rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {warning}
                </div>
              ) : null}

              {attachments.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <span
                      key={attachment.id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200"
                    >
                      {attachment.mimeType.startsWith("image/") ? (
                        <ImageIcon className="size-3.5" />
                      ) : (
                        <File className="size-3.5" />
                      )}
                      {attachment.filename}
                      <span className="text-slate-400">{formatBytes(attachment.size)}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="glass-panel rounded-[1.75rem] border border-white/10 p-3">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Message xThat..."
                  className="min-h-28 w-full resize-none bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.docx"
                      onChange={(event) => void uploadFiles(event.target.files)}
                    />
                    <button
                      type="button"
                      className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload files
                    </button>
                    <span className="text-xs text-slate-400">
                      Max {payload.settings.safety.uploadSizeLimitMb} MB
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !message.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-400/20 px-4 py-2 text-sm font-medium text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? <LoaderCircle className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
                    Send
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
