"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/utils/audit"
import type { ActionResult, AuditLog, ExportDocument, OrderShipment, ShipmentStatus } from "@/types"

const documentTypes = ["buyer_purchase_order", "proforma_invoice", "commercial_invoice", "packing_list", "shipping_bill", "leo_copy", "bill_of_lading", "air_waybill", "e_way_bill", "certificate_of_origin", "insurance_certificate", "inward_remittance", "ebrc", "other"] as const
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const

const shipmentSchema = z.object({
  shipment_number: z.string().trim().min(1).max(100),
  transport_mode: z.string().trim().max(50).optional().nullable(),
  shipment_date: z.string().date().optional().nullable(),
  shipping_bill_number: z.string().trim().max(100).optional().nullable(),
  shipping_bill_date: z.string().date().optional().nullable(),
  leo_date: z.string().date().optional().nullable(),
  bill_of_lading_or_awb_number: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

const documentSchema = z.object({
  shipment_id: z.string().uuid().optional().nullable(),
  document_type: z.enum(documentTypes),
  document_number: z.string().trim().max(150).optional().nullable(),
  document_date: z.string().date().optional().nullable(),
  filename: z.string().trim().min(1).max(255),
  storage_path: z.string().trim().min(1).max(500),
  mime_type: z.enum(allowedMimeTypes).optional().nullable(),
  file_size: z.number().int().min(0).max(20 * 1024 * 1024).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
})

async function authenticate() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

function refreshOrder(orderId: string) {
  revalidatePath("/orders")
  revalidatePath(`/orders/${orderId}`)
}

export async function createOrderShipment(orderId: string, input: z.input<typeof shipmentSchema>): Promise<ActionResult<OrderShipment>> {
  const parsed = shipmentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Invalid shipment details" }
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }
  const { data, error } = await supabase.from("order_shipments").insert({ ...parsed.data, order_id: orderId, created_by: user.id }).select().single()
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "order_shipments", recordId: data.id, action: "create", newData: data, performedBy: user.id })
  refreshOrder(orderId)
  return { success: true, data: data as OrderShipment }
}

export async function updateOrderShipment(id: string, orderId: string, status: ShipmentStatus, input: z.input<typeof shipmentSchema>): Promise<ActionResult<OrderShipment>> {
  const parsed = shipmentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Invalid shipment details" }
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }
  const { data: old } = await supabase.from("order_shipments").select("*").eq("id", id).eq("order_id", orderId).single()
  if (!old) return { success: false, error: "Shipment not found" }
  const { data, error } = await supabase.from("order_shipments").update({ ...parsed.data, status }).eq("id", id).select().single()
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "order_shipments", recordId: id, action: "update", oldData: old, newData: data, performedBy: user.id })
  refreshOrder(orderId)
  return { success: true, data: data as OrderShipment }
}

export async function createExportDocument(orderId: string, input: z.input<typeof documentSchema>): Promise<ActionResult<ExportDocument>> {
  const parsed = documentSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "Invalid document details" }
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }
  if (parsed.data.shipment_id) {
    const { data: shipment } = await supabase.from("order_shipments").select("id").eq("id", parsed.data.shipment_id).eq("order_id", orderId).single()
    if (!shipment) return { success: false, error: "Shipment does not belong to this order" }
  }
  if (!parsed.data.storage_path.startsWith(`${orderId}/`)) return { success: false, error: "Invalid document storage path" }
  const { data, error } = await supabase.from("export_documents").insert({ ...parsed.data, order_id: orderId, uploaded_by: user.id }).select().single()
  if (error) return { success: false, error: error.message }
  await logAudit(supabase, { tableName: "export_documents", recordId: data.id, action: "create", newData: data, performedBy: user.id })
  refreshOrder(orderId)
  return { success: true, data: data as ExportDocument }
}

export async function getExportDocumentDownloadUrl(id: string): Promise<ActionResult<string>> {
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }
  const { data: document } = await supabase.from("export_documents").select("storage_path").eq("id", id).single()
  if (!document) return { success: false, error: "Document not found" }
  const { data, error } = await supabase.storage.from("export-documents").createSignedUrl(document.storage_path, 300)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data.signedUrl }
}

export async function deleteExportDocument(id: string, orderId: string): Promise<ActionResult> {
  const { supabase, user } = await authenticate()
  if (!user) return { success: false, error: "Not authenticated" }

  const { data: document } = await supabase
    .from("export_documents")
    .select("*")
    .eq("id", id)
    .eq("order_id", orderId)
    .single()
  if (!document) return { success: false, error: "Document not found" }

  const { error: storageError } = await supabase.storage.from("export-documents").remove([document.storage_path])
  if (storageError) return { success: false, error: `Could not delete file: ${storageError.message}` }

  const { error } = await supabase.from("export_documents").delete().eq("id", id).eq("order_id", orderId)
  if (error) return { success: false, error: `File was deleted but its record could not be removed: ${error.message}` }

  await logAudit(supabase, { tableName: "export_documents", recordId: id, action: "delete", oldData: document, performedBy: user.id })
  refreshOrder(orderId)
  return { success: true, data: undefined }
}

export async function getOrderActivity(orderId: string): Promise<AuditLog[]> {
  const { supabase, user } = await authenticate()
  if (!user) return []
  const { data, error } = await supabase.rpc("get_order_audit_logs", { p_order_id: orderId })
  if (error) return []
  return (data ?? []) as AuditLog[]
}
