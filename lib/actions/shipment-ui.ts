"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { confirmPackingProposal, preparePackingProposal, queueGeneratedDocument } from "@/lib/actions/shipment-workflow"
import type { ActionResult, Order, Shipment, ShipmentCarton } from "@/types"

export interface ShipmentListItem extends Shipment {
  customer: { name: string }
  order_count: number
  carton_count: number
}

export interface ShipmentWorkspace extends Shipment {
  customer: { id: string; name: string; currency: string; payment_terms: string | null }
  orders: Array<Order & { items: Array<{ id: string; customer_sku: string; quantity: number; product: { name: string; internal_sku: string } }> }>
  cartons: Array<ShipmentCarton & { items: Array<{ order_item_id: string; quantity: number; customer_sku: string; product_name: string }> }>
  documents: Array<{ id: string; kind: string; status: string; xlsx_storage_path: string | null; pdf_storage_path: string | null; error_message: string | null; created_at: string }>
}

const shipmentInputSchema = z.object({
  shipment_number: z.string().trim().min(1).max(100),
  customer_id: z.string().uuid(),
  order_ids: z.array(z.string().uuid()).min(1),
  transport_mode: z.string().trim().max(50).nullable().optional(),
  shipment_date: z.string().date().nullable().optional(),
  place_of_receipt: z.string().trim().max(200).nullable().optional(),
  port_of_loading: z.string().trim().max(200).nullable().optional(),
  port_of_discharge: z.string().trim().max(200).nullable().optional(),
  final_destination: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
})

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function getShipments(): Promise<ShipmentListItem[]> {
  const { supabase } = await auth()
  const { data } = await supabase.from("shipments").select("*, customer:customers(name), shipment_orders(order_id), shipment_cartons(id)").order("created_at", { ascending: false })
  return (data ?? []).map((row) => ({
    ...row,
    customer: row.customer as { name: string },
    order_count: Array.isArray(row.shipment_orders) ? row.shipment_orders.length : 0,
    carton_count: Array.isArray(row.shipment_cartons) ? row.shipment_cartons.length : 0,
  })) as ShipmentListItem[]
}

export async function getShipmentWorkspace(id: string): Promise<ShipmentWorkspace | null> {
  const { supabase } = await auth()
  const { data: shipment } = await supabase.from("shipments").select("*, customer:customers(id,name,currency,payment_terms)").eq("id", id).single()
  if (!shipment) return null
  const { data: memberships } = await supabase.from("shipment_orders").select("order_id").eq("shipment_id", id)
  const orderIds = (memberships ?? []).map((row) => row.order_id)
  const [{ data: orders }, { data: cartons }, { data: documents }] = await Promise.all([
    supabase.from("orders").select("*, items:order_items(id,customer_sku,quantity,product:products(name,internal_sku))").in("id", orderIds).order("created_at"),
    supabase.from("shipment_cartons").select("*, items:shipment_carton_items(order_item_id,quantity,order_item:order_items(customer_sku,product:products(name)))").eq("shipment_id", id).order("carton_number"),
    supabase.from("generated_documents").select("id,kind,status,xlsx_storage_path,pdf_storage_path,error_message,created_at").eq("shipment_id", id).order("created_at", { ascending: false }),
  ])
  const normalizedCartons = (cartons ?? []).map((carton) => ({
    ...carton,
    items: (carton.items ?? []).map((item: { order_item_id: string; quantity: number; order_item?: { customer_sku: string; product?: { name: string } } }) => ({
      order_item_id: item.order_item_id,
      quantity: item.quantity,
      customer_sku: item.order_item?.customer_sku ?? "Unknown item",
      product_name: item.order_item?.product?.name ?? "Unknown product",
    })),
  }))
  return { ...shipment, orders: orders ?? [], cartons: normalizedCartons, documents: documents ?? [] } as unknown as ShipmentWorkspace
}

