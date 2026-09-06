import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../auth.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpSuccess, mcpError } from "../utils/errors.js"

export function registerCustomerTools(server: McpServer, ctx: McpContext) {
  // ── list_customers ─────────────────────────────────────────────────────────
  server.tool("list_customers", "List customers. Filter by status and search by name.", {
    status: z.enum(["active", "archived", "all"]).default("active"),
    search: z.string().optional(),
    page: z.number().int().min(1).default(1),
    page_size: z.number().int().min(1).max(50).default(20),
  }, async (input) => {
    let query = supabase.from("customers").select("*", { count: "exact" })
    if (input.status !== "all") query = query.eq("status", input.status)
    if (input.search) query = query.ilike("name", `%${input.search}%`)
    const from = (input.page - 1) * input.page_size
    const { data, count, error } = await query.order("name").range(from, from + input.page_size - 1)
    if (error) return mcpError(error.message)
    return mcpSuccess({ customers: data, total: count, page: input.page })
  })

  // ── get_customer ───────────────────────────────────────────────────────────
  server.tool("get_customer", "Get a customer with their contacts, addresses, and product mappings.", {
    customer_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase
      .from("customers")
      .select("*, contacts:customer_contacts(*), addresses:customer_addresses(*), mappings:customer_product_mappings(*, product:products(id,internal_sku,name))")
      .eq("id", input.customer_id)
      .single()
    if (error) return mcpError("Customer not found")
    return mcpSuccess(data)
  })

  // ── create_customer ────────────────────────────────────────────────────────
  server.tool("create_customer", "Create a new customer.", {
    name: z.string().min(1).max(200),
    currency: z.string().length(3).default("USD"),
    payment_terms: z.string().optional(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { data, error } = await supabase.from("customers").insert({ ...input, created_by: ctx.userId }).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "customers", recordId: data.id, action: "mcp_create", newData: data, ctx })
    return mcpSuccess(data)
  })

  // ── update_customer ────────────────────────────────────────────────────────
  server.tool("update_customer", "Update a customer's details.", {
    customer_id: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    currency: z.string().length(3).optional(),
    payment_terms: z.string().optional(),
    notes: z.string().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { customer_id, ...updates } = input
    const { data: old } = await supabase.from("customers").select("*").eq("id", customer_id).single()
    const { data, error } = await supabase.from("customers").update(updates).eq("id", customer_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "customers", recordId: customer_id, action: "mcp_update", oldData: old ?? undefined, newData: data, ctx })
    return mcpSuccess(data)
  })

  // ── archive_customer ───────────────────────────────────────────────────────
  server.tool("archive_customer", "Archive a customer.", {
    customer_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("customers").update({ status: "archived" }).eq("id", input.customer_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "customers", recordId: input.customer_id, action: "mcp_archive", ctx })
    return mcpSuccess({ archived: true })
  })

  // ── restore_customer ───────────────────────────────────────────────────────
  server.tool("restore_customer", "Restore an archived customer.", {
    customer_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("customers").update({ status: "active" }).eq("id", input.customer_id)
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "customers", recordId: input.customer_id, action: "mcp_restore", ctx })
    return mcpSuccess({ restored: true })
  })

  // ── create_contact ─────────────────────────────────────────────────────────
  server.tool("create_contact", "Add a contact to a customer.", {
    customer_id: z.string().uuid(),
    name: z.string().min(1).max(200),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    is_primary: z.boolean().default(false),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { data, error } = await supabase.from("customer_contacts").insert(input).select().single()
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  // ── update_contact ─────────────────────────────────────────────────────────
  server.tool("update_contact", "Update a customer contact.", {
    contact_id: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    is_primary: z.boolean().optional(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { contact_id, ...updates } = input
    const { data, error } = await supabase.from("customer_contacts").update(updates).eq("id", contact_id).select().single()
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })

  // ── delete_contact ─────────────────────────────────────────────────────────
  server.tool("delete_contact", "Delete a customer contact.", {
    contact_id: z.string().uuid(),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { error } = await supabase.from("customer_contacts").delete().eq("id", input.contact_id)
    if (error) return mcpError(error.message)
    return mcpSuccess({ deleted: true })
  })

  // ── upsert_address ─────────────────────────────────────────────────────────
  server.tool("upsert_address", "Add or update a customer billing/shipping address.", {
    customer_id: z.string().uuid(),
    address_id: z.string().uuid().optional(),
    type: z.enum(["billing", "shipping"]),
    address_line1: z.string().min(1),
    address_line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().min(1),
  }, async (input) => {
    try { requireRole(ctx, "sales") } catch (e: unknown) { return mcpError((e as Error).message) }
    const { address_id, ...payload } = input
    const query = address_id
      ? supabase.from("customer_addresses").update(payload).eq("id", address_id).select().single()
      : supabase.from("customer_addresses").insert(payload).select().single()
    const { data, error } = await query
    if (error) return mcpError(error.message)
    return mcpSuccess(data)
  })
}
