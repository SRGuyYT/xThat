# xThat

xThat is a private multi-model AI workspace built with Next.js, TypeScript, Tailwind CSS, Prisma, and SQLite. It runs locally on Windows 11, stores uploaded files under `/uploads`, encrypts API keys before saving them to SQLite, supports `.env` provider keys, and is designed to sit behind Cloudflare Tunnel and Cloudflare Access.

## Features

- ChatGPT-style chat UI with conversation history
- Multi-provider model selection:
  - OpenAI
  - Anthropic Claude
  - Google Gemini
  - OpenRouter
  - Groq
  - xAI / Grok
  - Mistral
  - Custom OpenAI-compatible endpoint
- Streaming responses
- Markdown rendering with syntax highlighting and copy-code buttons
- Image, PDF, TXT, MD, and DOCX uploads
- Local login with encrypted session cookies
- API keys from `.env` or encrypted SQLite storage
- Local chat history with rename/delete conversation support
- Theme toggle and liquid glass interface
- App-level encryption and access health gate with `/blocked/no-access`

## Security Warnings

- Do not expose this app directly to the public internet.
- Put it behind Cloudflare Access, a VPN, or another authentication layer.
- Rotate provider API keys immediately if you believe they were leaked.
- This app-level health gate does not replace HTTPS. Real transport encryption still comes from HTTPS and your reverse proxy or tunnel.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- Docker and docker-compose

## Environment

Copy `.env.example` to `.env` and fill in the values:

```env
APP_URL=http://localhost:3000
AUTH_USERNAME=admin
AUTH_PASSWORD=change-me
ENCRYPTION_KEY=generate-a-32-byte-random-key
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
XAI_API_KEY=
MISTRAL_API_KEY=
CUSTOM_OPENAI_BASE_URL=
CUSTOM_OPENAI_API_KEY=
MAX_UPLOAD_MB=25
TRUST_CLOUDFLARE=true
CLOUDFLARE_ACCESS_ENABLED=false
CLOUDFLARE_TEAM_DOMAIN=
CLOUDFLARE_AUD=
REQUIRE_APP_ENCRYPTION=true
BLOCKED_REDIRECT_URL=https://xthat.sky0cloud.dpdns.org/blocked/no-access
```

`ENCRYPTION_KEY` must be exactly 32 bytes long. On Windows PowerShell, generate one with:

```powershell
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

## Windows 11 Setup

1. Install Node.js LTS from [nodejs.org](https://nodejs.org/).
2. Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/).
3. Clone the repo:
   ```powershell
   git clone https://github.com/SRGuyYT/xThat.git
   cd xThat
   ```
4. Copy `.env.example` to `.env`.
5. Add your provider API keys.
6. Generate and set `ENCRYPTION_KEY`.
7. Install dependencies:
   ```powershell
   npm install
   ```
8. Create the database:
   ```powershell
   npx prisma migrate dev
   ```
   If Prisma migration commands fail on your Windows machine, run:
   ```powershell
   npm run db:init
   ```
9. Start development:
   ```powershell
   npm run dev
   ```
10. Or run the container:
   ```powershell
   docker compose up -d
   ```

Open [http://localhost:3000](http://localhost:3000).

## Docker

Run:

```powershell
docker compose up -d
```

The compose file mounts:

- `./uploads` to `/app/uploads`
- `./prisma` to `/app/prisma`

## Cloudflare Tunnel Setup

1. Install `cloudflared`.
2. Authenticate:
   ```powershell
   cloudflared tunnel login
   ```
3. Create a tunnel:
   ```powershell
   cloudflared tunnel create xthat
   ```
4. Route DNS:
   ```powershell
   cloudflared tunnel route dns xthat xthat.example.com
   ```
5. Create a `config.yml` that points to `http://localhost:3000`.
6. Run the tunnel:
   ```powershell
   cloudflared tunnel run xthat
   ```

## Cloudflare Access Setup

1. In Cloudflare Zero Trust, create an Access application for your xThat hostname.
2. Require identity-based login for the app.
3. Set these environment variables in `.env`:
   - `CLOUDFLARE_ACCESS_ENABLED=true`
   - `CLOUDFLARE_TEAM_DOMAIN=<your-team>`
   - `CLOUDFLARE_AUD=<your-access-audience>`
4. Forward the standard headers:
   - `Cf-Access-Authenticated-User-Email`
   - `Cf-Access-Jwt-Assertion`

When Cloudflare Access is enabled, xThat shows the authenticated email in Settings > Security when the header is present.

## Upload Handling

- Images are stored locally in `/uploads` and sent as data URLs when appropriate.
- TXT and MD files are read directly.
- PDFs are parsed server-side.
- DOCX files are extracted with Mammoth.
- Large extracted text is chunked before being included in prompts.
- Unsupported file types are rejected.

## Providers and Custom Models

- Providers can be enabled or disabled in Settings > Providers.
- Default provider and model can be changed in Settings.
- Custom model IDs can be added in Settings > Models.
- Unknown models are still allowed, but the UI warns that capabilities are unknown.

## Security Gate

If `REQUIRE_APP_ENCRYPTION=true`, xThat checks:

- HTTPS in production or trusted Cloudflare forwarding
- `ENCRYPTION_KEY` presence and length
- API key encryption/decryption round-trip
- session cookie encryption/decryption
- Cloudflare Access headers when Access is enabled

Failures redirect to:

- `BLOCKED_REDIRECT_URL`

The blocked route receives query params such as:

- `/blocked/no-access?code=401&reason=missing_encryption_key`

## Add a Provider

1. Create a new adapter in `lib/providers/`.
2. Register it in `lib/providers/index.ts`.
3. Add known models and capabilities in `lib/model-capabilities.ts`.
4. Add env support in `.env.example` and `lib/env.ts`.

## Troubleshooting

- `401 Unauthorized` on startup:
  - Check `ENCRYPTION_KEY`.
  - Check `REQUIRE_APP_ENCRYPTION`.
  - Check Cloudflare Access headers if enabled.
- Uploads fail:
  - Confirm the file type is supported.
  - Confirm the file is under `MAX_UPLOAD_MB`.
- Provider requests fail:
  - Verify the API key in Settings or `.env`.
  - Verify the selected provider actually supports the chosen model.
- Prisma errors:
  - Re-run `npx prisma generate`.
  - Re-run `npx prisma migrate dev`.
  - If the Prisma schema engine fails on your machine, run `npm run db:init` to initialize SQLite directly from the checked-in migration SQL.
