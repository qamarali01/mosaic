"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, FileText, Loader2, PackagePlus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { createClient } from "@/lib/supabase/client"
import { createExportDocument, createOrderShipment, deleteExportDocument, getExportDocumentDownloadUrl } from "@/lib/actions/export-documents"
import type { ExportDocument, ExportDocumentType, OrderShipment } from "@/types"

const documentTypes: Array<{ value: ExportDocumentType; label: string }> = [
  { value: "buyer_purchase_order", label: "Buyer Purchase Order" },
  { value: "proforma_invoice", label: "Pro Forma Invoice" },
  { value: "commercial_invoice", label: "Commercial Invoice" },
  { value: "packing_list", label: "Packing List" },
  { value: "shipping_bill", label: "Shipping Bill" },
  { value: "leo_copy", label: "LEO Copy" },
  { value: "bill_of_lading", label: "Bill of Lading" },
  { value: "air_waybill", label: "Air Waybill" },
  { value: "e_way_bill", label: "E-way Bill" },
  { value: "certificate_of_origin", label: "Certificate of Origin" },
  { value: "insurance_certificate", label: "Insurance Certificate" },
  { value: "inward_remittance", label: "Inward Remittance" },
  { value: "ebrc", label: "eBRC" },
  { value: "other", label: "Other" },
]
const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"] as const

