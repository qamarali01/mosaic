import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

export function registerAdminTools(server: McpServer, ctx: McpContext) {
  // ── list_users ─────────────────────────────────────────────────────────────
  server.tool("list_users", "List all Mosaic users with their roles. Admin only.", {},
    async () => {
      try { requireRole(ctx, "admin") } catch (e: unknown) { return mcpError((e as Error).message) }

      const adminClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      const { data: { users }, error } = await adminClient.auth.admin.listUsers()
      if (error) return mcpError(error.message)

      const { data: profiles } = await supabase.from("user_profiles").select("id, role, full_name")
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

      const result = users.map((u) => {
        const profile = profileMap.get(u.id)
        return {
          id: u.id,
          email: u.email,
          full_name: profile?.full_name ?? null,
          role: profile?.role ?? "viewer",
          created_at: u.created_at,
        }
      })

      return mcpSuccess(result)
    }
  )

  // ── update_user_role ───────────────────────────────────────────────────────
  server.tool("update_user_role", "Change a user's role. Admin only.", {
    user_id: z.string().uuid(),
    role: z.enum(["admin", "sales", "viewer"]),
  }, async (input) => {
    try { requireRole(ctx, "admin") } catch (e: unknown) { return mcpError((e as Error).message) }

    const { error } = await supabase
      .from("user_profiles")
      .update({ role: input.role })
      .eq("id", input.user_id)
    if (error) return mcpError(error.message)

    return mcpSuccess({ updated: true, user_id: input.user_id, new_role: input.role })
  })

  // ── list_api_keys ──────────────────────────────────────────────────────────
  server.tool("list_api_keys", "List MCP API keys. Admins see all keys; others see only their own.", {},
    async () => {
      let query = supabase
        .from("mcp_api_keys")
        .select("id, user_id, name, role, last_used_at, created_at")
        .order("created_at", { ascending: false })

      if (ctx.role !== "admin") query = query.eq("user_id", ctx.userId)

      const { data, error } = await query
      if (error) return mcpError(error.message)
      return mcpSuccess(data)
    }
  )

  // ── revoke_api_key ─────────────────────────────────────────────────────────
  server.tool("revoke_api_key", "Revoke an MCP API key. Admins can revoke any key; others can only revoke their own.", {
    key_id: z.string().uuid(),
  }, async (input) => {
    const { data: key } = await supabase.from("mcp_api_keys").select("user_id").eq("id", input.key_id).single()
    if (!key) return mcpError("Key not found")
    if (key.user_id !== ctx.userId && ctx.role !== "admin") return mcpError("Insufficient permissions")

    const { error } = await supabase.from("mcp_api_keys").delete().eq("id", input.key_id)
    if (error) return mcpError(error.message)
    return mcpSuccess({ revoked: true })
  })
}
