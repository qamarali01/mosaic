import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { supabase } from "../supabase.js"
import { requireRole, type McpContext } from "../context.js"
import { logMcpAudit } from "../utils/audit.js"
import { mcpError, mcpSuccess } from "../utils/errors.js"
import { createInvoiceXlsx, createPackingXlsx, createSimplePdf } from "../document-generator.js"

const documentTypes = ["buyer_purchase_order", "proforma_invoice", "commercial_invoice", "packing_list", "shipping_bill", "leo_copy", "bill_of_lading", "air_waybill", "e_way_bill", "certificate_of_origin", "insurance_certificate", "inward_remittance", "ebrc", "other"] as const
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
const cartonItemSchema = z.object({ order_item_id: z.string().uuid(), quantity: z.number().int().positive() })
const cartonSchema = z.object({
  carton_number: z.string().min(1).max(50),
  quantity: z.number().int().positive().default(1),
  length: z.number().nonnegative().nullable().optional(),
  width: z.number().nonnegative().nullable().optional(),
  height: z.number().nonnegative().nullable().optional(),
  dimension_unit: z.string().max(10).default("in"),
  gross_weight_kg: z.number().nonnegative(),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(cartonItemSchema).min(1),
})

function requireSales(ctx: McpContext) {
  try {
    requireRole(ctx, "sales")
    return null
  } catch (error: unknown) {
    return mcpError((error as Error).message)
  }
}

