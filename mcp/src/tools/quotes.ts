import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../auth.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"
import { generateQuoteNumber } from "../utils/numbers.js"

const quoteItemSchema = z.object({
  product_id: z.string().uuid(),
  customer_sku: z.string().min(1),
  customer_description: z.string().optional(),
  unit_price: z.number().min(0),
  currency: z.string().length(3),
  quantity: z.number().int().min(1),
  moq: z.number().int().min(0).optional(),
  lead_time: z.string().optional(),
  sort_order: z.number().int().default(0),
})

export function registerQuoteTools(server: McpServer, ctx: McpContext) {
  server.tool("list_quotes", "List quotes. Filter by status (draft/sent/accepted/rejected/all) and optionally by customer.", {
    status: z.enum(["draft", "sent", "accepted", "rejected", "all"]).default("all"),
    customer_id: z.string().uuid().optional(),
    page: z.number().int().min(1).default(1),
    page_size: z.number().int().min(1).max(50).default(20),
  }, async (input) => {
    let query = supabase
      .from("quotes")
      .select("*, customer:customers(id,name), items:quote_items(unit_price,quantity,currency)", { count: "exact" })
    if (input.status !== "all") query = query.eq("status", input.status)
    if (input.customer_id) query = query.eq("customer_id", input.customer_id)
    const from = (input.page - 1) * input.page_size
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + input.page_size - 1)
    if (error) return mcpError(error.message)
    return mcpSuccess({ quotes: data, total: count, page: input.page })
  })

  server.tool("get_quote", "Get a quote with all line items and product details.", {
    quote_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("quotes")
      .select("*, customer:customers(id,name,currency), items:quote_items(*, product:products(id,internal_sku,name))")
      .eq("id", input.quote_id)
      .single()
    if (error) return mcpError("Quote not found")
    return mcpSuccess(data)
  })

  server.tool("create_quote", "Create a new quote with line items for a customer.", {
    customer_id: z.string().uuid(),
    notes: z.string().optional(),
    valid_until: z.string().optional(),
    items: z.array(quoteItemSchema).min(1),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

    const quote_number = await generateQuoteNumber()
    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .insert({ quote_number, customer_id: input.customer_id, notes: input.notes, valid_until: input.valid_until, created_by: ctx.userId })
      .select()
      .single()
    if (qErr) return mcpError(qErr.message)

    const { error: iErr } = await supabase.from("quote_items").insert(
      input.items.map((item, i) => ({ ...item, quote_id: quote.id, sort_order: i }))
    )
    if (iErr) {
      await supabase.from("quotes").delete().eq("id", quote.id)
      return mcpError(iErr.message)
    }

    await logMcpAudit({ tableName: "quotes", recordId: quote.id, action: "mcp_create", newData: quote, ctx })
    return mcpSuccess({ quote_id: quote.id, quote_number })
  })

  server.tool("update_quote", "Update a quote's notes, valid_until, or line items. IMPORTANT: items is a full replacement — include all items you want to keep.", {
    quote_id: z.string().uuid(),
    notes: z.string().optional(),
    valid_until: z.string().optional(),
    items: z.array(quoteItemSchema).min(1).optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { quote_id, items, ...updates } = input
    const { data: old } = await supabase.from("quotes").select("*").eq("id", quote_id).single()
    const { data, error } = await supabase.from("quotes").update(updates).eq("id", quote_id).select().single()
    if (error) return mcpError(error.message)
    if (items) {
      await supabase.from("quote_items").delete().eq("quote_id", quote_id)
      await supabase.from("quote_items").insert(items.map((item, i) => ({ ...item, quote_id, sort_order: i })))
    }
    await logMcpAudit({ tableName: "quotes", recordId: quote_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_quote_status", "Update quote status. Valid transitions: draft→sent, sent→accepted, sent→rejected.", {
    quote_id: z.string().uuid(),
    status: z.enum(["draft", "sent", "accepted", "rejected"]),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { data, error } = await supabase.from("quotes").update({ status: input.status }).eq("id", input.quote_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "quotes", recordId: input.quote_id, action: "mcp_update", newData: { status: input.status }, ctx })
    return mcpSuccess(data)
  })

  server.tool("convert_quote_to_order", "Convert an accepted quote into an order. The quote will be marked as accepted.", {
    quote_id: z.string().uuid(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("*, items:quote_items(*)")
      .eq("id", input.quote_id)
      .single()
    if (qErr || !quote) return mcpError("Quote not found")

    const { generateOrderNumber } = await import("../utils/numbers.js")
    const { onOrderCreated } = await import("../utils/transitions.js")

    const order_number = await generateOrderNumber()
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({ order_number, customer_id: quote.customer_id, quote_id: quote.id, notes: input.notes ?? quote.notes, created_by: ctx.userId })
      .select()
      .single()
    if (oErr) return mcpError(oErr.message)

    const items = (quote.items as Array<Record<string, unknown>>).map((item, i) => ({
      product_id: item.product_id,
      customer_sku: item.customer_sku,
      customer_description: item.customer_description ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: item.currency,
      sort_order: i,
      order_id: order.id,
    }))
    await supabase.from("order_items").insert(items)
    await onOrderCreated(order.id, quote.id)
    await logMcpAudit({ tableName: "orders", recordId: order.id, action: "mcp_create", newData: order, ctx })
    return mcpSuccess({ order_id: order.id, order_number })
  })
}
