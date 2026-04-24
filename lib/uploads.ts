import fs from "node:fs/promises";
import path from "node:path";

import mammoth from "mammoth";
import mime from "mime-types";
import pdfParse from "pdf-parse";
import { v4 as uuid } from "uuid";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const uploadDir = path.join(process.cwd(), "uploads");

const allowedTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const ensureUploadDir = async () => {
  await fs.mkdir(uploadDir, { recursive: true });
};

const extractText = async (buffer: Buffer, mimeType: string) => {
  if (mimeType.startsWith("text/")) {
    return buffer.toString("utf8");
  }

  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return "";
};

const chunkText = (text: string, chunkSize = 5000, maxChunks = 3) => {
  if (!text) {
    return "";
  }

  const chunks: string[] = [];

  for (let index = 0; index < text.length && chunks.length < maxChunks; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }

  const suffix = text.length > chunkSize * maxChunks ? "\n\n[Additional content omitted for brevity]" : "";
  return chunks.join("\n\n---\n\n") + suffix;
};

export const storeUpload = async (conversationId: string, file: File) => {
  const mimeType = file.type || mime.lookup(file.name) || "application/octet-stream";

  if (!allowedTypes.has(mimeType.toString())) {
    throw new Error("Unsupported file type.");
  }

  if (file.size > env.maxUploadMb * 1024 * 1024) {
    throw new Error(`File exceeds ${env.maxUploadMb} MB upload limit.`);
  }

  await ensureUploadDir();

  const ext = path.extname(file.name);
  const filename = `${uuid()}${ext}`;
  const targetPath = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(targetPath, buffer);

  const extractedText = chunkText(await extractText(buffer, mimeType.toString()));

  return prisma.attachment.create({
    data: {
      conversationId,
      filename: file.name,
      mimeType: mimeType.toString(),
      path: targetPath,
      size: file.size,
      extractedText,
    },
  });
};

export const buildAttachmentPayload = async (attachmentIds: string[]) => {
  if (!attachmentIds.length) {
    return [];
  }

  const attachments = await prisma.attachment.findMany({
    where: {
      id: { in: attachmentIds },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return Promise.all(
    attachments.map(async (attachment) => {
      const buffer = await fs.readFile(attachment.path);
      const dataUrl = attachment.mimeType.startsWith("image/")
        ? `data:${attachment.mimeType};base64,${buffer.toString("base64")}`
        : undefined;

      return {
        id: attachment.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        dataUrl,
        extractedText: attachment.extractedText,
        size: attachment.size,
      };
    }),
  );
};
