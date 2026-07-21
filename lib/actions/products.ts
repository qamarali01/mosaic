"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ActionResult,
  Product,
  ProductWithRelations,
  ProductImage,
  ProductDocument,
  PaginatedResult,
  PaginationParams,
} from "@/types"
import { productSchema } from "@/lib/validations/products"

export async function getProducts(
  params: PaginationParams = {}
): Promise<PaginatedResult<ProductWithRelations>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 20, search = "", status = "all" } = params

  let query = supabase
    .from("products")
    .select(
      `*, collection:collections(id, name), images:product_images(id, url, storage_path, sort_order), documents:product_documents(id, name, url, storage_path, file_size, mime_type)`,
      { count: "exact" }
    )

  if (status !== "all") query = query.eq("status", status)
  if (search) {
    query = query.or(`name.ilike.%${search}%,internal_sku.ilike.%${search}%`)
  }

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 }

  const total = count ?? 0
  return {
    data: (data ?? []) as ProductWithRelations[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getProduct(id: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("products")
    .select(
      `*, collection:collections(id, name, cover_image_url), images:product_images(id, url, storage_path, sort_order), documents:product_documents(id, name, url, storage_path, file_size, mime_type)`
    )
    .eq("id", id)
    .single()
  return data as ProductWithRelations | null
}

export async function createProduct(
  payload: {
    internal_sku: string
    name: string
    description?: string | null
    collection_id?: string | null
    images: Array<{ url: string; storage_path: string; sort_order: number }>
    documents: Array<{ name: string; url: string; storage_path: string; file_size?: number | null; mime_type?: string | null }>
  }
): Promise<ActionResult<Product>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const parsed = productSchema.safeParse(payload)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      internal_sku: payload.internal_sku,
      name: payload.name,
      description: payload.description ?? null,
      collection_id: payload.collection_id ?? null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") return { success: false, error: "SKU already exists" }
    return { success: false, error: error.message }
  }

  // Insert images
  if (payload.images.length > 0) {
    await supabase.from("product_images").insert(
      payload.images.map((img) => ({ ...img, product_id: product.id }))
    )
  }

  // Insert documents
  if (payload.documents.length > 0) {
    await supabase.from("product_documents").insert(
      payload.documents.map((doc) => ({ ...doc, product_id: product.id }))
    )
  }

  revalidatePath("/products")
  return { success: true, data: product }
}

export async function updateProduct(
  id: string,
  payload: {
    internal_sku: string
    name: string
    description?: string | null
    collection_id?: string | null
    images: Array<{ id?: string; url: string; storage_path: string; sort_order: number }>
    documents: Array<{ id?: string; name: string; url: string; storage_path: string; file_size?: number | null; mime_type?: string | null }>
  }
): Promise<ActionResult<Product>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: product, error } = await supabase
    .from("products")
    .update({
      internal_sku: payload.internal_sku,
      name: payload.name,
      description: payload.description ?? null,
      collection_id: payload.collection_id ?? null,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") return { success: false, error: "SKU already exists" }
    return { success: false, error: error.message }
  }

  // Replace images
  await supabase.from("product_images").delete().eq("product_id", id)
  if (payload.images.length > 0) {
    await supabase.from("product_images").insert(
      payload.images.map((img, i) => ({
        url: img.url,
        storage_path: img.storage_path,
        sort_order: i,
        product_id: id,
      }))
    )
  }

  // Replace documents
  await supabase.from("product_documents").delete().eq("product_id", id)
  if (payload.documents.length > 0) {
    await supabase.from("product_documents").insert(
      payload.documents.map((doc) => ({
        name: doc.name,
        url: doc.url,
        storage_path: doc.storage_path,
        file_size: doc.file_size ?? null,
        mime_type: doc.mime_type ?? null,
        product_id: id,
      }))
    )
  }

  revalidatePath("/products")
  revalidatePath(`/products/${id}`)
  return { success: true, data: product }
}

export async function archiveProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/products")
  return { success: true, data: undefined }
}

export async function restoreProduct(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("products")
    .update({ status: "active" })
    .eq("id", id)

  if (error) return { success: false, error: error.message }
  revalidatePath("/products")
  return { success: true, data: undefined }
}
