"use client"

import { FileText, History, Package } from "lucide-react"
import type { AuditLog } from "@/types"

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

function readableType(value: unknown) {
  return typeof value === "string" ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Document"
}

function activitySummary(entry: AuditLog) {
  const data = (entry.old_data ?? entry.new_data ?? {}) as Record<string, unknown>
  if (entry.table_name === "export_documents") {
    const name = typeof data.filename === "string" ? ` - ${data.filename}` : ""
    const type = readableType(data.document_type)
    if (entry.action === "delete" || entry.action === "mcp_delete") return `Permanently deleted ${type}${name}`
    if (entry.action === "create" || entry.action === "mcp_create") return `Attached ${type}${name}`
    return `Updated ${type}${name}`
  }
  if (entry.table_name === "order_shipments") {
    const number = typeof data.shipment_number === "string" ? ` ${data.shipment_number}` : " shipment"
    if (entry.action === "create" || entry.action === "mcp_create") return `Created${number}`
    return `Updated${number}`
  }
  if (entry.table_name === "orders") return "Updated order"
  return `${readableType(entry.action)} ${entry.table_name.replace(/_/g, " ")}`
}

export function OrderActivity({ activity }: { activity: AuditLog[] }) {
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5">
        <h2 className="text-sm font-medium">Activity</h2>
        <p className="text-sm text-muted-foreground mt-1">Permanent record of export documents, shipments, and order changes.</p>
      </div>
      {activity.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No activity has been recorded for this order yet.</div>
      ) : (
        <div className="space-y-3">
          {activity.map((entry) => {
            const Icon = entry.table_name === "export_documents" ? FileText : entry.table_name === "order_shipments" ? Package : History
            return (
              <div key={entry.id} className="flex gap-3 rounded-lg border border-border p-4">
                <div className="mt-0.5 rounded-md bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{activitySummary(entry)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(entry.performed_at)}{entry.performed_by_name ? ` by ${entry.performed_by_name}` : ""}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
