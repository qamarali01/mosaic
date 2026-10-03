import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpError, mcpSuccess } from "../utils/errors.js"

const documentTypes = ["buyer_purchase_order", "proforma_invoice", "commercial_invoice", "packing_list", "shipping_bill", "leo_copy", "bill_of_lading", "air_waybill", "e_way_bill", "certificate_of_origin", "insurance_certificate", "inward_remittance", "ebrc", "other"] as const
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024

function requireSales(ctx: McpContext) {
  try {
    requireRole(ctx, "sales")
    return null
  } catch (error: unknown) {
    return mcpError((error as Error).message)
  }
}

export function registerExportDocumentTools(server: McpServer, ctx: McpContext) {
  server.tool("list_order_shipments", "List export shipments and their key customs/transport references for an order.", {
    order_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase.from("order_shipments").select("*").eq("order_id", input.order_id).order("created_at")
    if (error) return mcpError(error.message)
    return mcpSuccess({ shipments: data ?? [] })
  })

  server.tool("get_order_export_documents", "Get every export document for an order, including order-level files and files grouped by shipment. Returned download URLs expire after five minutes.", {
    order_id: z.string().uuid(),
  }, async (input) => {
    const { data: documents, error } = await supabase
      .from("export_documents")
      .select("*, shipment:order_shipments(id,shipment_number)")
      .eq("order_id", input.order_id)
      .order("created_at", { ascending: false })
    if (error) return mcpError(error.message)

    const withUrls = await Promise.all((documents ?? []).map(async (document) => {
      const { data } = await supabase.storage.from("export-documents").createSignedUrl(document.storage_path, 300)
      return { ...document, download_url: data?.signedUrl ?? null }
    }))
    return mcpSuccess({ documents: withUrls })
  })

  server.tool("create_order_shipment", "Create an optional shipment folder under an order for shipping bills, LEO, BL/AWB, invoices, and packing lists.", {
    order_id: z.string().uuid(),
    shipment_number: z.string().min(1).max(100),
    transport_mode: z.string().max(50).optional(),
    shipment_date: z.string().date().optional(),
    shipping_bill_number: z.string().max(100).optional(),
    shipping_bill_date: z.string().date().optional(),
    leo_date: z.string().date().optional(),
    bill_of_lading_or_awb_number: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const { order_id, ...shipment } = input
    const { data, error } = await supabase.from("order_shipments").insert({ ...shipment, order_id, created_by: ctx.userId }).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "order_shipments", recordId: data.id, action: "mcp_create", newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("update_order_shipment", "Update shipment details or status. Status is draft, shipped, or documents_complete.", {
    shipment_id: z.string().uuid(),
    status: z.enum(["draft", "shipped", "documents_complete"]).optional(),
    transport_mode: z.string().max(50).optional(),
    shipment_date: z.string().date().nullable().optional(),
    shipping_bill_number: z.string().max(100).nullable().optional(),
    shipping_bill_date: z.string().date().nullable().optional(),
    leo_date: z.string().date().nullable().optional(),
    bill_of_lading_or_awb_number: z.string().max(100).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const { shipment_id, ...updates } = input
    const { data: old } = await supabase.from("order_shipments").select("*").eq("id", shipment_id).single()
    if (!old) return mcpError("Shipment not found")
    const { data, error } = await supabase.from("order_shipments").update(updates).eq("id", shipment_id).select().single()
    if (error) return mcpError(error.message)
    await logMcpAudit({ tableName: "order_shipments", recordId: shipment_id, action: "mcp_update", oldData: old, newData: data, ctx })
    return mcpSuccess(data)
  })

  server.tool("upload_export_document", "Upload an export document to an order. shipment_id is optional, so buyer POs, eBRCs, and remittance evidence can be attached directly to the order. Allowed types: PDF, JPEG, PNG. Max 20 MB.", {
    order_id: z.string().uuid(),
    shipment_id: z.string().uuid().optional(),
    document_type: z.enum(documentTypes),
    filename: z.string().min(1).max(255),
    mime_type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
    content_base64: z.string().min(1),
    document_number: z.string().max(150).optional(),
    document_date: z.string().date().optional(),
    notes: z.string().max(2000).optional(),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const buffer = Buffer.from(input.content_base64, "base64")
    if (buffer.byteLength > MAX_DOCUMENT_BYTES) return mcpError("Document is larger than the 20 MB limit")

    if (input.shipment_id) {
      const { data: shipment } = await supabase.from("order_shipments").select("id").eq("id", input.shipment_id).eq("order_id", input.order_id).single()
      if (!shipment) return mcpError("Shipment does not belong to this order")
    }

    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")
    const folder = input.shipment_id ? `shipments/${input.shipment_id}` : "order-level"
    const storagePath = `${input.order_id}/${folder}/${Date.now()}-${safeName}`
    const { error: uploadError } = await supabase.storage.from("export-documents").upload(storagePath, buffer, { contentType: input.mime_type, upsert: false })
    if (uploadError) return mcpError(`Upload failed: ${uploadError.message}`)

    const { data, error } = await supabase.from("export_documents").insert({
      order_id: input.order_id,
      shipment_id: input.shipment_id ?? null,
      document_type: input.document_type,
      document_number: input.document_number ?? null,
      document_date: input.document_date ?? null,
      filename: input.filename,
      storage_path: storagePath,
      mime_type: input.mime_type,
      file_size: buffer.byteLength,
      notes: input.notes ?? null,
      uploaded_by: ctx.userId,
    }).select().single()
    if (error) {
      await supabase.storage.from("export-documents").remove([storagePath])
      return mcpError(`Document record failed: ${error.message}`)
    }
    await logMcpAudit({ tableName: "export_documents", recordId: data.id, action: "mcp_create", newData: data, ctx })
    return mcpSuccess({ document_id: data.id, storage_path: storagePath })
  })

  server.tool("delete_export_document", "Permanently delete an export document and its stored file. This cannot be undone.", {
    order_id: z.string().uuid(),
    document_id: z.string().uuid(),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const { data: document } = await supabase
      .from("export_documents")
      .select("*")
      .eq("id", input.document_id)
      .eq("order_id", input.order_id)
      .single()
    if (!document) return mcpError("Document not found")

    const { error: storageError } = await supabase.storage.from("export-documents").remove([document.storage_path])
    if (storageError) return mcpError(`Could not delete file: ${storageError.message}`)
    const { error } = await supabase.from("export_documents").delete().eq("id", input.document_id).eq("order_id", input.order_id)
    if (error) return mcpError(`File was deleted but its record could not be removed: ${error.message}`)
    await logMcpAudit({ tableName: "export_documents", recordId: input.document_id, action: "mcp_delete", oldData: document, ctx })
    return mcpSuccess({ deleted: true, document_id: input.document_id })
  })
}
