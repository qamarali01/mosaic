import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"
import { generateOrderNumber } from "../utils/numbers.js"
import { onOrderCreated } from "../utils/transitions.js"

const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  customer_sku: z.string().min(1),
  customer_description: z.string().optional(),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0),
  currency: z.string().length(3),
  sort_order: z.number().int().default(0),
})

export function registerOrderTools(server: McpServer, ctx: McpContext) {
  server.tool("list_orders", "List orders. Filter by status and optionally by customer.", {
    status: z.enum(["all","pending","confirmed","in_production","shipped","delivered","cancelled"]).default("all"),
    customer_id: z.string().uuid().optional(),
    page: z.number().int().min(1).default(1),
    page_size: z.number().int().min(1).max(50).default(20),
  }, async (input) => {
    let query = supabase
      .from("orders")
      .select("*, customer:customers(id,name), items:order_items(unit_price,quantity,currency)", { count: "exact" })
    if (input.status !== "all") query = query.eq("status", input.status)
    if (input.customer_id) query = query.eq("customer_id", input.customer_id)
    const from = (input.page - 1) * input.page_size
    const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + input.page_size - 1)
    if (error) return mcpError(error.message)
    return mcpSuccess({ orders: data, total: count, page: input.page })
  })

  server.tool("get_order", "Get a full order with line items, customer info, and production assignments.", {
    order_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, customer:customers(id,name,currency), quote:quotes(id,quote_number), items:order_items(*, product:products(id,internal_sku,name)), assignments:artisan_assignments(*, artisan:artisans(id,name))")
      .eq("id", input.order_id)
      .single()
    if (error) return mcpError("Order not found")
    return mcpSuccess(data)
  })

  server.tool("create_order", "Create a new order with line items.", {
    customer_id: z.string().uuid(),
    quote_id: z.string().uuid().optional(),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

    const order_number = await generateOrderNumber()
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({ order_number, customer_id: input.customer_id, quote_id: input.quote_id ?? null, notes: input.notes ?? null, created_by: ctx.userId })
      .select()
      .single()
    if (oErr) return mcpError(oErr.message)

    const { error: iErr } = await supabase.from("order_items").insert(
      input.items.map((item, i) => ({ ...item, order_id: order.id, sort_order: i }))
    )
    if (iErr) {
      await supabase.from("orders").delete().eq("id", order.id)
      return mcpError(iErr.message)
    }

    await onOrderCreated(order.id, input.quote_id ?? null)
    await logMcpAudit({ tableName: "orders", recordId: order.id, action: "mcp_create", newData: order, ctx })
    return mcpSuccess({ order_id: order.id, order_number })
  })

  server.tool("update_order", "Update an order's notes or line items. IMPORTANT: items is a full replacement — include all items you want to keep. Only works on pending/confirmed orders.", {
    order_id: z.string().uuid(),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1).optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { order_id, items, ...updates } = input
    const { data: old } = await supabase.from("orders").select("*").eq("id", order_id).single()
    if (old && !["pending","confirmed"].includes(old.status)) {
      return mcpError(`Cannot update order in status "${old.status}". Only pending/confirmed orders can be edited.`)
    }
    const { data, error } = await supabase.from("orders").update(updates).eq("id", order_id).select().single()
    if (error) return mcpError(error.message)
    if (items) {
      await supabase.from("order_items").delete().eq("order_id", order_id)
      await supabase.from("order_items").insert(items.map((item, i) => ({ ...item, order_id, sort_order: i })))
    }
    await logMcpAudit({ tableName: "orders", recordId: order_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_order_status", "Update order status. Valid flow: pending→confirmed→in_production→shipped→delivered. Can cancel from most states.", {
    order_id: z.string().uuid(),
    status: z.enum(["pending","confirmed","in_production","shipped","delivered","cancelled"]),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { data, error } = await supabase.from("orders").update({ status: input.status }).eq("id", input.order_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "orders", recordId: input.order_id, action: "mcp_update", newData: { status: input.status }, ctx })
    return mcpSuccess(data)
  })

  server.tool("get_production_summary", "Get production cost vs order revenue summary for an order.", {
    order_id: z.string().uuid(),
  }, async (input) => {
    const { data: order } = await supabase
      .from("orders")
      .select("items:order_items(unit_price,quantity,currency), assignments:artisan_assignments(rate,quantity,status)")
      .eq("id", input.order_id)
      .single()
    if (!order) return mcpError("Order not found")

    const items = (order.items ?? []) as Array<{ unit_price: number; quantity: number; currency: string }>
    const assignments = (order.assignments ?? []) as Array<{ rate: number | null; quantity: number; status: string }>

    const revenue = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
    const currency = items[0]?.currency ?? "USD"
    const productionCost = assignments
      .filter((a) => a.status !== "cancelled" && a.rate != null)
      .reduce((s, a) => s + (a.rate ?? 0) * a.quantity, 0)

    return mcpSuccess({ revenue, currency, production_cost_inr: productionCost, margin_note: "Production cost is in INR; revenue currency varies" })
  })

  server.tool("get_overdue_assignments", "Get all in-progress artisan assignments that are past their expected delivery date.", {},
    async () => {
      const today = new Date().toISOString().split("T")[0]
      const { data, error } = await supabase
        .from("artisan_assignments")
        .select("*, artisan:artisans(id,name), order:orders(id,order_number), order_item:order_items(*, product:products(id,name))")
        .in("status", ["assigned","in_progress"])
        .lt("expected_delivery_date", today)
        .order("expected_delivery_date")
      if (error) return mcpError(error.message)
      return mcpSuccess({ overdue: data, count: data?.length ?? 0 })
    }
  )
}
