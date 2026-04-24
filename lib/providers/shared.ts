import { TextDecoder, TextEncoder } from "node:util";

import type { ChatAttachmentInput, ProviderMessage, ProviderStreamResult } from "@/lib/providers/types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const attachmentContext = (attachments: ChatAttachmentInput[]) => {
  if (!attachments.length) {
    return "";
  }

  return attachments
    .map((file) => {
      const body = file.extractedText ? file.extractedText.trim() : "Binary attachment uploaded.";
      return `\n[File: ${file.filename} | ${file.mimeType}]\n${body}\n[/File]`;
    })
    .join("\n");
};

export const withAttachmentContext = (
  messages: ProviderMessage[],
  attachments: ChatAttachmentInput[],
) => {
  if (!attachments.length) {
    return messages;
  }

  const clone = [...messages];
  const lastUserIndex = clone.findLastIndex((item) => item.role === "user");

  if (lastUserIndex === -1) {
    clone.push({
      role: "user",
      content: attachmentContext(attachments),
    });
    return clone;
  }

  clone[lastUserIndex] = {
    ...clone[lastUserIndex],
    content: `${clone[lastUserIndex].content}\n\n${attachmentContext(attachments)}`,
  };

  return clone;
};

export const streamSseResponse = async (
  response: Response,
  handlers: {
    parseDelta: (line: string) => string | null;
    endToken?: string;
  },
): Promise<ProviderStreamResult> => {
  if (!response.ok || !response.body) {
    const message = await response.text();
    throw new Error(message || `Provider request failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  let fullText = "";
  let resolveText: (value: string) => void = () => {};
  let rejectText: (error: unknown) => void = () => {};
  const textPromise = new Promise<string>((resolve, reject) => {
    resolveText = resolve;
    rejectText = reject;
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";

          for (const rawLine of parts) {
            const line = rawLine.trim();
            if (!line.startsWith("data:")) {
              continue;
            }

            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]" || payload === handlers.endToken) {
              continue;
            }

            const delta = handlers.parseDelta(payload);
            if (!delta) {
              continue;
            }

            fullText += delta;
            controller.enqueue(encoder.encode(delta));
          }
        }

        resolveText(fullText);
        controller.close();
      } catch (error) {
        rejectText(error);
        controller.error(error);
      }
    },
  });

  return {
    stream,
    textPromise,
  };
};
