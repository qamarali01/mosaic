"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ActionResult,
  Order,
  OrderWithRelations,
  OrderStatus,
  OrderNumberType,
  QuoteWithRelations,
  PaginatedResult,
  PaginationParams,
} from "@/types"
import { generateSystemNumber } from "@/lib/utils"
import { logAudit } from "@/lib/utils/audit"

export async function getOrders(
  params: PaginationParams & { status?: OrderStatus | "all" } = {}
): Promise<PaginatedResult<OrderWithRelations>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 20, search = "", status = "all" } = params

  let query = supabase
    .from("orders")
    .select(`*, customer:customers(id, name), quote:quotes(id, quote_number), items:order_items(*, product:products(id, internal_sku, name))`, { count: "exact" })

  if (status !== "all") query = query.eq("status", status)
  if (search) query = query.or(`order_number.ilike.%${search}%,system_number.ilike.%${search}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 }

  const total = count ?? 0
  return { data: (data ?? []) as OrderWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getOrder(id: string): Promise<OrderWithRelations | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("orders")
    .select(`*, customer:customers(id, name, currency, payment_terms), quote:quotes(id, quote_number), items:order_items(*, product:products(id, internal_sku, name)), assignments:artisan_assignments(*, artisan:artisans(id, name)), shipments:order_shipments(*), export_documents(*)`)
    .eq("id", id)
    .single()
  return data as OrderWithRelations | null
}

export async function createOrder(payload: {
  customer_id: string
  order_number: string
  order_number_type?: OrderNumberType
  quote_id?: string | null
  notes?: string | null
  items: Array<{
    product_id: string
    customer_sku: string
    customer_description?: string | null
    quantity: number
    unit_price: number
    currency: string
    sort_order: number
  }>
}): Promise<ActionResult<Order>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }
  if (!payload.order_number.trim()) return { success: false, error: "Order Number is required" }

  const system_number = generateSystemNumber()

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
       system_number,
       order_number: payload.order_number.trim(),
       order_number_type: payload.order_number_type ?? "other",
      customer_id: payload.customer_id,
      quote_id: payload.quote_id ?? null,
      notes: payload.notes ?? null,
      status: "pending",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  if (payload.items.length > 0) {
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(payload.items.map((item) => ({ ...item, order_id: order.id })))

    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id)
      return { success: false, error: itemsError.message }
    }
  }

  // Mark quote as accepted if created from a quote
  if (payload.quote_id) {
    await supabase.from("quotes").update({ status: "accepted" }).eq("id", payload.quote_id)
    revalidatePath("/quotes")
  }

  revalidatePath("/orders")
  await logAudit(supabase, { tableName: "orders", recordId: order.id, action: "create", newData: order, performedBy: user.id })
  return { success: true, data: order }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<ActionResult<Order>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  const { data: { user } } = await supabase.auth.getUser()
  await logAudit(supabase, { tableName: "orders", recordId: id, action: "update", newData: { status }, performedBy: user?.id ?? null })
  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  return { success: true, data }
}

export async function updateOrderNumber(
  id: string,
  orderNumber: string,
  orderNumberType: OrderNumberType
): Promise<ActionResult<Order>> {
  const normalizedNumber = orderNumber.trim()
  if (!normalizedNumber) return { success: false, error: "Order Number is required" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: old } = await supabase.from("orders").select("*").eq("id", id).single()
  if (!old) return { success: false, error: "Order not found" }
  const { data, error } = await supabase
    .from("orders")
    .update({ order_number: normalizedNumber, order_number_type: orderNumberType })
    .eq("id", id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }

  await logAudit(supabase, { tableName: "orders", recordId: id, action: "update", oldData: old, newData: data, performedBy: user.id })
  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  return { success: true, data }
}

export async function updateOrder(
  id: string,
  payload: {
    order_number: string
    order_number_type: OrderNumberType
    notes?: string | null
    items: Array<{
      product_id: string
      customer_sku: string
      customer_description?: string | null
      quantity: number
      unit_price: number
      currency: string
      sort_order: number
    }>
  }
): Promise<ActionResult<Order>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }
  if (!payload.order_number.trim()) return { success: false, error: "Order Number is required" }

  const { data: old } = await supabase.from("orders").select("*").eq("id", id).single()

  const { data, error } = await supabase
    .from("orders")
    .update({ order_number: payload.order_number.trim(), order_number_type: payload.order_number_type, notes: payload.notes ?? null })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Replace all line items (delete + re-insert)
  await supabase.from("order_items").delete().eq("order_id", id)
  if (payload.items.length > 0) {
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(payload.items.map((item) => ({ ...item, order_id: id })))
    if (itemsError) return { success: false, error: itemsError.message }
  }

  await logAudit(supabase, {
    tableName: "orders",
    recordId: id,
    action: "update",
    oldData: old,
    newData: { ...data, notes: payload.notes, order_number: payload.order_number, order_number_type: payload.order_number_type },
    performedBy: user.id,
  })
  revalidatePath("/orders")
  revalidatePath(`/orders/${id}`)
  return { success: true, data }
}

export async function createOrderFromQuote(quote: QuoteWithRelations): Promise<ActionResult<Order>> {
  return createOrder({
    customer_id: quote.customer_id,
    order_number: quote.quote_number,
    order_number_type: "other",
    quote_id: quote.id,
    notes: `Created from quote ${quote.quote_number}`,
    items: quote.items.map((item, i) => ({
      product_id: item.product_id,
      customer_sku: item.customer_sku,
      customer_description: item.customer_description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency: item.currency,
      sort_order: i,
    })),
  })
}
