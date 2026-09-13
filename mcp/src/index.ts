import express from "express"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { authenticate } from "./auth.js"
import { registerAllTools } from "./tools/index.js"

const PORT = parseInt(process.env.MCP_PORT ?? "3001", 10)
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`

const app = express()
app.use(express.json({ limit: "25mb" }))

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mosaic-mcp", timestamp: new Date().toISOString() })
})

// ── OAuth discovery — Claude.ai probes this before connecting ─────────────────
// Even though we use API keys, Claude.ai requires a valid OAuth discovery
// document to determine how the server handles authentication.
app.get("/.well-known/oauth-authorization-server", (_req, res) => {
  res.json({
    issuer: BASE_URL,
    token_endpoint: `${BASE_URL}/token`,
    response_types_supported: ["token"],
    grant_types_supported: ["urn:ietf:params:oauth:grant-type:token-exchange"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  })
})

// ── Token endpoint — accepts msc_ API key, returns it as the access token ─────
// Claude.ai posts here during "Sign in". The user's msc_ key IS the token.
app.post("/token", express.urlencoded({ extended: true }), (req, res) => {
  // The API key is passed as subject_token in a token exchange,
  // or as a raw value in the request body
  const subjectToken =
    req.body?.subject_token ||
    req.body?.access_token ||
    req.body?.api_key ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null)

  if (!subjectToken || !subjectToken.startsWith("msc_")) {
    res.status(400).json({
      error: "invalid_request",
      error_description:
        "Provide your Mosaic API key (starts with msc_) as the subject_token",
    })
    return
  }

  // Return the key as the access token — no actual OAuth exchange needed
  res.json({
    access_token: subjectToken,
    token_type: "Bearer",
    scope: "mcp",
  })
})

// ── MCP endpoint — SSE transport ──────────────────────────────────────────────
const transports = new Map<string, SSEServerTransport>()

app.get("/mcp", async (req, res) => {
  const ctx = await authenticate(req, res)
  if (!ctx) return

  const server = new McpServer({
    name: "mosaic",
    version: "1.0.0",
  })

  registerAllTools(server, ctx)

  const transport = new SSEServerTransport("/mcp/message", res)
  const sessionId = transport.sessionId
  transports.set(sessionId, transport)

  res.on("close", () => {
    transports.delete(sessionId)
    server.close()
  })

  await server.connect(transport)
})

app.post("/mcp/message", async (req, res) => {
  const ctx = await authenticate(req, res)
  if (!ctx) return

  const sessionId = req.query.sessionId as string
  const transport = transports.get(sessionId)
  if (!transport) {
    res.status(404).json({ error: "Session not found" })
    return
  }

  await transport.handlePostMessage(req, res)
})

// ── Update auth.ts to return proper WWW-Authenticate on 401 ──────────────────
// This is handled in auth.ts but we also catch it here at the express level
app.use((_req, res) => {
  res
    .status(404)
    .set("WWW-Authenticate", 'Bearer realm="Mosaic MCP", error="invalid_token"')
    .json({ error: "Not found" })
})

app.listen(PORT, () => {
  console.log(`Mosaic MCP server running on port ${PORT}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Health: ${BASE_URL}/health`)
  console.log(`OAuth discovery: ${BASE_URL}/.well-known/oauth-authorization-server`)
  console.log(`MCP SSE: ${BASE_URL}/mcp`)
})
