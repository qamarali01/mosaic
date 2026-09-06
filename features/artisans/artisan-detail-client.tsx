"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Artisan, ArtisanAssignmentWithRelations } from "@/types"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ArtisanSheet } from "@/features/artisans/artisan-sheet"
import { useCanEdit } from "@/components/shared/user-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { archiveArtisan, restoreArtisan } from "@/lib/actions/artisans"
import { updateAssignmentStatus } from "@/lib/actions/assignments"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"
import {
  Pencil,
  Archive,
  RotateCcw,
  MoreHorizontal,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { AssignmentStatus } from "@/types"

const ASSIGNMENT_STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

interface ArtisanDetailClientProps {
  artisan: Artisan & { assignments: ArtisanAssignmentWithRelations[] }
}

export function ArtisanDetailClient({ artisan: initial }: ArtisanDetailClientProps) {
  const [artisan, setArtisan] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [statusFilter, setStatusFilterLocal] = useState<string>("all")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const canEdit = useCanEdit()

  function handleArchiveToggle() {
    startTransition(async () => {
      const result =
        artisan.status === "archived"
          ? await restoreArtisan(artisan.id)
          : await archiveArtisan(artisan.id)
      if (result.success) {
        toast.success(artisan.status === "archived" ? "Artisan restored" : "Artisan archived")
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setArchiveOpen(false)
    })
  }

  function handleAssignmentStatusChange(assignmentId: string, status: AssignmentStatus) {
    startTransition(async () => {
      const result = await updateAssignmentStatus(assignmentId, status)
      if (result.success) {
        toast.success("Assignment updated")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const filteredAssignments =
    statusFilter === "all"
      ? artisan.assignments
      : artisan.assignments.filter((a) => a.status === statusFilter)

  const activeAssignments = artisan.assignments.filter(
    (a) => !["completed", "cancelled"].includes(a.status)
  )
  const totalUnits = artisan.assignments.reduce((sum, a) => sum + a.quantity, 0)
  const completedUnits = artisan.assignments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + a.quantity, 0)

  return (
    <>
      <PageHeader
        title={artisan.name}
        description={artisan.location ?? "Artisan"}
        back={{ href: "/artisans", label: "Artisans" }}
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={artisan.status} />
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSheetOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={artisan.status === "archived" ? "" : "text-destructive"}
                  onClick={() => setArchiveOpen(true)}
                >
                  {artisan.status === "archived" ? (
                    <><RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore</>
                  ) : (
                    <><Archive className="h-3.5 w-3.5 mr-2" /> Archive</>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </PageHeader>

      <div className="p-6 max-w-4xl space-y-6">
        {/* Info cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Contact / Details */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-medium">Details</h2>
            <div className="space-y-2">
              {artisan.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{artisan.phone}</span>
                </div>
              )}
              {artisan.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>{artisan.email}</span>
                </div>
              )}
              {artisan.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{artisan.location}</span>
                </div>
              )}
              {artisan.specializations && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Specializations: </span>
                  {artisan.specializations}
                </div>
              )}
              {artisan.notes && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>
                  {artisan.notes}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-medium">Production Summary</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-semibold">{activeAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{completedUnits}</p>
                <p className="text-xs text-muted-foreground">Units done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold">{totalUnits}</p>
                <p className="text-xs text-muted-foreground">Total units</p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Assignments</h2>
            <Select value={statusFilter} onValueChange={setStatusFilterLocal}>
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {ASSIGNMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              No assignments found.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Order</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Product</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Customer SKU</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Rate (₹)</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Expected</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/orders/${a.order_id}`}
                          className="font-mono text-xs font-medium hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.order.order_number}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[140px]">{a.order_item.product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{a.order_item.product.internal_sku}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {a.order_item.customer_sku}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{a.quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {a.rate != null ? `₹${a.rate}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {a.expected_delivery_date ? formatDate(a.expected_delivery_date) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <Select
                            value={a.status}
                            onValueChange={(v) =>
                              handleAssignmentStatusChange(a.id, v as AssignmentStatus)
                            }
                          >
                            <SelectTrigger className="h-7 w-32 text-xs border-0 p-0 shadow-none">
                              <StatusBadge status={a.status} />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNMENT_STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <StatusBadge status={a.status} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ArtisanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        artisan={artisan}
        onSuccess={() => {
          setSheetOpen(false)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={artisan.status === "archived" ? "Restore artisan?" : "Archive artisan?"}
        description={
          artisan.status === "archived"
            ? `Restore "${artisan.name}"?`
            : `Archive "${artisan.name}"? They won't appear in active lists.`
        }
        confirmLabel={artisan.status === "archived" ? "Restore" : "Archive"}
        variant={artisan.status === "archived" ? "default" : "destructive"}
        onConfirm={handleArchiveToggle}
      />
    </>
  )
}
