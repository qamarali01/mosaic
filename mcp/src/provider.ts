import crypto from "crypto"
import type { Response } from "express"
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js"
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js"
import {
  InvalidGrantError,
  UnsupportedGrantTypeError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js"
import { supabase } from "./supabase.js"
import { checkRateLimit } from "./utils/rate-limiter.js"
import type { UserRole } from "./context.js"

// ── In-memory stores ───────────────────────────────────────────────────────────

interface PendingCode {
  mscKey: string
  codeChallenge: string
  clientId: string
  redirectUri: string
  expiresAt: number
}

// Registered OAuth clients — ephemeral, Claude.ai re-registers each connection
const clientStore = new Map<string, OAuthClientInformationFull>()

// Pending auth codes — 5 minute TTL
const pendingCodes = new Map<string, PendingCode>()

// Clean up expired codes every minute
setInterval(() => {
  const now = Date.now()
  for (const [code, entry] of pendingCodes.entries()) {
    if (entry.expiresAt < now) pendingCodes.delete(code)
  }
}, 60_000)

// ── Clients Store ──────────────────────────────────────────────────────────────

class MosaicClientsStore implements OAuthRegisteredClientsStore {
  getClient(clientId: string): OAuthClientInformationFull | undefined {
    return clientStore.get(clientId)
  }

  registerClient(
    client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">
  ): OAuthClientInformationFull {
    const fullClient: OAuthClientInformationFull = {
      ...client,
      client_id: crypto.randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
    }
    clientStore.set(fullClient.client_id, fullClient)
    return fullClient
  }
}

// ── Authorize HTML ─────────────────────────────────────────────────────────────

function authorizeHtml(params: {
  state: string
  codeChallenge: string
  codeChallengeMethod: string
  clientId: string
  redirectUri: string
  error?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connect Claude to Mosaic</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #EDE3D0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      margin: 0;
    }
    .card {
      background: #F5EFE4;
      border: 1px solid #D8C8B0;
      border-radius: 14px;
      padding: 36px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    h1 { font-size: 20px; font-weight: 600; color: #2C3E50; margin: 0 0 6px; }
    p { font-size: 14px; color: #6B6249; margin: 0 0 24px; line-height: 1.5; }
    label { font-size: 12px; font-weight: 600; color: #4A4538; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px; }
    input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #C8B898;
      border-radius: 8px;
      font-size: 14px;
      background: #FDF8F0;
      color: #2C3E50;
      outline: none;
      margin-bottom: 20px;
    }
    input:focus { border-color: #2C3E50; box-shadow: 0 0 0 3px rgba(44,62,80,0.1); }
    button {
      width: 100%;
      padding: 12px;
      background: #2C3E50;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover { background: #3d5166; }
    .error {
      background: #fdecea;
      border: 1px solid #f5c6c2;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      color: #8B3A2F;
      margin-bottom: 16px;
    }
    .hint { font-size: 12px; color: #8A7A60; margin-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connect Claude to Mosaic</h1>
    <p>Enter your Mosaic API key to give Claude access to your products, orders, and artisans.</p>
    ${params.error ? `<div class="error">${params.error}</div>` : ""}
    <form method="POST">
      <input type="hidden" name="response_type" value="code" />
      <input type="hidden" name="state" value="${params.state ?? ""}" />
      <input type="hidden" name="code_challenge" value="${params.codeChallenge}" />
      <input type="hidden" name="code_challenge_method" value="${params.codeChallengeMethod}" />
      <input type="hidden" name="client_id" value="${params.clientId}" />
      <input type="hidden" name="redirect_uri" value="${params.redirectUri}" />
      <label for="api_key">API Key</label>
      <input type="password" id="api_key" name="api_key" placeholder="msc_..." autocomplete="off" autofocus />
      <button type="submit">Authorize</button>
    </form>
    <p class="hint">Generate a key in <strong>Settings → API Keys</strong> inside Mosaic.</p>
  </div>
</body>
</html>`
}

// ── MosaicOAuthProvider ────────────────────────────────────────────────────────

type AuthorizationParams = {
  state?: string
  scopes?: string[]
  codeChallenge: string
  redirectUri: string
  resource?: URL
}

export class MosaicOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new MosaicClientsStore()

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const body = (res.req as unknown as { body?: Record<string, string> })?.body
    const method = (res.req as unknown as { method?: string })?.method

    if (method === "POST" && body?.api_key) {
      // Validate the submitted API key
      const rawKey = body.api_key.trim()
      if (!rawKey.startsWith("msc_")) {
        res.send(
          authorizeHtml({
            state: params.state ?? "",
            codeChallenge: params.codeChallenge,
            codeChallengeMethod: "S256",
            clientId: client.client_id,
            redirectUri: params.redirectUri,
            error: "Invalid key format. Keys start with msc_",
          })
        )
        return
      }

      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")
      const { data: keyRecord } = await supabase
        .from("mcp_api_keys")
        .select("id, user_id, name, role")
        .eq("key_hash", keyHash)
        .single()

      if (!keyRecord) {
        res.send(
          authorizeHtml({
            state: params.state ?? "",
            codeChallenge: params.codeChallenge,
            codeChallengeMethod: "S256",
            clientId: client.client_id,
            redirectUri: params.redirectUri,
            error: "Invalid or revoked API key. Please check your key and try again.",
          })
        )
        return
      }

      // Generate auth code and store it
      const code = crypto.randomBytes(32).toString("hex")
      pendingCodes.set(code, {
        mscKey: rawKey,
        codeChallenge: params.codeChallenge,
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        expiresAt: Date.now() + 5 * 60_000,
      })

      // Redirect back to Claude.ai with the code
      const redirectUrl = new URL(params.redirectUri)
      redirectUrl.searchParams.set("code", code)
      // Always set state — Claude.ai requires it even if empty
      redirectUrl.searchParams.set("state", params.state ?? "")
      res.redirect(302, redirectUrl.toString())
    } else {
      // Show the authorization form
      res.send(
        authorizeHtml({
          state: params.state ?? "",
          codeChallenge: params.codeChallenge,
          codeChallengeMethod: "S256",
          clientId: client.client_id,
          redirectUri: params.redirectUri,
        })
      )
    }
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const entry = pendingCodes.get(authorizationCode)
    if (!entry || entry.expiresAt < Date.now()) {
      throw new InvalidGrantError("Authorization code is invalid or expired")
    }
    return entry.codeChallenge
  }

  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    _resource?: URL
  ): Promise<OAuthTokens> {
    const entry = pendingCodes.get(authorizationCode)
    if (!entry || entry.expiresAt < Date.now()) {
      throw new InvalidGrantError("Authorization code is invalid or expired")
    }
    pendingCodes.delete(authorizationCode)

    return {
      access_token: entry.mscKey,
      token_type: "Bearer",
      scope: "mcp",
    }
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    _refreshToken: string,
    _scopes?: string[],
    _resource?: URL
  ): Promise<OAuthTokens> {
    throw new UnsupportedGrantTypeError("Refresh tokens are not supported. API keys do not expire.")
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const keyHash = crypto.createHash("sha256").update(token).digest("hex")

    const { data: keyRecord } = await supabase
      .from("mcp_api_keys")
      .select("id, user_id, name, role")
      .eq("key_hash", keyHash)
      .single()

    if (!keyRecord) {
      throw new Error("Invalid or revoked API key")
    }

    // Rate limiting
    const limited = checkRateLimit(keyRecord.id, keyRecord.role as UserRole)
    if (limited) {
      throw new Error(`Rate limit exceeded. Retry after ${limited} seconds.`)
    }

    // Update last_used_at fire-and-forget
    supabase
      .from("mcp_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id)
      .then(() => {})

    return {
      token,
      clientId: keyRecord.id,
      scopes: ["mcp"],
      extra: {
        userId: keyRecord.user_id,
        role: keyRecord.role,
        keyId: keyRecord.id,
        keyName: keyRecord.name,
      },
    }
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    const keyHash = crypto.createHash("sha256").update(request.token).digest("hex")
    await supabase.from("mcp_api_keys").delete().eq("key_hash", keyHash)
  }
}
