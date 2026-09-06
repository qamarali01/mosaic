import express from "express"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { authenticate } from "./auth.js"
import { registerAllTools } from "./tools/index.js"

const PORT = parseInt(process.env.MCP_PORT ?? "3001", 10)

const app = express()
app.use(express.json({ limit: "25mb" })) // large enough for base64 file uploads

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "mosaic-mcp", timestamp: new Date().toISOString() })
})

// MCP endpoint — SSE transport for Claude.ai
const transports = new Map<string, SSEServerTransport>()

app.get("/mcp", async (req, res) => {
  // Authenticate
  const ctx = await authenticate(req, res)
  if (!ctx) return // authenticate() already sent 401/429

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
  // Authenticate on message too
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

app.listen(PORT, () => {
  console.log(`Mosaic MCP server running on port ${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
  console.log(`MCP SSE: http://localhost:${PORT}/mcp`)
})
