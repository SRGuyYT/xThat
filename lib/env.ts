import fs from "node:fs";
import path from "node:path";

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readDotEnv = () => {
  try {
    const file = fs.readFileSync(path.join(process.cwd(), ".env"), "utf8");
    return Object.fromEntries(
      file
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } catch {
    return {};
  }
};

const runtimeValue = (key: string, fallback = "") => {
  const processValue = process.env[key];
  if (processValue !== undefined) {
    return processValue;
  }

  const fileValue = readDotEnv()[key];
  return fileValue ?? fallback;
};

export const env = {
  get appUrl() {
    return runtimeValue("APP_URL", "http://localhost:3000");
  },
  get authUsername() {
    return runtimeValue("AUTH_USERNAME", "admin");
  },
  get authPassword() {
    return runtimeValue("AUTH_PASSWORD", "change-me");
  },
  get encryptionKey() {
    return runtimeValue("ENCRYPTION_KEY");
  },
  get openaiApiKey() {
    return runtimeValue("OPENAI_API_KEY");
  },
  get anthropicApiKey() {
    return runtimeValue("ANTHROPIC_API_KEY");
  },
  get geminiApiKey() {
    return runtimeValue("GEMINI_API_KEY");
  },
  get openrouterApiKey() {
    return runtimeValue("OPENROUTER_API_KEY");
  },
  get groqApiKey() {
    return runtimeValue("GROQ_API_KEY");
  },
  get xaiApiKey() {
    return runtimeValue("XAI_API_KEY");
  },
  get mistralApiKey() {
    return runtimeValue("MISTRAL_API_KEY");
  },
  get customOpenAiBaseUrl() {
    return runtimeValue("CUSTOM_OPENAI_BASE_URL");
  },
  get customOpenAiApiKey() {
    return runtimeValue("CUSTOM_OPENAI_API_KEY");
  },
  get maxUploadMb() {
    return toInt(runtimeValue("MAX_UPLOAD_MB"), 25);
  },
  get trustCloudflare() {
    return toBool(runtimeValue("TRUST_CLOUDFLARE"), true);
  },
  get cloudflareAccessEnabled() {
    return toBool(runtimeValue("CLOUDFLARE_ACCESS_ENABLED"), false);
  },
  get cloudflareTeamDomain() {
    return runtimeValue("CLOUDFLARE_TEAM_DOMAIN");
  },
  get cloudflareAud() {
    return runtimeValue("CLOUDFLARE_AUD");
  },
  get requireAppEncryption() {
    return toBool(runtimeValue("REQUIRE_APP_ENCRYPTION"), true);
  },
  get blockedRedirectUrl() {
    return runtimeValue(
      "BLOCKED_REDIRECT_URL",
      "https://xthat.sky0cloud.dpdns.org/blocked/no-access",
    );
  },
  get nodeEnv() {
    return runtimeValue("NODE_ENV", "development");
  },
};

export const isProduction = () => env.nodeEnv === "production";