export async function createShipment(input: z.input<typeof shipmentInputSchema>): Promise<ActionResult<Shipment>> {
  const parsed = shipmentInputSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid shipment details" }
  const { supabase, user } = await auth()
  if (!user) return { success: false, error: "Not authenticated" }
  const { data: orders } = await supabase.from("orders").select("id,customer_id").in("id", parsed.data.order_ids)
  if (!orders || orders.length !== parsed.data.order_ids.length) return { success: false, error: "One or more selected orders could not be found" }
  if (orders.some((order) => order.customer_id !== parsed.data.customer_id)) return { success: false, error: "A shipment can only contain orders for one consignee" }
  const { data: existing } = await supabase.from("shipment_orders").select("order_id").in("order_id", parsed.data.order_ids)
  if (existing?.length) return { success: false, error: "One or more selected orders already belong to a shipment" }
  const { data: shipment, error } = await supabase.from("shipments").insert({
    shipment_number: parsed.data.shipment_number,
    customer_id: parsed.data.customer_id,
    transport_mode: parsed.data.transport_mode ?? null,
    shipment_date: parsed.data.shipment_date ?? null,
    place_of_receipt: parsed.data.place_of_receipt ?? null,
    port_of_loading: parsed.data.port_of_loading ?? null,
    port_of_discharge: parsed.data.port_of_discharge ?? null,
    final_destination: parsed.data.final_destination ?? null,
    notes: parsed.data.notes ?? null,
    created_by: user.id,
  }).select().single()
  if (error) return { success: false, error: error.message }
  const { error: membershipError } = await supabase.from("shipment_orders").insert(parsed.data.order_ids.map((order_id) => ({ shipment_id: shipment.id, order_id })))
  if (membershipError) {
    await supabase.from("shipments").delete().eq("id", shipment.id)
    return { success: false, error: membershipError.message }
  }
  revalidatePath("/shipments")
  return { success: true, data: shipment as Shipment }
}

export async function createShipmentForOrder(orderId: string, input: {
  shipment_number: string
  transport_mode?: string | null
  shipment_date?: string | null
  shipping_bill_number?: string | null
  shipping_bill_date?: string | null
  leo_date?: string | null
  bill_of_lading_or_awb_number?: string | null
  notes?: string | null
}): Promise<ActionResult<Shipment>> {
  const { supabase, user } = await auth()
  if (!user) return { success: false, error: "Not authenticated" }
  const { data: order } = await supabase.from("orders").select("id, customer_id").eq("id", orderId).single()
  if (!order) return { success: false, error: "Order not found" }
  const { data: existing } = await supabase.from("shipment_orders").select("shipment_id").eq("order_id", orderId).maybeSingle()
  if (existing) return { success: false, error: "This order already belongs to a shipment" }
  const { data: shipment, error } = await supabase.from("shipments").insert({
    shipment_number: input.shipment_number.trim(),
    customer_id: order.customer_id,
    transport_mode: input.transport_mode ?? null,
    shipment_date: input.shipment_date ?? null,
    shipping_bill_number: input.shipping_bill_number ?? null,
    shipping_bill_date: input.shipping_bill_date ?? null,
    leo_date: input.leo_date ?? null,
    bill_of_lading_or_awb_number: input.bill_of_lading_or_awb_number ?? null,
    notes: input.notes ?? null,
    created_by: user.id,
  }).select().single()
  if (error) return { success: false, error: error.message }
  const { error: membershipError } = await supabase.from("shipment_orders").insert({ shipment_id: shipment.id, order_id: orderId })
  if (membershipError) {
    await supabase.from("shipments").delete().eq("id", shipment.id)
    return { success: false, error: membershipError.message }
  }
  revalidatePath("/shipments")
  revalidatePath(`/shipments/${shipment.id}`)
  return { success: true, data: shipment as Shipment }
}

export async function confirmManualPacking(input: Parameters<typeof preparePackingProposal>[0]): Promise<ActionResult<{ shipment_id: string; carton_count: number }>> {
  const proposal = await preparePackingProposal(input)
  if (!proposal.success) return proposal
  return confirmPackingProposal(proposal.data.id)
}

export async function queueShipmentDocument(kind: "commercial_invoice" | "packing_list", shipmentId: string, proposalId?: string) {
  if (kind === "packing_list" && !proposalId) {
    const { supabase } = await auth()
    const { data: proposal } = await supabase.from("packing_proposals").select("id").eq("shipment_id", shipmentId).eq("status", "confirmed").order("revision", { ascending: false }).limit(1).maybeSingle()
    proposalId = proposal?.id
  }
  return queueGeneratedDocument({ kind, shipmentId, proposalId })
}
