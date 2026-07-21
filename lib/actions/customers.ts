"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ActionResult,
  Customer,
  CustomerWithRelations,
  CustomerContact,
  CustomerAddress,
  CustomerProductMapping,
  CustomerProductMappingWithRelations,
  PaginatedResult,
  PaginationParams,
} from "@/types"
import { customerSchema, contactSchema, addressSchema } from "@/lib/validations/customers"
import { mappingSchema } from "@/lib/validations/mappings"
import { logAudit } from "@/lib/utils/audit"

// ─── Customers ────────────────────────────────────────────────────────────────

export async function getCustomers(
  params: PaginationParams = {}
): Promise<PaginatedResult<Customer>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 20, search = "", status = "all" } = params

  let query = supabase.from("customers").select("*", { count: "exact" })

  if (status !== "all") query = query.eq("status", status)
  if (search) query = query.ilike("name", `%${search}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1)

  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 }

  const total = count ?? 0
  return { data: data ?? [], total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export async function getCustomer(id: string): Promise<CustomerWithRelations | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select(`*, contacts:customer_contacts(*), addresses:customer_addresses(*)`)
    .eq("id", id)
    .single()
  return data as CustomerWithRelations | null
}

export async function getAllCustomers(): Promise<Pick<Customer, "id" | "name" | "currency">[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customers")
    .select("id, name, currency")
    .eq("status", "active")
    .order("name")
  return (data ?? []) as Pick<Customer, "id" | "name" | "currency">[]
}

export async function createCustomer(formData: FormData): Promise<ActionResult<Customer>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency") || "USD",
    payment_terms: formData.get("payment_terms") || null,
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "customers", recordId: data.id, action: "create", newData: data, performedBy: user.id })
  revalidatePath("/customers")
  return { success: true, data }
}

export async function updateCustomer(id: string, formData: FormData): Promise<ActionResult<Customer>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency") || "USD",
    payment_terms: formData.get("payment_terms") || null,
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data, error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "customers", recordId: id, action: "update", newData: data, performedBy: user?.id ?? null })
  revalidatePath("/customers")
  revalidatePath(`/customers/${id}`)
  return { success: true, data }
}

export async function archiveCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from("customers").update({ status: "archived" }).eq("id", id)
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "customers", recordId: id, action: "archive", performedBy: user?.id ?? null })
  revalidatePath("/customers")
  return { success: true, data: undefined }
}

export async function restoreCustomer(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from("customers").update({ status: "active" }).eq("id", id)
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "customers", recordId: id, action: "restore", performedBy: user?.id ?? null })
  revalidatePath("/customers")
  return { success: true, data: undefined }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function createContact(customerId: string, formData: FormData): Promise<ActionResult<CustomerContact>> {
  const supabase = await createClient()

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    title: formData.get("title") || null,
    is_primary: formData.get("is_primary") === "true",
  })

  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data, error } = await supabase
    .from("customer_contacts")
    .insert({ ...parsed.data, customer_id: customerId })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return { success: true, data }
}

export async function updateContact(id: string, customerId: string, formData: FormData): Promise<ActionResult<CustomerContact>> {
  const supabase = await createClient()

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    title: formData.get("title") || null,
    is_primary: formData.get("is_primary") === "true",
  })

  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  const { data, error } = await supabase
    .from("customer_contacts")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return { success: true, data }
}

export async function deleteContact(id: string, customerId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("customer_contacts").delete().eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return { success: true, data: undefined }
}

// ─── Addresses ────────────────────────────────────────────────────────────────

export async function upsertAddress(customerId: string, addressId: string | null, formData: FormData): Promise<ActionResult<CustomerAddress>> {
  const supabase = await createClient()

  const parsed = addressSchema.safeParse({
    type: formData.get("type"),
    address_line1: formData.get("address_line1"),
    address_line2: formData.get("address_line2") || null,
    city: formData.get("city"),
    state: formData.get("state") || null,
    postal_code: formData.get("postal_code") || null,
    country: formData.get("country"),
  })

  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  const payload = { ...parsed.data, customer_id: customerId }

  const query = addressId
    ? supabase.from("customer_addresses").update(parsed.data).eq("id", addressId).select().single()
    : supabase.from("customer_addresses").insert(payload).select().single()

  const { data, error } = await query
  if (error) return { success: false, error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return { success: true, data }
}

export async function deleteAddress(id: string, customerId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("customer_addresses").delete().eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/customers/${customerId}`)
  return { success: true, data: undefined }
}

// ─── Customer Product Mappings ────────────────────────────────────────────────

export async function getMappingsByCustomer(customerId: string): Promise<CustomerProductMappingWithRelations[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customer_product_mappings")
    .select(`*, customer:customers(id, name), product:products(id, internal_sku, name)`)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
  return (data ?? []) as CustomerProductMappingWithRelations[]
}

export async function getMappingsByProduct(productId: string): Promise<CustomerProductMappingWithRelations[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customer_product_mappings")
    .select(`*, customer:customers(id, name, currency), product:products(id, internal_sku, name)`)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
  return (data ?? []) as CustomerProductMappingWithRelations[]
}

export async function getMappingForCustomerProduct(customerId: string, productId: string): Promise<CustomerProductMapping | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("customer_product_mappings")
    .select("*")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .single()
  return data
}

export async function upsertMapping(
  customerId: string,
  productId: string,
  mappingId: string | null,
  formData: FormData
): Promise<ActionResult<CustomerProductMapping>> {
  const supabase = await createClient()

  const parsed = mappingSchema.safeParse({
    customer_sku: formData.get("customer_sku"),
    customer_description: formData.get("customer_description") || null,
    price: formData.get("price"),
    currency: formData.get("currency") || "USD",
    moq: formData.get("moq") || null,
    lead_time: formData.get("lead_time") || null,
    packaging_notes: formData.get("packaging_notes") || null,
  })

  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }

  const payload = { ...parsed.data, customer_id: customerId, product_id: productId }

  const query = mappingId
    ? supabase.from("customer_product_mappings").update(parsed.data).eq("id", mappingId).select().single()
    : supabase.from("customer_product_mappings").insert(payload).select().single()

  const { data, error } = await query
  if (error) {
    if (error.code === "23505") return { success: false, error: "Mapping already exists for this customer/product pair" }
    return { success: false, error: error.message }
  }

  revalidatePath(`/customers/${customerId}`)
  revalidatePath(`/products/${productId}`)
  return { success: true, data }
}

export async function deleteMapping(id: string, customerId: string, productId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("customer_product_mappings").delete().eq("id", id)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/customers/${customerId}`)
  revalidatePath(`/products/${productId}`)
  return { success: true, data: undefined }
}
