import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../auth.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"
import { onAssignmentStatusChanged } from "../utils/transitions.js"

export function registerAssignmentTools(server: McpServer, ctx: McpContext) {
  server.tool("get_order_assignments", "Get all artisan assignments for an order, grouped by line item.", {
    order_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("artisan_assignments")
      .select("*, artisan:artisans(id,name,location), order_item:order_items(*, product:products(id,name))")
      .eq("order_id", input.order_id)
      .order("created_at")
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  server.tool("create_assignment", "Assign an artisan to an order line item. Quantity cannot exceed the remaining unassigned units.", {
    order_id: z.string().uuid(),
    order_item_id: z.string().uuid(),
    artisan_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    rate: z.number().min(0).optional(),
    expected_delivery_date: z.string().optional(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

    // Validate remaining capacity
    const { data: orderItem } = await supabase.from("order_items").select("quantity").eq("id", input.order_item_id).single()
    if (!orderItem) return mcpError("Order item not found")

    const { data: existing } = await supabase
      .from("artisan_assignments")
      .select("quantity")
      .eq("order_item_id", input.order_item_id)
      .not("status", "eq", "cancelled")
    const alreadyAssigned = (existing ?? []).reduce((s, a) => s + a.quantity, 0)
    const remaining = orderItem.quantity - alreadyAssigned
    if (input.quantity > remaining) return mcpError(`Only ${remaining} unit(s) remaining to assign for this line item`)

    const { data, error } = await supabase
      .from("artisan_assignments")
      .insert({ ...input, status: "pending", created_by: ctx.userId })
      .select()
      .single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisan_assignments", recordId: data.id, action: "mcp_create", newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_assignment", "Update an assignment's quantity, rate, dates, or notes.", {
    assignment_id: z.string().uuid(),
    quantity: z.number().int().min(1).optional(),
    rate: z.number().min(0).optional(),
    expected_delivery_date: z.string().optional(),
    actual_delivery_date: z.string().optional(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

    const { assignment_id, ...updates } = input

    // Re-validate capacity if quantity is changing
    if (updates.quantity !== undefined) {
      const { data: current } = await supabase.from("artisan_assignments").select("quantity,order_item_id").eq("id", assignment_id).single()
      if (current) {
        const { data: orderItem } = await supabase.from("order_items").select("quantity").eq("id", current.order_item_id).single()
        const { data: others } = await supabase.from("artisan_assignments").select("quantity").eq("order_item_id", current.order_item_id).neq("id", assignment_id).not("status", "eq", "cancelled")
        const otherQty = (others ?? []).reduce((s, a) => s + a.quantity, 0)
        const max = (orderItem?.quantity ?? 0) - otherQty
        if (updates.quantity > max) return mcpError(`Maximum assignable quantity is ${max}`)
      }
    }

    const { data: old } = await supabase.from("artisan_assignments").select("*").eq("id", assignment_id).single()
    const { data, error } = await supabase.from("artisan_assignments").update(updates).eq("id", assignment_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisan_assignments", recordId: assignment_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_assignment_status", "Update an assignment's status. in_progress auto-promotes the parent order from confirmed→in_production. completed auto-sets actual_delivery_date.", {
    assignment_id: z.string().uuid(),
    status: z.enum(["pending","assigned","in_progress","completed","cancelled"]),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }

    const updatePayload: Record<string, unknown> = { status: input.status }
    if (input.status === "completed") updatePayload.actual_delivery_date = new Date().toISOString().split("T")[0]

    const { data, error } = await supabase.from("artisan_assignments").update(updatePayload).eq("id", input.assignment_id).select().single()
    if (error) return mcpError(error.message)

    // Auto-transitions
    await onAssignmentStatusChanged(data.order_id, input.status)

    await logMcpAudit({ tableName: "artisan_assignments", recordId: input.assignment_id, action: "mcp_update", newData: { status: input.status }, ctx })
    return mcpSuccess(data)
  })

  server.tool("delete_assignment", "Remove an artisan assignment from an order.", {
    assignment_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("artisan_assignments").delete().eq("id", input.assignment_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "artisan_assignments", recordId: input.assignment_id, action: "mcp_delete", ctx })
    return mcpSuccess({ deleted: true })
  })
}