async function generateQueuedDocument(documentId: string, kind: "proforma" | "commercial_invoice" | "packing_list", quoteId: string | undefined, shipmentId: string | undefined, proposalId: string | undefined) {
  await supabase.from("generated_documents").update({ status: "processing" }).eq("id", documentId)
  try {
    let xlsx: Buffer
    let pdf: Buffer
    if (kind === "packing_list") {
      const { data: proposal } = await supabase.from("packing_proposals").select("shipment_id, extracted_data").eq("id", proposalId!).eq("status", "confirmed").single()
      const { data: shipment } = await supabase.from("shipments").select("shipment_number, customer:customers(name)").eq("id", shipmentId!).single()
      if (!proposal || !shipment) throw new Error("Confirmed packing proposal or shipment not found")
      const extracted = proposal.extracted_data as { cartons: Array<{ carton_number: string; quantity: number; gross_weight_kg: number; dimension_unit: string; length?: number | null; width?: number | null; height?: number | null; items: Array<{ order_item_id: string; quantity: number }> }> }
      const itemIds = extracted.cartons.flatMap((carton) => carton.items.map((item) => item.order_item_id))
      const { data: items } = await supabase.from("order_items").select("id, customer_sku, product:products(internal_sku)").in("id", itemIds)
      const itemMap = new Map((items ?? []).map((item) => [item.id, item]))
      const cartons = extracted.cartons.map((carton) => ({
        cartonNumber: carton.carton_number,
        quantity: carton.quantity,
        itemCodes: carton.items.map((item) => itemMap.get(item.order_item_id)?.customer_sku ?? "UNKNOWN").join(", "),
        grossWeightKg: carton.gross_weight_kg,
        netWeightKg: Math.max(0, carton.gross_weight_kg - 2.5),
        dimensions: [carton.length, carton.width, carton.height].filter((value) => value != null).join(" x ") + (carton.dimension_unit ? ` ${carton.dimension_unit}` : ""),
      }))
      const customer = (shipment.customer as unknown as { name?: string } | null)?.name ?? ""
      xlsx = await createPackingXlsx({ invoiceNumber: shipment.shipment_number, date: new Date().toISOString().slice(0, 10), consignee: customer, cartons })
      pdf = await createSimplePdf("PACKING LIST", cartons.map((carton) => `Carton ${carton.cartonNumber}: ${carton.itemCodes} | ${carton.quantity} pcs | ${carton.grossWeightKg} kg gross | ${carton.dimensions}`))
    } else {
      let resolvedQuoteId = quoteId
      if (!resolvedQuoteId && shipmentId) {
        const { data: membership } = await supabase.from("shipment_orders").select("order:orders(quote_id)").eq("shipment_id", shipmentId).limit(1).maybeSingle()
        resolvedQuoteId = (membership?.order as unknown as { quote_id?: string | null } | null)?.quote_id ?? undefined
      }
      const { data: quote } = resolvedQuoteId ? await supabase.from("quotes").select("quote_number, customer:customers(name), items:quote_items(customer_sku, customer_description, quantity, unit_price, currency, product:products(internal_sku,name))").eq("id", resolvedQuoteId).single() : { data: null }
      let customer = (quote?.customer as unknown as { name?: string } | null)?.name ?? ""
      let lines = (quote?.items ?? []).map((item) => ({ itemCode: item.customer_sku, description: item.customer_description ?? (item.product as unknown as { name?: string } | null)?.name ?? "", size: "", quantity: item.quantity, rate: item.unit_price, currency: item.currency }))
      let invoiceNumber = quote?.quote_number ?? null
      if (!quote && shipmentId) {
        const { data: shipment } = await supabase.from("shipments").select("shipment_number, customer:customers(name)").eq("id", shipmentId).single()
        const { data: memberships } = await supabase.from("shipment_orders").select("order_id").eq("shipment_id", shipmentId)
        const { data: orderItems } = await supabase.from("order_items").select("customer_sku, customer_description, quantity, unit_price, currency, product:products(name)").in("order_id", (memberships ?? []).map((membership) => membership.order_id))
        customer = (shipment?.customer as unknown as { name?: string } | null)?.name ?? ""
        invoiceNumber = shipment?.shipment_number ?? null
        lines = (orderItems ?? []).map((item) => ({ itemCode: item.customer_sku, description: item.customer_description ?? (item.product as unknown as { name?: string } | null)?.name ?? "", size: "", quantity: item.quantity, rate: item.unit_price, currency: item.currency }))
      }
      if (!lines.length) throw new Error("No invoice lines found")
      xlsx = await createInvoiceXlsx({ title: kind === "proforma" ? "Proforma Invoice" : "Invoice", invoiceNumber: kind === "proforma" ? null : invoiceNumber, date: new Date().toISOString().slice(0, 10), consignee: customer, currency: lines[0]?.currency ?? "USD", lines })
      pdf = await createSimplePdf(kind === "proforma" ? "PROFORMA INVOICE" : "COMMERCIAL INVOICE", lines.map((line) => `${line.itemCode} | ${line.description} | ${line.quantity} | ${line.rate}`))
    }
    const base = `generated/${documentId}`
    const xlsxPath = `${base}.xlsx`
    const pdfPath = `${base}.pdf`
    const xlsxUpload = await supabase.storage.from("export-documents").upload(xlsxPath, xlsx, { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", upsert: false })
    if (xlsxUpload.error) throw new Error(xlsxUpload.error.message)
    const pdfUpload = await supabase.storage.from("export-documents").upload(pdfPath, pdf, { contentType: "application/pdf", upsert: false })
    if (pdfUpload.error) throw new Error(pdfUpload.error.message)
    await supabase.from("generated_documents").update({ status: "completed", xlsx_storage_path: xlsxPath, pdf_storage_path: pdfPath, completed_at: new Date().toISOString() }).eq("id", documentId)
    return { status: "completed", xlsx_storage_path: xlsxPath, pdf_storage_path: pdfPath }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document generation failed"
    await supabase.from("generated_documents").update({ status: "failed", error_message: message }).eq("id", documentId)
    return { status: "failed", error: message }
  }
}

export function registerExportDocumentTools(server: McpServer, ctx: McpContext) {
  server.tool("create_shipment", "Create a shipment for one consignee. A shipment can contain multiple orders for that same customer.", {
    shipment_number: z.string().min(1).max(100),
    customer_id: z.string().uuid(),
    order_ids: z.array(z.string().uuid()).min(1),
    transport_mode: z.string().max(50).optional(),
    shipment_date: z.string().date().optional(),
    place_of_receipt: z.string().max(200).optional(),
    port_of_loading: z.string().max(200).optional(),
    port_of_discharge: z.string().max(200).optional(),
    final_destination: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const { data: orders, error: orderError } = await supabase.from("orders").select("id, customer_id").in("id", input.order_ids)
    if (orderError) return mcpError(orderError.message)
    if (!orders || orders.length !== input.order_ids.length) return mcpError("One or more orders were not found")
    if (orders.some((order) => order.customer_id !== input.customer_id)) return mcpError("All orders in a shipment must have the same consignee")
    const { data: shipment, error } = await supabase.from("shipments").insert({
      shipment_number: input.shipment_number,
      customer_id: input.customer_id,
      transport_mode: input.transport_mode,
      shipment_date: input.shipment_date,
      place_of_receipt: input.place_of_receipt,
      port_of_loading: input.port_of_loading,
      port_of_discharge: input.port_of_discharge,
      final_destination: input.final_destination,
      notes: input.notes,
      created_by: ctx.userId,
    }).select().single()
    if (error) return mcpError(error.message)
    const { error: membershipError } = await supabase.from("shipment_orders").insert(input.order_ids.map((order_id) => ({ shipment_id: shipment.id, order_id })))
    if (membershipError) {
      await supabase.from("shipments").delete().eq("id", shipment.id)
      return mcpError(membershipError.message)
    }
    await logMcpAudit({ tableName: "shipments", recordId: shipment.id, action: "mcp_create", newData: shipment, ctx })
    return mcpSuccess(shipment)
  })

  server.tool("get_shipment_packing_context", "Get the shipment orders and line items Claude should use to interpret a handwritten packing-list image.", {
    shipment_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase.from("shipment_orders").select("order_id, order:orders(id,order_number,customer_id,items:order_items(id,product_id,customer_sku,customer_description,quantity,unit_price,currency,product:products(internal_sku,name)))").eq("shipment_id", input.shipment_id)
    if (error) return mcpError(error.message)
    return mcpSuccess({ shipment_id: input.shipment_id, orders: data ?? [], instruction: "Match handwriting to these order items. Do not invent an item code; return ambiguities for confirmation." })
  })

  server.tool("prepare_packing_proposal", "Save Claude's normalized extraction from a handwritten packing list for human review. This does not create official cartons or documents.", {
    shipment_id: z.string().uuid(),
    source_filename: z.string().max(255).optional(),
    extraction_notes: z.string().max(5000).optional(),
    cartons: z.array(cartonSchema).min(1),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const { data: memberships } = await supabase.from("shipment_orders").select("order_id").eq("shipment_id", input.shipment_id)
    if (!memberships?.length) return mcpError("Shipment has no orders")
    const orderIds = memberships.map((row) => row.order_id)
    const { data: items } = await supabase.from("order_items").select("id").in("order_id", orderIds)
    const valid = new Set((items ?? []).map((item) => item.id))
    const invalid = input.cartons.flatMap((carton) => carton.items.filter((item) => !valid.has(item.order_item_id)))
    if (invalid.length) return mcpError("Proposal contains an item that is not part of the shipment")
    const { data: latest } = await supabase.from("packing_proposals").select("revision").eq("shipment_id", input.shipment_id).order("revision", { ascending: false }).limit(1).maybeSingle()
    const { data, error } = await supabase.from("packing_proposals").insert({ shipment_id: input.shipment_id, revision: (latest?.revision ?? 0) + 1, source_filename: input.source_filename ?? null, extraction_notes: input.extraction_notes ?? null, extracted_data: { cartons: input.cartons, order_ids: orderIds }, created_by: ctx.userId }).select("id, shipment_id, revision, status, extracted_data").single()
    if (error) return mcpError(error.message)
    return mcpSuccess({ proposal: data, confirmation_required: true, instruction: "Show the carton table to the user and obtain explicit confirmation before calling confirm_packing_proposal." })
  })

  server.tool("confirm_packing_proposal", "Confirm an exact packing proposal after the user has reviewed it. The confirmation phrase must be CONFIRM_PACKING_PROPOSAL.", {
    proposal_id: z.string().uuid(),
    confirmation_phrase: z.literal("CONFIRM_PACKING_PROPOSAL"),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    const { data: proposal } = await supabase.from("packing_proposals").select("*").eq("id", input.proposal_id).single()
    if (!proposal || proposal.status !== "pending_review") return mcpError("Packing proposal is not awaiting review")
    const extracted = proposal.extracted_data as { cartons?: Array<z.infer<typeof cartonSchema>> }
    if (!extracted.cartons?.length) return mcpError("Proposal has no cartons")
    const { data: cartons, error } = await supabase.from("shipment_cartons").insert(extracted.cartons.map((carton) => ({ shipment_id: proposal.shipment_id, carton_number: carton.carton_number, quantity: carton.quantity, length: carton.length ?? null, width: carton.width ?? null, height: carton.height ?? null, dimension_unit: carton.dimension_unit, gross_weight_kg: carton.gross_weight_kg, tare_weight_kg: 2.5, notes: carton.notes ?? null }))).select("id")
    if (error || !cartons) return mcpError(error?.message ?? "Could not save cartons")
    const cartonItems = cartons.flatMap((carton, index) => extracted.cartons![index].items.map((item) => ({ carton_id: carton.id, order_item_id: item.order_item_id, quantity: item.quantity })))
    const { error: itemError } = await supabase.from("shipment_carton_items").insert(cartonItems)
    if (itemError) return mcpError(itemError.message)
    const { error: updateError } = await supabase.from("packing_proposals").update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: ctx.userId }).eq("id", proposal.id)
    if (updateError) return mcpError(updateError.message)
    await logMcpAudit({ tableName: "packing_proposals", recordId: proposal.id, action: "mcp_update", newData: { status: "confirmed" }, ctx })
    return mcpSuccess({ confirmed: true, shipment_id: proposal.shipment_id, carton_count: cartons.length })
  })

  server.tool("queue_document_generation", "Queue a pro forma, commercial invoice, or confirmed packing list for the document worker.", {
    kind: z.enum(["proforma", "commercial_invoice", "packing_list"]),
    quote_id: z.string().uuid().optional(),
    shipment_id: z.string().uuid().optional(),
    proposal_id: z.string().uuid().optional(),
  }, async (input) => {
    const denied = requireSales(ctx)
    if (denied) return denied
    if (input.kind === "proforma" && !input.quote_id) return mcpError("quote_id is required for a pro forma")
    if (input.kind === "commercial_invoice" && !input.shipment_id) return mcpError("shipment_id is required for a commercial invoice")
    if (input.kind === "packing_list" && !input.proposal_id) return mcpError("A confirmed proposal_id is required for a packing list")
    if (input.proposal_id) {
      const { data: proposal } = await supabase.from("packing_proposals").select("status").eq("id", input.proposal_id).single()
      if (proposal?.status !== "confirmed") return mcpError("Packing proposal must be confirmed before generation")
    }
    const { data, error } = await supabase.from("generated_documents").insert({ kind: input.kind, quote_id: input.quote_id ?? null, shipment_id: input.shipment_id ?? null, proposal_id: input.proposal_id ?? null, source_snapshot: input, created_by: ctx.userId }).select("id, kind, status").single()
    if (error) return mcpError(error.message)
    const generated = await generateQueuedDocument(data.id, input.kind, input.quote_id, input.shipment_id, input.proposal_id)
    return mcpSuccess({ ...data, ...generated })
  })

  server.tool("get_generated_document", "Get a generated document and fresh five-minute download URLs for its XLSX and PDF files.", {
    document_id: z.string().uuid(),
  }, async (input) => {
    const { data, error } = await supabase.from("generated_documents").select("*").eq("id", input.document_id).single()
    if (error || !data) return mcpError("Generated document not found")
    const [xlsx, pdf] = await Promise.all([
      data.xlsx_storage_path ? supabase.storage.from("export-documents").createSignedUrl(data.xlsx_storage_path, 300) : Promise.resolve({ data: null }),
      data.pdf_storage_path ? supabase.storage.from("export-documents").createSignedUrl(data.pdf_storage_path, 300) : Promise.resolve({ data: null }),
    ])
    return mcpSuccess({ ...data, xlsx_download_url: xlsx.data?.signedUrl ?? null, pdf_download_url: pdf.data?.signedUrl ?? null })
  })

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
