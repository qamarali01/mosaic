"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Artisan,
  ArtisanAssignmentWithRelations,
  AssignmentStatus,
  OrderItemWithProduct,
  OrderStatus,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useCanEdit } from "@/components/shared/user-context"
import {
  createAssignment,
  updateAssignment,
  updateAssignmentStatus,
  deleteAssignment,
} from "@/lib/actions/assignments"
import { updateOrderStatus } from "@/lib/actions/orders"
import { toast } from "sonner"
import {
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ASSIGNMENT_STATUS_OPTIONS: { value: AssignmentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

interface OrderAssignmentsProps {
  orderId: string
  orderStatus: OrderStatus
  items: OrderItemWithProduct[]
  assignments: ArtisanAssignmentWithRelations[]
  artisans: Artisan[]
}

interface AssignmentFormState {
  artisan_id: string
  quantity: string
  rate: string
  expected_delivery_date: string
  notes: string
}

const EMPTY_FORM: AssignmentFormState = {
  artisan_id: "",
  quantity: "",
  rate: "",
  expected_delivery_date: "",
  notes: "",
}

export function OrderAssignments({
  orderId,
  orderStatus,
  items,
  assignments,
  artisans,
}: OrderAssignmentsProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<ArtisanAssignmentWithRelations | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [form, setForm] = useState<AssignmentFormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<ArtisanAssignmentWithRelations | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const canEdit = useCanEdit()

  const assignmentsByItem = assignments.reduce<
    Record<string, ArtisanAssignmentWithRelations[]>
  >((acc, a) => {
    if (!acc[a.order_item_id]) acc[a.order_item_id] = []
    acc[a.order_item_id].push(a)
    return acc
  }, {})

  function assignedQty(itemId: string) {
    return (assignmentsByItem[itemId] ?? [])
      .filter((a) => a.status !== "cancelled")
      .reduce((s, a) => s + a.quantity, 0)
  }

  function remainingQty(item: OrderItemWithProduct) {
    return item.quantity - assignedQty(item.id)
  }

  const totalAssigned = items.reduce((s, item) => s + assignedQty(item.id), 0)
  const totalQty = items.reduce((s, item) => s + item.quantity, 0)
  const totalCompleted = assignments
    .filter((a) => a.status === "completed")
    .reduce((s, a) => s + a.quantity, 0)

  const totalProductionCost = assignments
    .filter((a) => a.status !== "cancelled" && a.rate != null)
    .reduce((s, a) => s + (a.rate ?? 0) * a.quantity, 0)
  const hasCostData = assignments.some((a) => a.rate != null && a.status !== "cancelled")

  const orderRevenue = items.reduce((s, item) => s + item.unit_price * item.quantity, 0)
  const orderCurrency = items[0]?.currency ?? "USD"

  const itemsWithUnassigned = items.filter((item) => remainingQty(item) > 0)
  const allProductionComplete =
    assignments.length > 0 &&
    assignments.every((a) => a.status === "completed" || a.status === "cancelled") &&
    totalAssigned >= totalQty

  function openAssignSheet(itemId: string, existing?: ArtisanAssignmentWithRelations) {
    setActiveItemId(itemId)
    if (existing) {
      setEditingAssignment(existing)
      setForm({
        artisan_id: existing.artisan_id,
        quantity: String(existing.quantity),
        rate: existing.rate != null ? String(existing.rate) : "",
        expected_delivery_date: existing.expected_delivery_date ?? "",
        notes: existing.notes ?? "",
      })
    } else {
      setEditingAssignment(null)
      const item = items.find((i) => i.id === itemId)
      setForm({
        ...EMPTY_FORM,
        quantity: item ? String(remainingQty(item)) : "",
      })
    }
    setSheetOpen(true)
  }

  function handleSheetSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.artisan_id) {
      toast.error("Select an artisan")
      return
    }
    if (!activeItemId) return

    startTransition(async () => {
      const qty = parseInt(form.quantity)
      const rate = form.rate ? parseFloat(form.rate) : null
      const expected = form.expected_delivery_date || null

      if (editingAssignment) {
        const result = await updateAssignment(editingAssignment.id, {
          quantity: qty,
          rate,
          expected_delivery_date: expected,
          notes: form.notes || null,
        })
        if (result.success) {
          toast.success("Assignment updated")
          setSheetOpen(false)
          router.refresh()
        } else {
          toast.error(result.error)
        }
      } else {
        const result = await createAssignment({
          order_id: orderId,
          order_item_id: activeItemId,
          artisan_id: form.artisan_id,
          quantity: qty,
          rate,
          expected_delivery_date: expected,
          notes: form.notes || null,
        })
        if (result.success) {
          toast.success("Assignment created")
          setSheetOpen(false)
          router.refresh()
        } else {
          toast.error(result.error)
        }
      }
    })
  }

  function handleStatusChange(assignmentId: string, status: AssignmentStatus) {
    startTransition(async () => {
      const result = await updateAssignmentStatus(assignmentId, status)
      if (result.success) {
        toast.success("Status updated")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteAssignment(deleteTarget.id, orderId)
      if (result.success) {
        toast.success("Assignment removed")
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setDeleteTarget(null)
    })
  }

  function handleMarkShipped() {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, "shipped")
      if (result.success) {
        toast.success("Order marked as shipped")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const isReadOnly = !canEdit || ["shipped", "delivered", "cancelled"].includes(orderStatus)

  return (
    <div className="p-6 max-w-4xl space-y-4">
      <div
        className={cn(
          "rounded-xl border p-5 space-y-3",
          allProductionComplete
            ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20"
            : itemsWithUnassigned.length > 0
            ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20"
            : "border-border/60 bg-card/50 backdrop-blur-sm"
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {allProductionComplete ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : itemsWithUnassigned.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            ) : null}
            <div>
              <p className="text-sm font-medium">
                {allProductionComplete
                  ? "All production complete"
                  : `${totalAssigned} / ${totalQty} units assigned · ${totalCompleted} completed`}
              </p>
              {itemsWithUnassigned.length > 0 && (
                <p className="text-xs text-amber-700 mt-0.5">
                  {itemsWithUnassigned.length} line item{itemsWithUnassigned.length > 1 ? "s" : ""} have unassigned quantities
                </p>
              )}
            </div>
          </div>

          {allProductionComplete &&
            !["shipped", "delivered", "cancelled"].includes(orderStatus) && (
              <Button size="sm" onClick={handleMarkShipped} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Mark as Shipped →
              </Button>
            )}
        </div>

        {hasCostData && (
          <div className="flex items-center gap-6 pt-3 border-t border-black/5 dark:border-white/5 mt-2 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Production cost</p>
              <p className="text-sm font-semibold">
                ₹{totalProductionCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order revenue</p>
              <p className="text-sm font-semibold">
                {orderCurrency} {orderRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const itemAssignments = assignmentsByItem[item.id] ?? []
          const assigned = assignedQty(item.id)
          const remaining = remainingQty(item)
          const hasUnassigned = remaining > 0

          return (
            <div key={item.id} className="rounded-xl border border-border/60 overflow-hidden bg-card/50 backdrop-blur-sm">
              <div className="flex items-center justify-between px-5 py-3.5 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{item.customer_sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {assigned}/{item.quantity} units assigned
                    </p>
                    {hasUnassigned && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1 justify-end">
                        <AlertTriangle className="h-3 w-3" />
                        {remaining} unassigned
                      </p>
                    )}
                  </div>
                  {!isReadOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => openAssignSheet(item.id)}
                      disabled={remaining === 0}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Assign{remaining > 0 ? ` (${remaining} left)` : ""}
                    </Button>
                  )}
                </div>
              </div>

              {itemAssignments.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted-foreground italic">
                  No artisans assigned yet.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {itemAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{a.artisan.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.quantity} unit{a.quantity > 1 ? "s" : ""}
                          {a.rate != null && ` · ₹${a.rate}/unit`}
                          {a.rate != null && ` (₹${(a.rate * a.quantity).toLocaleString("en-IN")} total)`}
                        </p>
                        {a.expected_delivery_date && (
                          <p className="text-xs text-muted-foreground">
                            Expected: {new Date(a.expected_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        )}
                        {a.notes && (
                          <p className="text-xs text-muted-foreground italic mt-0.5">{a.notes}</p>
                        )}
                      </div>

                      <div className="shrink-0">
                        {!isReadOnly ? (
                          <Select
                            value={a.status}
                            onValueChange={(v) => handleStatusChange(a.id, v as AssignmentStatus)}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-7 w-auto gap-1 border-0 shadow-none px-2 hover:bg-accent rounded-md">
                              <StatusBadge status={a.status} />
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => openAssignSheet(item.id, a)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(a)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) {
            setEditingAssignment(null)
            setForm(EMPTY_FORM)
          }
        }}
      >
        <SheetContent
          className="w-full sm:max-w-md overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="mb-6">
            <SheetTitle>{editingAssignment ? "Edit Assignment" : "Assign Artisan"}</SheetTitle>
            <SheetDescription>
              {activeItemId &&
                (() => {
                  const item = items.find((i) => i.id === activeItemId)
                  if (!item) return null
                  const rem = editingAssignment
                    ? remainingQty(item) + editingAssignment.quantity
                    : remainingQty(item)
                  return `${item.product.name} · ${rem} unit${rem !== 1 ? "s" : ""} available to assign`
                })()}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSheetSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label>Artisan *</Label>
              <select
                value={form.artisan_id}
                onChange={(e) => setForm((f) => ({ ...f, artisan_id: e.target.value }))}
                className="flex h-10 w-full items-center rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select artisan...</option>
                {artisans.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.location ? ` — ${a.location}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-qty">Quantity *</Label>
                <Input
                  id="assign-qty"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assign-rate">Rate (₹/unit)</Label>
                <Input
                  id="assign-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                />
              </div>
            </div>

            {form.rate && form.quantity && (
              <p className="text-xs text-muted-foreground -mt-2">
                Total artisan cost: ₹{(parseFloat(form.rate) * parseInt(form.quantity)).toLocaleString("en-IN")}
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="assign-date">Expected Delivery Date</Label>
              <Input
                id="assign-date"
                type="date"
                value={form.expected_delivery_date}
                onChange={(e) => setForm((f) => ({ ...f, expected_delivery_date: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assign-notes">Notes</Label>
              <Textarea
                id="assign-notes"
                rows={2}
                className="resize-none"
                placeholder="Any specific instructions..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAssignment ? "Save Changes" : "Assign"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remove assignment?"
        description={`Remove ${deleteTarget?.artisan?.name}'s assignment of ${deleteTarget?.quantity} unit(s)?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
