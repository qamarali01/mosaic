import crypto from "crypto"
import express from "express"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js"
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js"
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js"
import { MosaicOAuthProvider } from "./provider.js"
import { buildContextFromAuthInfo, type McpContext } from "./context.js"
import { registerAllTools } from "./tools/index.js"

const PORT = parseInt(process.env.MCP_PORT ?? "3001", 10)
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`

// ── OAuth provider ─────────────────────────────────────────────────────────────
const provider = new MosaicOAuthProvider()

// ── Persistent session store ───────────────────────────────────────────────────
interface ActiveSession {
  server: McpServer
  transport: StreamableHTTPServerTransport
  ctx: McpContext
  lastUsed: number
}
const sessions = new Map<string, ActiveSession>()

// Clean up idle sessions (>30 min) every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60_000
  for (const [id, session] of sessions.entries()) {
    if (session.lastUsed < cutoff) {
      session.server.close().catch(() => {})
      sessions.delete(id)
      console.log(`[session] cleaned up idle session ${id}`)
    }
  }
}, 5 * 60_000)

// ── Express app ────────────────────────────────────────────────────────────────
const app = express()
app.set("trust proxy", 1) // Railway sits behind a reverse proxy — trust the first hop
app.use(express.json({ limit: "25mb" }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "mosaic-mcp",
    sessions: sessions.size,
    timestamp: new Date().toISOString(),
  })
})

// OAuth 2.1 auth router — registers:
//   GET  /.well-known/oauth-authorization-server  (RFC 8414)
//   GET  /.well-known/oauth-protected-resource*   (RFC 9728)
//   GET|POST /authorize                           (authorization endpoint)
//   POST /token                                   (token endpoint)
//   POST /register                                (RFC 7591 DCR)
//   POST /revoke                                  (RFC 7009)
app.use(
  mcpAuthRouter({
    provider,
    issuerUrl: new URL(BASE_URL),
    resourceServerUrl: new URL(`${BASE_URL}/mcp`),
    scopesSupported: ["mcp"],
    resourceName: "Mosaic",
  })
)

// ── MCP endpoint — protected, persistent sessions ──────────────────────────────
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(new URL(`${BASE_URL}/mcp`))

app.all(
  "/mcp",
  requireBearerAuth({ verifier: provider, resourceMetadataUrl }),
  async (req, res) => {
    const authInfo = (req as express.Request & { auth?: AuthInfo }).auth!
    const ctx = buildContextFromAuthInfo(authInfo)

    const incomingSessionId = req.headers["mcp-session-id"] as string | undefined
    let session = incomingSessionId ? sessions.get(incomingSessionId) : undefined

    if (session) {
      // Reuse existing session
      session.lastUsed = Date.now()
      await session.transport.handleRequest(req, res, req.body)
    } else {
      // Create a new persistent session
      const server = new McpServer({ name: "mosaic", version: "1.0.0" })
      registerAllTools(server, ctx)

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (sessionId) => {
          sessions.set(sessionId, {
            server,
            transport,
            ctx,
            lastUsed: Date.now(),
          })
          console.log(`[session] created ${sessionId} for user ${ctx.userId} (${ctx.role})`)
        },
        onsessionclosed: (sessionId) => {
          sessions.delete(sessionId)
          console.log(`[session] closed ${sessionId}`)
        },
      })

      // Also clean up on transport close
      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId)
        }
        server.close().catch(() => {})
      }

      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    }
  }
)

app.listen(PORT, () => {
  console.log(`Mosaic MCP server running on port ${PORT}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Health:   ${BASE_URL}/health`)
  console.log(`OAuth AS: ${BASE_URL}/.well-known/oauth-authorization-server`)
  console.log(`MCP:      ${BASE_URL}/mcp`)
})
