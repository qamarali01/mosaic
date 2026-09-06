"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ActionResult,
  Artisan,
  ArtisanAssignmentWithRelations,
  PaginatedResult,
  PaginationParams,
} from "@/types"
import { artisanSchema } from "@/lib/validations/artisans"
import { logAudit } from "@/lib/utils/audit"

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getArtisans(
  params: PaginationParams = {}
): Promise<PaginatedResult<Artisan>> {
  const supabase = await createClient()
  const { page = 1, pageSize = 20, search = "", status = "all" } = params

  let query = supabase.from("artisans").select("*", { count: "exact" })

  if (status !== "all") query = query.eq("status", status)
  if (search) query = query.ilike("name", `%${search}%`)

  const from = (page - 1) * pageSize
  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1)

  if (error) return { data: [], total: 0, page, pageSize, totalPages: 0 }

  const total = count ?? 0
  return {
    data: (data ?? []) as Artisan[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getArtisan(
  id: string
): Promise<(Artisan & { assignments: ArtisanAssignmentWithRelations[] }) | null> {
  const supabase = await createClient()
  const { data: artisan } = await supabase
    .from("artisans")
    .select("*")
    .eq("id", id)
    .single()

  if (!artisan) return null

  const { data: assignments } = await supabase
    .from("artisan_assignments")
    .select(
      `*, artisan:artisans(id, name), order:orders(id, order_number, status), order_item:order_items(*, product:products(id, internal_sku, name))`
    )
    .eq("artisan_id", id)
    .order("created_at", { ascending: false })

  return {
    ...(artisan as Artisan),
    assignments: (assignments ?? []) as ArtisanAssignmentWithRelations[],
  }
}

export async function getAllArtisans(): Promise<Artisan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artisans")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })
  return (data ?? []) as Artisan[]
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createArtisan(
  formData: FormData
): Promise<ActionResult<Artisan>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const raw = {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    location: (formData.get("location") as string) || null,
    specializations: (formData.get("specializations") as string) || null,
    notes: (formData.get("notes") as string) || null,
  }

  const parsed = artisanSchema.safeParse(raw)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message }

  const { data, error } = await supabase
    .from("artisans")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(supabase, {
    tableName: "artisans",
    recordId: data.id,
    action: "create",
    newData: data,
    performedBy: user.id,
  })
  revalidatePath("/artisans")
  return { success: true, data: data as Artisan }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateArtisan(
  id: string,
  formData: FormData
): Promise<ActionResult<Artisan>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const raw = {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    location: (formData.get("location") as string) || null,
    specializations: (formData.get("specializations") as string) || null,
    notes: (formData.get("notes") as string) || null,
  }

  const parsed = artisanSchema.safeParse(raw)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message }

  const { data: old } = await supabase
    .from("artisans")
    .select("*")
    .eq("id", id)
    .single()

  const { data, error } = await supabase
    .from("artisans")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(supabase, {
    tableName: "artisans",
    recordId: id,
    action: "update",
    oldData: old,
    newData: data,
    performedBy: user.id,
  })
  revalidatePath("/artisans")
  revalidatePath(`/artisans/${id}`)
  return { success: true, data: data as Artisan }
}

// ─── Archive / Restore ────────────────────────────────────────────────────────

export async function archiveArtisan(id: string): Promise<ActionResult<Artisan>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("artisans")
    .update({ status: "archived" })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(supabase, {
    tableName: "artisans",
    recordId: id,
    action: "archive",
    newData: { status: "archived" },
    performedBy: user.id,
  })
  revalidatePath("/artisans")
  revalidatePath(`/artisans/${id}`)
  return { success: true, data: data as Artisan }
}

export async function restoreArtisan(id: string): Promise<ActionResult<Artisan>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data, error } = await supabase
    .from("artisans")
    .update({ status: "active" })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(supabase, {
    tableName: "artisans",
    recordId: id,
    action: "restore",
    newData: { status: "active" },
    performedBy: user.id,
  })
  revalidatePath("/artisans")
  revalidatePath(`/artisans/${id}`)
  return { success: true, data: data as Artisan }
}
