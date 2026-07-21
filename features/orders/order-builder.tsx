"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { OrderWithRelations, OrderStatus } from "@/types"

type CustomerOption = { id: string; name: string; currency: string }
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { createOrder, updateOrderStatus } from "@/lib/actions/orders"
import { getMappingsByCustomer } from "@/lib/actions/customers"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface OrderItem {
  product_id: string
  product_name: string
  product_sku: string
  customer_sku: string
  customer_description: string
  quantity: number
  unit_price: number
  currency: string
}

interface OrderBuilderProps {
  customers: CustomerOption[]
  order?: OrderWithRelations | null
}

const ORDER_STATUSES: OrderStatus[] = [
  "pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"
]

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

export function OrderBuilder({ customers, order }: OrderBuilderProps) {
  const router = useRouter()
  const isEditing = !!order
  const readOnly = isEditing && !["pending", "confirmed"].includes(order.status)

  const [customerId, setCustomerId] = useState(order?.customer_id ?? "")
  const [items, setItems] = useState<OrderItem[]>(
    order?.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product.name,
      product_sku: i.product.internal_sku,
      customer_sku: i.customer_sku,
      customer_description: i.customer_description ?? "",
      quantity: i.quantity,
      unit_price: i.unit_price,
      currency: i.currency,
    })) ?? []
  )
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [statusAction, setStatusAction] = useState<OrderStatus | null>(null)

  async function handleCustomerChange(id: string) {
    setCustomerId(id)
    setItems([])
    if (!id) return
    setLoadingMappings(true)
    const mappings = await getMappingsByCustomer(id)
    setLoadingMappings(false)
    setItems(mappings.map((m) => ({
      product_id: m.product_id,
      product_name: m.product.name,
      product_sku: m.product.internal_sku,
      customer_sku: m.customer_sku,
      customer_description: m.customer_description ?? "",
      quantity: 1,
      unit_price: m.price,
      currency: m.currency,
    })))
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const currency = items[0]?.currency ?? "USD"

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customerId) { toast.error("Select a customer"); return }
    if (items.length === 0) { toast.error("Add at least one item"); return }

    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createOrder({
        customer_id: customerId,
        notes: (fd.get("notes") as string) || null,
        items: items.map((item, i) => ({
          product_id: item.product_id,
          customer_sku: item.customer_sku,
          customer_description: item.customer_description || null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency,
          sort_order: i,
        })),
      })

      if (result.success) {
        toast.success("Order created")
        router.push(`/orders/${result.data.id}`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleStatusChange(newStatus: OrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(order!.id, newStatus)
      if (result.success) {
        toast.success(`Order ${newStatus}`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setStatusAction(null)
    })
  }

  const nextStatuses = isEditing ? STATUS_FLOW[order.status] : []

  return (
    <>
      <PageHeader
        title={isEditing ? order.order_number : "New Order"}
        description={isEditing ? order.customer.name : "Create a customer order."}
      >
        <div className="flex items-center gap-2">
          {isEditing && <StatusBadge status={order.status} />}
          {isEditing && nextStatuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === "cancelled" ? "ghost" : "outline"}
              className={s === "cancelled" ? "text-destructive hover:text-destructive" : ""}
              onClick={() => setStatusAction(s)}
            >
              {s === "confirmed" ? "Confirm" :
               s === "in_production" ? "Start Production" :
               s === "shipped" ? "Mark Shipped" :
               s === "delivered" ? "Mark Delivered" :
               s === "cancelled" ? "Cancel Order" : s}
            </Button>
          ))}
        </div>
      </PageHeader>

      <div className="p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              {isEditing ? (
                <p className="text-sm font-medium py-2">{order.customer.name}</p>
              ) : (
                <Select value={customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMappings ? "Loading..." : "Select customer..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={order?.notes ?? ""}
                rows={1}
                className="resize-none"
                disabled={readOnly}
              />
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <h2 className="text-sm font-medium mb-3">Line Items</h2>

            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                {customerId ? "No products mapped for this customer." : "Select a customer to load products."}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-11 gap-2 px-3 pb-1">
                  <span className="col-span-4 text-xs text-muted-foreground">Product</span>
                  <span className="col-span-2 text-xs text-muted-foreground">Customer SKU</span>
                  <span className="col-span-2 text-xs text-muted-foreground">Unit Price</span>
                  <span className="col-span-1 text-xs text-muted-foreground">Qty</span>
                  <span className="col-span-2 text-xs text-muted-foreground">Total</span>
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid sm:grid-cols-11 gap-2 p-3 rounded-lg border border-border items-center">
                    <div className="sm:col-span-4 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{item.product_sku}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        value={item.customer_sku}
                        onChange={(e) => updateItem(i, "customer_sku", e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                        disabled={readOnly}
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatCurrency(item.unit_price * item.quantity, item.currency)}
                      </span>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t border-border">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                  <p className="text-xl font-semibold">{formatCurrency(total, currency)}</p>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </div>
          )}
        </form>
      </div>

      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={(o) => !o && setStatusAction(null)}
        title="Update order status?"
        description={`Move this order to "${statusAction}"?`}
        confirmLabel="Confirm"
        variant={statusAction === "cancelled" ? "destructive" : "default"}
        onConfirm={() => statusAction && handleStatusChange(statusAction)}
      />
    </>
  )
}
