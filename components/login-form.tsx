"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="glass-panel-strong grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-white/10 p-8 lg:border-b-0 lg:border-r">
          <div className="inline-flex size-14 items-center justify-center rounded-[1.75rem] bg-sky-400/20 text-xl font-bold text-sky-100">
            XT
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">xThat</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            Private multi-model AI workspace. Run it locally on Windows 11, keep API keys
            server-side, and protect access with Cloudflare Tunnel and Cloudflare Access.
          </p>
        </div>

        <div className="p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
            <LockKeyhole className="size-4" />
            Local admin login
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              setError("");

              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
              });

              const data = await response.json();
              setLoading(false);

              if (!response.ok) {
                setError(data.error || "Sign in failed.");
                return;
              }

              router.push("/chat");
              router.refresh();
            }}
          >
            <label className="block text-sm">
              Username
              <input
                className="mt-2 w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 outline-none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Password
              <input
                type="password"
                className="mt-2 w-full rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 outline-none"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1.5rem] bg-sky-400/20 px-4 py-3 text-sm font-medium text-sky-100 disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Sign in to xThat
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
