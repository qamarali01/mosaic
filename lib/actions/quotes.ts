"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ActionResult,
  Quote,
  QuoteWithRelations,
  QuoteStatus,
  PaginatedResult,
  PaginationParams,
} from "@/types"
import { generateQuoteNumber } from "@/lib/utils"

export async function getQuotes(
  params: PaginationParams & { status?: QuoteStatus | "all" } = {}
): Promise<PaginatedResult<QuoteWithRelations>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 20, search = "", status = "all" } = params

  let query = supabase
    .from("quotes")
    .select(`*, customer:customers(id, name, currency), items:quote_items(*, product:products(id, internal_sku, name))`, { count: "exact" })

  if (status !== "all") query = query.eq("status", status)
  if (search) query = query.ilike("quote_number", `%${search}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 }

  const total = count ?? 0
  return { data: (data ?? []) as QuoteWithRelations[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getQuote(id: string): Promise<QuoteWithRelations | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("quotes")
    .select(`*, customer:customers(id, name, currency, payment_terms), items:quote_items(*, product:products(id, internal_sku, name))`)
    .eq("id", id)
    .single()
  return data as QuoteWithRelations | null
}

export async function createQuote(payload: {
  customer_id: string
  notes?: string | null
  valid_until?: string | null
  items: Array<{
    product_id: string
    customer_sku: string
    customer_description?: string | null
    unit_price: number
    currency: string
    quantity: number
    moq?: number | null
    lead_time?: string | null
    sort_order: number
  }>
}): Promise<ActionResult<Quote>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const quote_number = generateQuoteNumber()

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      quote_number,
      customer_id: payload.customer_id,
      notes: payload.notes ?? null,
      valid_until: payload.valid_until ?? null,
      created_by: user.id,
      status: "draft",
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  if (payload.items.length > 0) {
    const { error: itemsError } = await supabase
      .from("quote_items")
      .insert(payload.items.map((item) => ({ ...item, quote_id: quote.id })))

    if (itemsError) {
      await supabase.from("quotes").delete().eq("id", quote.id)
      return { success: false, error: itemsError.message }
    }
  }

  revalidatePath("/quotes")
  return { success: true, data: quote }
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus
): Promise<ActionResult<Quote>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath("/quotes")
  revalidatePath(`/quotes/${id}`)
  return { success: true, data }
}

export async function updateQuote(
  id: string,
  payload: {
    notes?: string | null
    valid_until?: string | null
    items: Array<{
      product_id: string
      customer_sku: string
      customer_description?: string | null
      unit_price: number
      currency: string
      quantity: number
      moq?: number | null
      lead_time?: string | null
      sort_order: number
    }>
  }
): Promise<ActionResult<Quote>> {
  const supabase = await createClient()

  const { data: quote, error } = await supabase
    .from("quotes")
    .update({ notes: payload.notes ?? null, valid_until: payload.valid_until ?? null })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.from("quote_items").delete().eq("quote_id", id)
  if (payload.items.length > 0) {
    await supabase.from("quote_items").insert(
      payload.items.map((item) => ({ ...item, quote_id: id }))
    )
  }

  revalidatePath("/quotes")
  revalidatePath(`/quotes/${id}`)
  return { success: true, data: quote }
}
