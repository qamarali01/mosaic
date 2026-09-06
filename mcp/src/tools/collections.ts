import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../auth.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

export function registerCollectionTools(server: McpServer, ctx: McpContext) {
  server.tool("list_collections", "List product collections.", {
    status: z.enum(["active", "archived", "all"]).default("active"),
    search: z.string().optional(),
  }, async (input) => {
    let query = supabase.from("collections").select("*")
    if (input.status !== "all") query = query.eq("status", input.status)
    if (input.search) query = query.ilike("name", `%${input.search}%`)
    const { data, error } = await query.order("name")
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  server.tool("get_collection", "Get a collection and its products.", {
    collection_id: z.string().uuid(),
  }, async (input) => {
    const [{ data: col }, { data: products }] = await Promise.all([
      supabase.from("collections").select("*").eq("id", input.collection_id).single(),
      supabase.from("products").select("id, internal_sku, name, status").eq("collection_id", input.collection_id).order("name"),
    ])
    if (!col) return mcpError("Collection not found")
    return mcpSuccess({ ...col, products: products ?? [] })
  })

  server.tool("create_collection", "Create a new product collection.", {
    name: z.string().min(1).max(200),
    description: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { data, error } = await supabase.from("collections").insert({ ...input, created_by: ctx.userId }).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "collections", recordId: data.id, action: "mcp_create", newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_collection", "Update a collection's name or description.", {
    collection_id: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { collection_id, ...updates } = input
    const { data: old } = await supabase.from("collections").select("*").eq("id", collection_id).single()
    const { data, error } = await supabase.from("collections").update(updates).eq("id", collection_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "collections", recordId: collection_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("archive_collection", "Archive a collection.", {
    collection_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("collections").update({ status: "archived" }).eq("id", input.collection_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "collections", recordId: input.collection_id, action: "mcp_archive", ctx })
    return mcpSuccess({ archived: true })
  })

  server.tool("restore_collection", "Restore an archived collection.", {
    collection_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("collections").update({ status: "active" }).eq("id", input.collection_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "collections", recordId: input.collection_id, action: "mcp_restore", ctx })
    return mcpSuccess({ restored: true })
  })
}