const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`)) : "-"

function documentLabel(type: ExportDocumentType) {
  return documentTypes.find((item) => item.value === type)?.label ?? type
}

export function ExportDocuments({ orderId, shipments, documents }: { orderId: string; shipments: OrderShipment[]; documents: ExportDocument[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [shipmentOpen, setShipmentOpen] = useState(false)
  const [documentOpen, setDocumentOpen] = useState(false)
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("none")
  const [documentToDelete, setDocumentToDelete] = useState<ExportDocument | null>(null)

  function submitShipment(formData: FormData) {
    startTransition(async () => {
      const result = await createOrderShipment(orderId, {
        shipment_number: String(formData.get("shipment_number") ?? ""),
        transport_mode: String(formData.get("transport_mode") ?? "") || null,
        shipment_date: String(formData.get("shipment_date") ?? "") || null,
        shipping_bill_number: String(formData.get("shipping_bill_number") ?? "") || null,
        shipping_bill_date: String(formData.get("shipping_bill_date") ?? "") || null,
        leo_date: String(formData.get("leo_date") ?? "") || null,
        bill_of_lading_or_awb_number: String(formData.get("transport_document") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Shipment added")
      setShipmentOpen(false)
      router.refresh()
    })
  }

  function submitDocument(formData: FormData) {
    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Select a document to upload")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Documents must be 20 MB or smaller")
      return
    }
    if (!allowedMimeTypes.includes(file.type as (typeof allowedMimeTypes)[number])) {
      toast.error("Only PDF, JPEG, and PNG documents are supported")
      return
    }
    const documentType = formData.get("document_type") as ExportDocumentType
    if (!documentTypes.some((type) => type.value === documentType)) {
      toast.error("Select a document type")
      return
    }

    startTransition(async () => {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const shipmentId = selectedShipmentId === "none" ? null : selectedShipmentId
      const folder = shipmentId ? `shipments/${shipmentId}` : "order-level"
      const storagePath = `${orderId}/${folder}/${Date.now()}-${safeName}`
      const { error: uploadError } = await supabase.storage.from("export-documents").upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const result = await createExportDocument(orderId, {
        shipment_id: shipmentId,
        document_type: documentType,
        document_number: String(formData.get("document_number") ?? "") || null,
        document_date: String(formData.get("document_date") ?? "") || null,
        filename: file.name,
        storage_path: storagePath,
        mime_type: file.type as (typeof allowedMimeTypes)[number],
        file_size: file.size,
        notes: String(formData.get("notes") ?? "") || null,
      })
      if (!result.success) {
        await supabase.storage.from("export-documents").remove([storagePath])
        toast.error(result.error)
        return
      }
      toast.success("Document attached")
      setDocumentOpen(false)
      setSelectedShipmentId("none")
      router.refresh()
    })
  }

  async function downloadDocument(document: ExportDocument) {
    const result = await getExportDocumentDownloadUrl(document.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    window.open(result.data, "_blank", "noopener,noreferrer")
  }

  function deleteDocument() {
    if (!documentToDelete) return
    startTransition(async () => {
      const result = await deleteExportDocument(documentToDelete.id, orderId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Document permanently deleted")
      setDocumentToDelete(null)
      router.refresh()
    })
  }

  const orderDocuments = documents.filter((document) => !document.shipment_id)

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Export Documents</h2>
          <p className="text-sm text-muted-foreground mt-1">Attach files directly to this order, or organize them under an optional shipment.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShipmentOpen(true)}>
            <PackagePlus className="h-4 w-4 mr-1.5" /> Add shipment
          </Button>
          <Button size="sm" onClick={() => setDocumentOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Attach document
          </Button>
        </div>
      </div>

      <DocumentSection title="Order-level documents" description="Buyer POs, remittance proof, eBRCs, and files not assigned to a shipment." documents={orderDocuments} onDownload={downloadDocument} onDelete={setDocumentToDelete} />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Shipments</h3>
          <p className="text-sm text-muted-foreground">Shipping bills, LEO copies, transport documents, invoices, and packing lists.</p>
        </div>
        {shipments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No shipments have been added. Documents can still be attached directly to the order.</div>
        ) : shipments.map((shipment) => (
          <div key={shipment.id} className="rounded-lg border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border bg-muted/20">
              <div>
                <p className="text-sm font-medium">{shipment.shipment_number}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {[shipment.transport_mode, shipment.shipment_date ? `Shipped ${formatDate(shipment.shipment_date)}` : null, shipment.shipping_bill_number ? `SB ${shipment.shipping_bill_number}` : null, shipment.bill_of_lading_or_awb_number ? `BL/AWB ${shipment.bill_of_lading_or_awb_number}` : null].filter(Boolean).join(" · ") || "Draft shipment"}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{shipment.status.replace("_", " ")}</span>
            </div>
            <div className="p-4">
              <DocumentRows documents={documents.filter((document) => document.shipment_id === shipment.id)} onDownload={downloadDocument} onDelete={setDocumentToDelete} empty="No documents attached to this shipment." />
            </div>
          </div>
        ))}
      </div>

      <Dialog open={shipmentOpen} onOpenChange={setShipmentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add shipment</DialogTitle><DialogDescription>Create a document folder for one dispatch of this order.</DialogDescription></DialogHeader>
          <form action={submitShipment} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="shipment_number">Shipment number *</Label><Input id="shipment_number" name="shipment_number" placeholder="e.g. ORD-1042-S1" required /></div>
              <div className="space-y-1.5"><Label htmlFor="transport_mode">Transport mode</Label><Input id="transport_mode" name="transport_mode" placeholder="Sea, air, courier..." /></div>
              <div className="space-y-1.5"><Label htmlFor="shipment_date">Shipment date</Label><Input id="shipment_date" name="shipment_date" type="date" /></div>
              <div className="space-y-1.5"><Label htmlFor="shipping_bill_number">Shipping bill number</Label><Input id="shipping_bill_number" name="shipping_bill_number" /></div>
              <div className="space-y-1.5"><Label htmlFor="shipping_bill_date">Shipping bill date</Label><Input id="shipping_bill_date" name="shipping_bill_date" type="date" /></div>
              <div className="space-y-1.5"><Label htmlFor="leo_date">LEO date</Label><Input id="leo_date" name="leo_date" type="date" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="transport_document">BL / AWB number</Label><Input id="transport_document" name="transport_document" /></div>
            <div className="space-y-1.5"><Label htmlFor="shipment_notes">Notes</Label><Textarea id="shipment_notes" name="notes" rows={2} /></div>
            <DialogFooter><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add shipment</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach export document</DialogTitle><DialogDescription>Attach to the order directly, or select a shipment when applicable.</DialogDescription></DialogHeader>
          <form action={submitDocument} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="file">File *</Label><Input id="file" name="file" type="file" accept="application/pdf,image/jpeg,image/png" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Document type *</Label><Select name="document_type" defaultValue="other"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Shipment</Label><Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Order-level document</SelectItem>{shipments.map((shipment) => <SelectItem key={shipment.id} value={shipment.id}>{shipment.shipment_number}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label htmlFor="document_number">Reference number</Label><Input id="document_number" name="document_number" /></div>
              <div className="space-y-1.5"><Label htmlFor="document_date">Document date</Label><Input id="document_date" name="document_date" type="date" /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="document_notes">Notes</Label><Textarea id="document_notes" name="notes" rows={2} /></div>
            <DialogFooter><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Attach document</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!documentToDelete}
        onOpenChange={(open) => !open && setDocumentToDelete(null)}
        title="Permanently delete document?"
        description={`This will permanently remove ${documentToDelete?.filename ?? "this document"} and cannot be undone.`}
        confirmLabel={isPending ? "Deleting..." : "Delete permanently"}
        variant="destructive"
        onConfirm={deleteDocument}
      />
    </div>
  )
}

function DocumentSection({ title, description, documents, onDownload, onDelete }: { title: string; description: string; documents: ExportDocument[]; onDownload: (document: ExportDocument) => void; onDelete: (document: ExportDocument) => void }) {
  return <div className="rounded-lg border border-border"><div className="p-4 border-b border-border"><h3 className="text-sm font-medium">{title}</h3><p className="text-xs text-muted-foreground mt-1">{description}</p></div><div className="p-4"><DocumentRows documents={documents} onDownload={onDownload} onDelete={onDelete} empty="No documents attached directly to this order." /></div></div>
}

function DocumentRows({ documents, onDownload, onDelete, empty }: { documents: ExportDocument[]; onDownload: (document: ExportDocument) => void; onDelete: (document: ExportDocument) => void; empty: string }) {
  if (documents.length === 0) return <p className="text-sm text-muted-foreground py-2">{empty}</p>
  return <div className="space-y-2">{documents.map((document) => <div key={document.id} className="flex items-center gap-3 rounded-md border border-border p-3"><FileText className="h-4 w-4 text-muted-foreground shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{documentLabel(document.document_type)}</p><p className="text-xs text-muted-foreground truncate">{document.filename}{document.document_number ? ` · ${document.document_number}` : ""}{document.document_date ? ` · ${formatDate(document.document_date)}` : ""}</p></div><Button size="sm" variant="ghost" className="shrink-0" onClick={() => onDownload(document)}><Download className="h-4 w-4" /><span className="sr-only">Download {document.filename}</span></Button><Button size="sm" variant="ghost" className="shrink-0 text-destructive hover:text-destructive" onClick={() => onDelete(document)}><Trash2 className="h-4 w-4" /><span className="sr-only">Permanently delete {document.filename}</span></Button></div>)}</div>
}
