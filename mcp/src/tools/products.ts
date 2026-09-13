import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

export function registerProductTools(server: McpServer, ctx: McpContext) {
  // ── list_products ──────────────────────────────────────────────────────────
  server.tool(
    "list_products",
    "List products from the Mosaic catalog. Filter by status (active/archived/all) and search by name or SKU.",
    {
      status: z.enum(["active", "archived", "all"]).default("active"),
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      page_size: z.number().int().min(1).max(50).default(20),
    },
    async (input) => {
      let query = supabase
        .from("products")
        .select("*, collection:collections(id,name), images:product_images(url)", { count: "exact" })

      if (input.status !== "all") query = query.eq("status", input.status)
      if (input.search) query = query.or(`name.ilike.%${input.search}%,internal_sku.ilike.%${input.search}%`)

      const from = (input.page - 1) * input.page_size
      const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + input.page_size - 1)
      if (error) return mcpError(error.message)
      return mcpSuccess({ products: data, total: count, page: input.page, page_size: input.page_size })
    }
  )

  // ── get_product ────────────────────────────────────────────────────────────
  server.tool(
    "get_product",
    "Get full details of a product including images, documents, collection, and customer mappings.",
    { product_id: z.string().uuid("Invalid product ID") },
    async (input) => {
      const { data, error } = await supabase
        .from("products")
        .select("*, collection:collections(id,name), images:product_images(*), documents:product_documents(*)")
        .eq("id", input.product_id)
        .single()
      if (error) return mcpError("Product not found")
      return mcpSuccess(data)
    }
  )

  // ── create_product ─────────────────────────────────────────────────────────
  server.tool(
    "create_product",
    "Create a new product in the Mosaic catalog.",
    {
      internal_sku: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      collection_id: z.string().uuid().optional(),
    },
    async (input) => {
      try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

      const { data, error } = await supabase
        .from("products")
        .insert({ ...input, created_by: ctx.userId })
        .select()
        .single()
      if (error) {
        if (error.code === "23505") return mcpError("A product with this SKU already exists")
        return mcpError(error.message)
      }
      await logMcpAudit({ tableName: "products", recordId: data.id, action: "mcp_create", newData: data, ctx })
      return mcpSuccess(data)
    }
  )

  // ── update_product ─────────────────────────────────────────────────────────
  server.tool(
    "update_product",
    "Update a product's name, description, SKU, or collection.",
    {
      product_id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      internal_sku: z.string().min(1).max(100).optional(),
      collection_id: z.string().uuid().nullable().optional(),
    },
    async (input) => {
      try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

      const { product_id, ...updates } = input
      const { data: old } = await supabase.from("products").select("*").eq("id", product_id).single()
      const { data, error } = await supabase.from("products").update(updates).eq("id", product_id).select().single()
      if (error) return mcpError(error.message)
      await logMcpAudit({ tableName: "products", recordId: product_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
      return mcpSuccess(data)
    }
  )

  // ── archive_product ────────────────────────────────────────────────────────
  server.tool(
    "archive_product",
    "Archive a product (soft delete — it won't appear in active lists but history is preserved).",
    { product_id: z.string().uuid() },
    async (input) => {
      try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
      const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", input.product_id)
      if (error) return mcpError(error.message)
      await logMcpAudit({ tableName: "products", recordId: input.product_id, action: "mcp_archive", ctx })
      return mcpSuccess({ archived: true })
    }
  )

  // ── restore_product ────────────────────────────────────────────────────────
  server.tool(
    "restore_product",
    "Restore an archived product back to active status.",
    { product_id: z.string().uuid() },
    async (input) => {
      try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
      const { error } = await supabase.from("products").update({ status: "active" }).eq("id", input.product_id)
      if (error) return mcpError(error.message)
      await logMcpAudit({ tableName: "products", recordId: input.product_id, action: "mcp_restore", ctx })
      return mcpSuccess({ restored: true })
    }
  )

  // ── delete_product ─────────────────────────────────────────────────────────
  server.tool(
    "delete_product",
    "Permanently delete a product. Only works if the product has no quotes, orders, or customer mappings referencing it.",
    { product_id: z.string().uuid() },
    async (input) => {
      try { requireRole(ctx, "admin") } catch (e: unknown) { return mcpError((e as Error).message) }

      const [{ count: quoteCount }, { count: orderCount }, { count: mappingCount }] = await Promise.all([
        supabase.from("quote_items").select("id", { count: "exact", head: true }).eq("product_id", input.product_id),
        supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", input.product_id),
        supabase.from("customer_product_mappings").select("id", { count: "exact", head: true }).eq("product_id", input.product_id),
      ])

      const parts = []
      if ((quoteCount ?? 0) > 0) parts.push(`${quoteCount} quote(s)`)
      if ((orderCount ?? 0) > 0) parts.push(`${orderCount} order(s)`)
      if ((mappingCount ?? 0) > 0) parts.push(`${mappingCount} customer mapping(s)`)
      if (parts.length > 0) return mcpError(`Cannot delete — product is referenced by ${parts.join(", ")}. Archive it instead.`)

      const { error } = await supabase.from("products").delete().eq("id", input.product_id)
      if (error) return mcpError(error.message)
      await logMcpAudit({ tableName: "products", recordId: input.product_id, action: "mcp_delete", ctx })
      return mcpSuccess({ deleted: true })
    }
  )
}
