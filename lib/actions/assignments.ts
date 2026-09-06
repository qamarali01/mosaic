"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  ActionResult,
  ArtisanAssignment,
  ArtisanAssignmentWithRelations,
  AssignmentStatus,
} from "@/types"
import { assignmentSchema } from "@/lib/validations/artisans"
import { logAudit } from "@/lib/utils/audit"

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAssignmentsByOrder(
  orderId: string
): Promise<ArtisanAssignmentWithRelations[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artisan_assignments")
    .select(
      `*, artisan:artisans(id, name), order:orders(id, order_number, status), order_item:order_items(*, product:products(id, internal_sku, name))`
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
  return (data ?? []) as ArtisanAssignmentWithRelations[]
}

export async function getAssignmentsByArtisan(
  artisanId: string
): Promise<ArtisanAssignmentWithRelations[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("artisan_assignments")
    .select(
      `*, artisan:artisans(id, name), order:orders(id, order_number, status), order_item:order_items(*, product:products(id, internal_sku, name))`
    )
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false })
  return (data ?? []) as ArtisanAssignmentWithRelations[]
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createAssignment(payload: {
  order_id: string
  order_item_id: string
  artisan_id: string
  quantity: number
  rate?: number | null
  expected_delivery_date?: string | null
  notes?: string | null
}): Promise<ActionResult<ArtisanAssignment>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const parsed = assignmentSchema.safeParse(payload)
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message }

  // Validate that assigned quantity doesn't exceed remaining unassigned qty
  const { data: orderItem } = await supabase
    .from("order_items")
    .select("quantity")
    .eq("id", payload.order_item_id)
    .single()

  if (!orderItem) return { success: false, error: "Order item not found" }

  const { data: existingAssignments } = await supabase
    .from("artisan_assignments")
    .select("quantity")
    .eq("order_item_id", payload.order_item_id)
    .not("status", "eq", "cancelled")

  const alreadyAssigned = (existingAssignments ?? []).reduce(
    (sum, a) => sum + a.quantity,
    0
  )
  const remaining = orderItem.quantity - alreadyAssigned

  if (payload.quantity > remaining) {
    return {
      success: false,
      error: `Only ${remaining} unit(s) remaining to assign for this line item`,
    }
  }

  const { data, error } = await supabase
    .from("artisan_assignments")
    .insert({
      order_id: payload.order_id,
      order_item_id: payload.order_item_id,
      artisan_id: payload.artisan_id,
      quantity: payload.quantity,
      rate: payload.rate ?? null,
      expected_delivery_date: payload.expected_delivery_date ?? null,
      notes: payload.notes ?? null,
      status: "pending",
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(supabase, {
    tableName: "artisan_assignments",
    recordId: data.id,
    action: "create",
    newData: data,
    performedBy: user.id,
  })

  revalidatePath(`/orders/${payload.order_id}`)
  revalidatePath("/artisans")
  return { success: true, data: data as ArtisanAssignment }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateAssignment(
  id: string,
  payload: {
    quantity?: number
    rate?: number | null
    expected_delivery_date?: string | null
    actual_delivery_date?: string | null
    notes?: string | null
  }
): Promise<ActionResult<ArtisanAssignment>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  // If updating quantity, re-validate remaining capacity
  if (payload.quantity !== undefined) {
    const { data: current } = await supabase
      .from("artisan_assignments")
      .select("quantity, order_item_id, status")
      .eq("id", id)
      .single()

    if (!current) return { success: false, error: "Assignment not found" }

    const { data: orderItem } = await supabase
      .from("order_items")
      .select("quantity")
      .eq("id", current.order_item_id)
      .single()

    if (!orderItem) return { success: false, error: "Order item not found" }

    const { data: others } = await supabase
      .from("artisan_assignments")
      .select("quantity")
      .eq("order_item_id", current.order_item_id)
      .neq("id", id)
      .not("status", "eq", "cancelled")

    const otherQty = (others ?? []).reduce((sum, a) => sum + a.quantity, 0)
    const maxAllowed = orderItem.quantity - otherQty

    if (payload.quantity > maxAllowed) {
      return {
        success: false,
        error: `Maximum assignable quantity for this line item is ${maxAllowed}`,
      }
    }
  }

  const { data: old } = await supabase
    .from("artisan_assignments")
    .select("*")
    .eq("id", id)
    .single()

  const { data, error } = await supabase
    .from("artisan_assignments")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await logAudit(supabase, {
    tableName: "artisan_assignments",
    recordId: id,
    action: "update",
    oldData: old,
    newData: data,
    performedBy: user.id,
  })

  revalidatePath(`/orders/${data.order_id}`)
  revalidatePath("/artisans")
  return { success: true, data: data as ArtisanAssignment }
}

// ─── Update Status ────────────────────────────────────────────────────────────

export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus
): Promise<ActionResult<ArtisanAssignment>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const updatePayload: Record<string, unknown> = { status }
  // Auto-set actual delivery date when completing
  if (status === "completed") {
    updatePayload.actual_delivery_date = new Date().toISOString().split("T")[0]
  }

  const { data, error } = await supabase
    .from("artisan_assignments")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Auto-transition order confirmed → in_production when first assignment goes in_progress
  if (status === "in_progress") {
    const { data: order } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", data.order_id)
      .single()

    if (order?.status === "confirmed") {
      await supabase
        .from("orders")
        .update({ status: "in_production" })
        .eq("id", data.order_id)

      await logAudit(supabase, {
        tableName: "orders",
        recordId: data.order_id,
        action: "update",
        newData: { status: "in_production" },
        performedBy: user.id,
      })
    }
  }

  await logAudit(supabase, {
    tableName: "artisan_assignments",
    recordId: id,
    action: "update",
    newData: { status },
    performedBy: user.id,
  })

  revalidatePath(`/orders/${data.order_id}`)
  revalidatePath("/artisans")
  return { success: true, data: data as ArtisanAssignment }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAssignment(
  id: string,
  orderId: string
): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Not authenticated" }

  const { error } = await supabase
    .from("artisan_assignments")
    .delete()
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath("/artisans")
  return { success: true, data: undefined }
}
