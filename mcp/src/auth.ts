import crypto from "crypto"
import type { Request, Response } from "express"
import { supabase } from "./supabase.js"
import { checkRateLimit } from "./utils/rate-limiter.js"

export type UserRole = "admin" | "sales" | "viewer"

export interface McpContext {
  userId: string
  role: UserRole
  keyId: string
  keyName: string
}

export function requireRole(ctx: McpContext, minRole: UserRole): void {
  const order: Record<UserRole, number> = { viewer: 0, sales: 1, admin: 2 }
  if (order[ctx.role] < order[minRole]) {
    throw new Error(`Insufficient permissions. Required: ${minRole}, your role: ${ctx.role}`)
  }
}

export async function authenticate(
  req: Request,
  res: Response
): Promise<McpContext | null> {
  const authHeader = req.headers["authorization"]
  if (!authHeader?.startsWith("Bearer ")) {
    res
      .status(401)
      .set("WWW-Authenticate", 'Bearer realm="Mosaic MCP", error="invalid_token", error_description="Provide your msc_ API key as a Bearer token"')
      .json({ error: "Missing or invalid Authorization header. Expected: Bearer msc_..." })
    return null
  }

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey.startsWith("msc_")) {
    res
      .status(401)
      .set("WWW-Authenticate", 'Bearer realm="Mosaic MCP", error="invalid_token"')
      .json({ error: "Invalid API key format. Keys start with msc_" })
    return null
  }

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex")

  const { data: keyRecord, error } = await supabase
    .from("mcp_api_keys")
    .select("id, user_id, name, role")
    .eq("key_hash", keyHash)
    .single()

  if (error || !keyRecord) {
    res.status(401).json({ error: "Invalid or revoked API key" })
    return null
  }

  // Rate limiting
  const limited = checkRateLimit(keyRecord.id, keyRecord.role as UserRole)
  if (limited) {
    res.status(429).set("Retry-After", String(limited)).json({
      error: `Rate limit exceeded. Retry after ${limited} seconds.`,
    })
    return null
  }

  // Update last_used_at fire-and-forget
  supabase
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)
    .then(() => {})

  return {
    userId: keyRecord.user_id,
    role: keyRecord.role as UserRole,
    keyId: keyRecord.id,
    keyName: keyRecord.name,
  }
}
