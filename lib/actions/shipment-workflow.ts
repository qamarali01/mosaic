"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/utils/audit"
import type { ActionResult, GeneratedDocumentKind } from "@/types"

const cartonSchema = z.object({
  carton_number: z.string().trim().min(1).max(50),
  quantity: z.number().int().positive().default(1),
  length: z.number().nonnegative().nullable().optional(),
  width: z.number().nonnegative().nullable().optional(),
  height: z.number().nonnegative().nullable().optional(),
  dimension_unit: z.string().trim().max(10).default("in"),
  gross_weight_kg: z.number().nonnegative(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(z.object({ order_item_id: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
})

const packingProposalSchema = z.object({
  shipment_id: z.string().uuid(),
  source_filename: z.string().max(255).nullable().optional(),
  extraction_notes: z.string().max(5000).nullable().optional(),
  cartons: z.array(cartonSchema).min(1),
})

async function authenticate() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function preparePackingProposal(input: z.input<typeof packingProposalSchema>): Promise<ActionResult<{ id: string; revision: number; warnings: string[] }>> {
  const parsed = packingProposalSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid packing proposal" }
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: shipment } = await supabase.from("shipments").select("id, customer_id").eq("id", parsed.data.shipment_id).single()
  if (!shipment) return { success: false, error: "Shipment not found" }
  const { data: memberships } = await supabase.from("shipment_orders").select("order_id, orders!inner(customer_id)").eq("shipment_id", shipment.id)
  if (!memberships?.length) return { success: false, error: "Add at least one order to the shipment first" }

  const orderIds = memberships.map((row) => row.order_id)
  const { data: orderItems } = await supabase.from("order_items").select("id, order_id").in("order_id", orderIds)
  const validItems = new Map((orderItems ?? []).map((item) => [item.id, item.order_id]))
  const warnings: string[] = []
  for (const carton of parsed.data.cartons) {
    for (const item of carton.items) {
      if (!validItems.has(item.order_item_id)) warnings.push(`Item ${item.order_item_id} is not part of this shipment`)
    }
  }
  const { data: latest } = await supabase.from("packing_proposals").select("revision").eq("shipment_id", shipment.id).order("revision", { ascending: false }).limit(1).maybeSingle()
  const revision = (latest?.revision ?? 0) + 1
  const { data, error } = await supabase.from("packing_proposals").insert({
    shipment_id: shipment.id,
    revision,
    source_filename: parsed.data.source_filename ?? null,
    extraction_notes: parsed.data.extraction_notes ?? null,
    extracted_data: { cartons: parsed.data.cartons, order_ids: orderIds },
    created_by: user.id,
  }).select("id, revision").single()
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "packing_proposals", recordId: data.id, action: "create", newData: data, performedBy: user.id })
  revalidatePath(`/shipments/${shipment.id}`)
  return { success: true, data: { ...data, warnings } }
}

export async function confirmPackingProposal(proposalId: string): Promise<ActionResult<{ shipment_id: string; carton_count: number }>> {
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }
  const { data: proposal } = await supabase.from("packing_proposals").select("*").eq("id", proposalId).single()
  if (!proposal || proposal.status !== "pending_review") return { success: false, error: "Packing proposal is not awaiting review" }
  const extracted = proposal.extracted_data as { cartons?: Array<z.infer<typeof cartonSchema>> }
  if (!extracted.cartons?.length) return { success: false, error: "Packing proposal has no cartons" }

  const { data: memberships } = await supabase.from("shipment_orders").select("order_id").eq("shipment_id", proposal.shipment_id)
  const orderIds = (memberships ?? []).map((row) => row.order_id)
  const { data: orderItems } = await supabase.from("order_items").select("id").in("order_id", orderIds)
  const valid = new Set((orderItems ?? []).map((item) => item.id))
  if (extracted.cartons.some((carton) => carton.items.some((item) => !valid.has(item.order_item_id)))) return { success: false, error: "Packing proposal contains an item outside this shipment" }

  const { data: cartons, error: cartonError } = await supabase.from("shipment_cartons").insert(extracted.cartons.map((carton) => ({
    shipment_id: proposal.shipment_id,
    carton_number: carton.carton_number,
    quantity: carton.quantity,
    length: carton.length ?? null,
    width: carton.width ?? null,
    height: carton.height ?? null,
    dimension_unit: carton.dimension_unit,
    gross_weight_kg: carton.gross_weight_kg,
    tare_weight_kg: 2.5,
    notes: carton.notes ?? null,
  }))).select("id, carton_number")
  if (cartonError || !cartons) return { success: false, error: cartonError?.message ?? "Could not save cartons" }
  const cartonItems = cartons.flatMap((saved, index) => extracted.cartons![index].items.map((item) => ({ carton_id: saved.id, order_item_id: item.order_item_id, quantity: item.quantity })))
  const { error: itemError } = await supabase.from("shipment_carton_items").insert(cartonItems)
  if (itemError) return { success: false, error: itemError.message }
  const { error } = await supabase.from("packing_proposals").update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: user.id }).eq("id", proposalId)
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "packing_proposals", recordId: proposalId, action: "update", newData: { status: "confirmed" }, performedBy: user.id })
  revalidatePath(`/shipments/${proposal.shipment_id}`)
  return { success: true, data: { shipment_id: proposal.shipment_id, carton_count: cartons.length } }
}

export async function queueGeneratedDocument(input: { kind: GeneratedDocumentKind; quoteId?: string; shipmentId?: string; proposalId?: string }): Promise<ActionResult<{ id: string; status: string }>> {
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }
  if (input.kind === "packing_list" && !input.proposalId) return { success: false, error: "A confirmed packing proposal is required" }
  if (input.kind === "proforma" && !input.quoteId) return { success: false, error: "A quote is required" }
  if (input.kind === "commercial_invoice" && !input.shipmentId) return { success: false, error: "A shipment is required" }
  const sourceSnapshot = { quote_id: input.quoteId ?? null, shipment_id: input.shipmentId ?? null, proposal_id: input.proposalId ?? null, queued_at: new Date().toISOString() }
  const { data, error } = await supabase.from("generated_documents").insert({ kind: input.kind, quote_id: input.quoteId ?? null, shipment_id: input.shipmentId ?? null, proposal_id: input.proposalId ?? null, source_snapshot: sourceSnapshot, created_by: user.id }).select("id, status").single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}
