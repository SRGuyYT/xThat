"use client";

import { LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import type { AppSettings } from "@/lib/settings";

type SettingsPayload = {
  settings: AppSettings;
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
  providerSources: Record<string, string>;
  cloudflareEmail?: string | null;
};

const providers = [
  "openai",
  "anthropic",
  "gemini",
  "openrouter",
  "groq",
  "xai",
  "mistral",
  "custom-openai",
] as const;

export function SettingsWorkspace() {
  const router = useRouter();
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const loadSettings = async () => {
    setLoading(true);
    const response = await fetch("/api/settings", { cache: "no-store" });
    if (response.status === 401) {
      router.push("/login");
      return;
    }

    const payload = (await response.json()) as SettingsPayload;
    setData(payload);
    setLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (response.status === 401) {
          router.push("/login");
          return;
        }

        const payload = (await response.json()) as SettingsPayload;
        setData(payload);
        setLoading(false);
      })();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (!data) {
      return;
    }

    document.documentElement.dataset.glassIntensity = data.settings.appearance.glassIntensity;
  }, [data]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-panel rounded-[2rem] px-6 py-4 text-slate-100">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Loading settings...
          </span>
        </div>
      </div>
    );
  }

  const saveAll = async () => {
    setSaving(true);

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settings: data.settings,
        providerKeys,
        security:
          credentials.username && credentials.password
            ? credentials
            : null,
        customModels: data.models.filter((model) => model.isCustom),
      }),
    });

    setSaving(false);

    if (!response.ok) {
      const payload = await response.json();
      window.alert(payload.error || "Unable to save settings.");
      return;
    }

    await loadSettings();
  };

  return (
    <div className="min-h-screen p-3 md:p-5">
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="glass-panel-strong rounded-[2rem] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-sky-400/20 text-lg font-bold text-sky-100">
                XT
              </div>
              <h1 className="mt-3 text-2xl font-semibold">xThat Settings</h1>
              <p className="mt-1 text-sm text-slate-300">Private multi-model AI workspace</p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/chat"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100"
              >
                Back to chat
              </Link>
              <button
                type="button"
                onClick={() => void saveAll()}
                className="inline-flex items-center gap-2 rounded-full bg-sky-400/20 px-4 py-2 text-sm font-medium text-sky-100"
              >
                {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="glass-panel rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold">Appearance</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                Theme
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.appearance.theme}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        appearance: {
                          ...data.settings.appearance,
                          theme: event.target.value as "dark" | "light" | "system",
                        },
                      },
                    })
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-sm">
                Compact mode
                <input
                  type="checkbox"
                  checked={data.settings.appearance.compactMode}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        appearance: {
                          ...data.settings.appearance,
                          compactMode: event.target.checked,
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Liquid glass intensity
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.appearance.glassIntensity}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        appearance: {
                          ...data.settings.appearance,
                          glassIntensity: event.target.value as "low" | "medium" | "high",
                        },
                      },
                    })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold">Providers</h2>
            <div className="mt-4 space-y-3">
              {providers.map((provider) => (
                <div key={provider} className="rounded-2xl border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{provider}</div>
                      <div className="text-xs text-slate-400">
                        Key source: {data.providerSources[provider] ?? "missing"}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={data.settings.providers.enabled[provider]}
                      onChange={(event) =>
                        setData({
                          ...data,
                          settings: {
                            ...data.settings,
                            providers: {
                              ...data.settings.providers,
                              enabled: {
                                ...data.settings.providers.enabled,
                                [provider]: event.target.checked,
                              },
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <input
                    type="password"
                    placeholder="Paste API key to store encrypted in SQLite"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    value={providerKeys[provider] ?? ""}
                    onChange={(event) =>
                      setProviderKeys((current) => ({
                        ...current,
                        [provider]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <label className="block text-sm">
                Default provider
                <select
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.providers.defaultProvider}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        providers: {
                          ...data.settings.providers,
                          defaultProvider: event.target.value as (typeof providers)[number],
                        },
                      },
                    })
                  }
                >
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Default model
                <input
                  value={data.settings.providers.defaultModel}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        providers: {
                          ...data.settings.providers,
                          defaultModel: event.target.value,
                        },
                      },
                    })
                  }
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                Custom OpenAI base URL
                <input
                  disabled
                  value="Set CUSTOM_OPENAI_BASE_URL in .env"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-slate-400"
                />
              </label>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5 md:col-span-2">
            <h2 className="text-lg font-semibold">Models</h2>
            <button
              type="button"
              className="mt-4 rounded-full border border-white/10 px-4 py-2 text-sm"
              onClick={() =>
                setData({
                  ...data,
                  models: [
                    ...data.models,
                    {
                      provider: data.settings.providers.defaultProvider,
                      modelId: "",
                      label: "",
                      capability: {
                        text: true,
                        vision: false,
                        files: false,
                        pdf: false,
                        tools: false,
                        fast: false,
                        cheap: false,
                        bestForCoding: false,
                        maxFileSizeMB: 25,
                      },
                      isCustom: true,
                    },
                  ],
                })
              }
            >
              Add custom model
            </button>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.models.map((model, index) => (
                <div key={`${model.provider}:${model.modelId}:${index}`} className="rounded-2xl border border-white/10 px-4 py-3">
                  {model.isCustom ? (
                    <div className="space-y-3">
                      <input
                        placeholder="Label"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        value={model.label}
                        onChange={(event) =>
                          setData({
                            ...data,
                            models: data.models.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: event.target.value } : item,
                            ),
                          })
                        }
                      />
                      <input
                        placeholder="Model ID"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        value={model.modelId}
                        onChange={(event) =>
                          setData({
                            ...data,
                            models: data.models.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, modelId: event.target.value } : item,
                            ),
                          })
                        }
                      />
                      <select
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                        value={model.provider}
                        onChange={(event) =>
                          setData({
                            ...data,
                            models: data.models.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, provider: event.target.value } : item,
                            ),
                          })
                        }
                      >
                        {providers.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            "vision",
                            "files",
                            "pdf",
                            "tools",
                            "fast",
                            "cheap",
                            "bestForCoding",
                          ] as const
                        ).map((flag) => (
                          <label
                            key={flag}
                            className="flex items-center justify-between rounded-2xl border border-white/10 px-3 py-2 text-sm"
                          >
                            {flag}
                            <input
                              type="checkbox"
                              checked={model.capability[flag]}
                              onChange={(event) =>
                                setData({
                                  ...data,
                                  models: data.models.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          capability: {
                                            ...item.capability,
                                            [flag]: event.target.checked,
                                          },
                                        }
                                      : item,
                                  ),
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-rose-300/20 px-4 py-2 text-sm text-rose-200"
                        onClick={() =>
                          setData({
                            ...data,
                            models: data.models.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                      >
                        Remove custom model
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{model.label}</div>
                      <div className="text-xs text-slate-400">
                        {model.provider} / {model.modelId}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(model.capability).map(([key, value]) =>
                          key !== "maxFileSizeMB" && value ? (
                            <span
                              key={key}
                              className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100"
                            >
                              {key}
                            </span>
                          ) : null,
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5">
            <h2 className="text-lg font-semibold">Safety & Costs</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                Max tokens
                <input
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.safety.maxTokens}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        safety: {
                          ...data.settings.safety,
                          maxTokens: Number(event.target.value),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Temperature
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.safety.temperature}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        safety: {
                          ...data.settings.safety,
                          temperature: Number(event.target.value),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Upload size limit (MB)
                <input
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.safety.uploadSizeLimitMb}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        safety: {
                          ...data.settings.safety,
                          uploadSizeLimitMb: Number(event.target.value),
                        },
                      },
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Usage limit placeholder
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.safety.usageLimitPlaceholder}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        safety: {
                          ...data.settings.safety,
                          usageLimitPlaceholder: event.target.value,
                        },
                      },
                    })
                  }
                />
              </label>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5" id="security">
            <h2 className="text-lg font-semibold">Security</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                Change local admin username
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={credentials.username}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Change local admin password
                <input
                  type="password"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                Session timeout (minutes)
                <input
                  type="number"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                  value={data.settings.security.sessionTimeoutMinutes}
                  onChange={(event) =>
                    setData({
                      ...data,
                      settings: {
                        ...data.settings,
                        security: {
                          ...data.settings.security,
                          sessionTimeoutMinutes: Number(event.target.value),
                        },
                      },
                    })
                  }
                />
              </label>
              <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
                Cloudflare Access protection status placeholder
              </div>
              <div className="rounded-2xl border border-white/10 px-4 py-3 text-sm">
                {data.cloudflareEmail
                  ? `Cloudflare authenticated email: ${data.cloudflareEmail}`
                  : "Cloudflare authenticated email will appear here when available."}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-5 md:col-span-2">
            <h2 className="text-lg font-semibold">About</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">App</div>
                <div className="mt-2 text-sm">xThat</div>
              </div>
              <div className="rounded-2xl border border-white/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Version</div>
                <div className="mt-2 text-sm">0.1.0</div>
              </div>
              <div className="rounded-2xl border border-white/10 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Local server URL</div>
                <div className="mt-2 text-sm">http://localhost:3000</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
