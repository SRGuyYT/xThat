"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ content }: { content: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="markdown-body prose prose-invert max-w-none text-sm leading-7 prose-code:text-sky-200 prose-pre:bg-slate-950/75">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code(props) {
            const { inline, className, children, ...rest } = props as {
              inline?: boolean;
              className?: string;
              children?: React.ReactNode;
            };

            if (inline) {
              return (
                <code
                  className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-sky-100"
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            const text = String(children ?? "");
            const key = `${className}:${text.slice(0, 20)}`;

            return (
              <div className="relative my-4">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(text);
                    setCopied(key);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="absolute right-3 top-3 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1 text-xs text-slate-200"
                >
                  <span className="flex items-center gap-1.5">
                    {copied === key ? <Check className="size-3" /> : <Copy className="size-3" />}
                    {copied === key ? "Copied" : "Copy"}
                  </span>
                </button>
                <pre className="overflow-x-auto rounded-3xl bg-slate-950/75 p-4">
                  <code className={className} {...rest}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
