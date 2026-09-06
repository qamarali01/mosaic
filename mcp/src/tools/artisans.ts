import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../auth.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

export function registerArtisanTools(server: McpServer, ctx: McpContext) {
  server.tool("list_artisans", "List artisans. Filter by status and search by name.", {
    status: z.enum(["active","archived","all"]).default("active"),
    search: z.string().optional(),
  }, async (input) => {
    let query = supabase.from("artisans").select("*")
    if (input.status !== "all") query = query.eq("status", input.status)
    if (input.search) query = query.ilike("name", `%${input.search}%`)
    const { data, error } = await query.order("name")
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  server.tool("get_artisan", "Get artisan profile with their current and past assignments.", {
    artisan_id: z.string().uuid(),
  }, async (input) => {
    const [{ data: artisan }, { data: assignments }] = await Promise.all([
      supabase.from("artisans").select("*").eq("id", input.artisan_id).single(),
      supabase.from("artisan_assignments")
        .select("*, order:orders(id,order_number,status), order_item:order_items(*, product:products(id,name))")
        .eq("artisan_id", input.artisan_id)
        .order("created_at", { ascending: false })
        .limit(20),
    ])
    if (!artisan) return mcpError("Artisan not found")
    return mcpSuccess({ ...artisan, assignments: assignments ?? [] })
  })

  server.tool("create_artisan", "Create a new artisan profile.", {
    name: z.string().min(1).max(200),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    location: z.string().optional(),
    specializations: z.string().optional(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { data, error } = await supabase.from("artisans").insert({ ...input, created_by: ctx.userId }).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisans", recordId: data.id, action: "mcp_create", newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_artisan", "Update an artisan's details.", {
    artisan_id: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    location: z.string().optional(),
    specializations: z.string().optional(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { artisan_id, ...updates } = input
    const { data: old } = await supabase.from("artisans").select("*").eq("id", artisan_id).single()
    const { data, error } = await supabase.from("artisans").update(updates).eq("id", artisan_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisans", recordId: artisan_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("archive_artisan", "Archive an artisan.", {
    artisan_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("artisans").update({ status: "archived" }).eq("id", input.artisan_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisans", recordId: input.artisan_id, action: "mcp_archive", ctx })
    return mcpSuccess({ archived: true })
  })

  server.tool("restore_artisan", "Restore an archived artisan.", {
    artisan_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("artisans").update({ status: "active" }).eq("id", input.artisan_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisans", recordId: input.artisan_id, action: "mcp_restore", ctx })
    return mcpSuccess({ restored: true })
  })

  server.tool("get_artisan_workload", "Get an artisan's active assignments and capacity overview.", {
    artisan_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("artisan_assignments")
      .select("*, order:orders(id,order_number), order_item:order_items(*, product:products(id,name))")
      .eq("artisan_id", input.artisan_id)
      .in("status", ["pending","assigned","in_progress"])
      .order("expected_delivery_date", { ascending: true })
    if (error) return mcpError(error.message)
    const totalUnits = (data ?? []).reduce((s, a) => s + a.quantity, 0)
    return mcpSuccess({ active_assignments: data, total_active_units: totalUnits })
  })
}
