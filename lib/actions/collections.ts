"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { ActionResult, Collection, PaginatedResult, PaginationParams } from "@/types"
import { collectionSchema } from "@/lib/validations/collections"

export async function getCollections(
  params: PaginationParams = {}
): Promise<PaginatedResult<Collection>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 20, search = "", status = "all" } = params

  let query = supabase.from("collections").select("*", { count: "exact" })

  if (status !== "all") query = query.eq("status", status)
  if (search) query = query.ilike("name", `%${search}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 }

  const total = count ?? 0
  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getCollection(id: string): Promise<Collection | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single()
  return data
}

export async function createCollection(
  formData: FormData
): Promise<ActionResult<Collection>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const parsed = collectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    cover_image_url: formData.get("cover_image_url") || null,
    cover_image_path: formData.get("cover_image_path") || null,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/collections")
  return { success: true, data }
}

export async function updateCollection(
  id: string,
  formData: FormData
): Promise<ActionResult<Collection>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const parsed = collectionSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    cover_image_url: formData.get("cover_image_url") || null,
    cover_image_path: formData.get("cover_image_path") || null,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation error" }
  }

  const { data, error } = await supabase
    .from("collections")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath("/collections")
  revalidatePath(`/collections/${id}`)
  return { success: true, data }
}

export async function archiveCollection(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("collections")
    .update({ status: "archived" })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/collections")
  return { success: true, data: undefined }
}

export async function restoreCollection(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("collections")
    .update({ status: "active" })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/collections")
  return { success: true, data: undefined }
}

export async function getAllCollections(): Promise<Pick<Collection, "id" | "name">[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("collections")
    .select("id, name")
    .eq("status", "active")
    .order("name")
  return (data ?? []) as Pick<Collection, "id" | "name">[]
}
