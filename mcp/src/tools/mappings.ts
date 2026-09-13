import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

export function registerMappingTools(server: McpServer, ctx: McpContext) {
  server.tool("get_customer_mappings", "Get all product-to-customer SKU mappings for a customer.", {
    customer_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("customer_product_mappings")
      .select("*, product:products(id,internal_sku,name)")
      .eq("customer_id", input.customer_id)
      .order("created_at", { ascending: false })
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  server.tool("get_product_mappings", "Get all customer mappings for a specific product (who buys it and at what price/SKU).", {
    product_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("customer_product_mappings")
      .select("*, customer:customers(id,name,currency)")
      .eq("product_id", input.product_id)
      .order("created_at", { ascending: false })
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  server.tool("upsert_mapping", "Create or update a customer-product mapping (customer SKU, price, MOQ, lead time).", {
    customer_id: z.string().uuid(),
    product_id: z.string().uuid(),
    mapping_id: z.string().uuid().optional(),
    customer_sku: z.string().min(1).max(100),
    customer_description: z.string().optional(),
    price: z.number().min(0),
    currency: z.string().length(3).default("USD"),
    moq: z.number().int().min(0).optional(),
    lead_time: z.string().optional(),
    packaging_notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { mapping_id, ...payload } = input
    const query = mapping_id
      ? supabase.from("customer_product_mappings").update(payload).eq("id", mapping_id).select().single()
      : supabase.from("customer_product_mappings").insert(payload).select().single()
    const { data, error } = await query
    if (error) {
      if (error.code === "23505") return mcpError("A mapping already exists for this customer/product pair. Provide mapping_id to update it.")
      return mcpError(error.message)
    }
    return mcpSuccess(data)
  })

  server.tool("delete_mapping", "Delete a customer-product mapping.", {
    mapping_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("customer_product_mappings").delete().eq("id", input.mapping_id)
    if (error) return mcpError(error.message)
    return mcpSuccess({ deleted: true })
  })
}
