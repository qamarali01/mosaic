"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CustomerProductMappingWithRelations,
  QuoteWithRelations,
  QuoteStatus,
} from "@/types"

type CustomerOption = { id: string; name: string; currency: string }
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
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/shared/status-badge"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  createQuote,
  updateQuote,
  updateQuoteStatus,
} from "@/lib/actions/quotes"
import { createOrderFromQuote } from "@/lib/actions/orders"
import { getMappingsByCustomer } from "@/lib/actions/customers"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, ChevronRight, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"

interface QuoteItem {
  product_id: string
  product_name: string
  product_sku: string
  customer_sku: string
  customer_description: string
  unit_price: number
  currency: string
  quantity: number
  moq: number | null
  lead_time: string | null
}

interface QuoteBuilderProps {
  customers: CustomerOption[]
  quote?: QuoteWithRelations | null
}

const STATUS_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: ["draft"],
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Mark as Sent",
  sent: "Mark as Accepted",
  rejected: "Reopen as Draft",
  accepted: "",
}

export function QuoteBuilder({ customers, quote }: QuoteBuilderProps) {
  const router = useRouter()
  const isEditing = !!quote
  const editable = !quote || quote.status === "draft"

  const [customerId, setCustomerId] = useState(quote?.customer_id ?? "")
  const [items, setItems] = useState<QuoteItem[]>(
    quote?.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product.name,
      product_sku: i.product.internal_sku,
      customer_sku: i.customer_sku,
      customer_description: i.customer_description ?? "",
      unit_price: i.unit_price,
      currency: i.currency,
      quantity: i.quantity,
      moq: i.moq ?? null,
      lead_time: i.lead_time ?? null,
    })) ?? []
  )
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [convertOpen, setConvertOpen] = useState(false)
  const [statusAction, setStatusAction] = useState<QuoteStatus | null>(null)

  const supabase = createClient()

  async function handleCustomerChange(id: string) {
    setCustomerId(id)
    setItems([])
    if (!id) return

    setLoadingMappings(true)
    const mappings = await getMappingsByCustomer(id)
    setLoadingMappings(false)

    if (mappings.length > 0) {
      // Auto-populate items from mappings
      setItems(
        mappings.map((m) => ({
          product_id: m.product_id,
          product_name: m.product.name,
          product_sku: m.product.internal_sku,
          customer_sku: m.customer_sku,
          customer_description: m.customer_description ?? "",
          unit_price: m.price,
          currency: m.currency,
          quantity: 1,
          moq: m.moq ?? null,
          lead_time: m.lead_time ?? null,
        }))
      )
    }
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string | number | null) {
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
      const payload = {
        customer_id: customerId,
        notes: (fd.get("notes") as string) || null,
        valid_until: (fd.get("valid_until") as string) || null,
        items: items.map((item, i) => ({
          product_id: item.product_id,
          customer_sku: item.customer_sku,
          customer_description: item.customer_description || null,
          unit_price: item.unit_price,
          currency: item.currency,
          quantity: item.quantity,
          moq: item.moq,
          lead_time: item.lead_time,
          sort_order: i,
        })),
      }

      const result = isEditing
        ? await updateQuote(quote.id, payload)
        : await createQuote(payload)

      if (result.success) {
        toast.success(isEditing ? "Quote updated" : "Quote created")
        router.push(isEditing ? `/quotes/${quote.id}` : `/quotes/${result.data.id}`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleStatusChange(newStatus: QuoteStatus) {
    startTransition(async () => {
      const result = await updateQuoteStatus(quote!.id, newStatus)
      if (result.success) {
        toast.success(`Quote marked as ${newStatus}`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setStatusAction(null)
    })
  }

  function handleConvertToOrder() {
    if (!quote) return
    startTransition(async () => {
      const result = await createOrderFromQuote(quote)
      if (result.success) {
        toast.success("Order created from quote")
        router.push(`/orders/${result.data.id}`)
      } else {
        toast.error(result.error)
      }
      setConvertOpen(false)
    })
  }

  return (
    <>
      <PageHeader
        title={isEditing ? quote.quote_number : "New Quote"}
        description={isEditing ? quote.customer.name : "Build a customer quotation."}
      >
        <div className="flex items-center gap-2">
          {isEditing && <StatusBadge status={quote.status} />}
          {isEditing && quote.status === "accepted" && (
            <Button size="sm" onClick={() => setConvertOpen(true)} className="gap-1.5">
              <ShoppingCart className="h-4 w-4" /> Convert to Order
            </Button>
          )}
          {isEditing && STATUS_TRANSITIONS[quote.status]?.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatusAction(STATUS_TRANSITIONS[quote.status][0])}
            >
              {STATUS_LABELS[quote.status]}
            </Button>
          )}
          {/* Show "Mark as Rejected" for sent quotes */}
          {isEditing && quote.status === "sent" && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setStatusAction("rejected")}
            >
              Reject
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="p-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer + meta */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1">
              <Label>Customer *</Label>
              {isEditing ? (
                <p className="text-sm font-medium py-2">{quote.customer.name}</p>
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
            <div className="space-y-1.5">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input
                id="valid_until"
                name="valid_until"
                type="date"
                defaultValue={quote?.valid_until ?? ""}
                disabled={!editable}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={quote?.notes ?? ""}
                rows={1}
                className="resize-none"
                disabled={!editable}
              />
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Line Items</h2>
              {loadingMappings && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading products...
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                {customerId ? "No products mapped for this customer." : "Select a customer to load their products."}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header row */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-3 pb-1">
                  <span className="col-span-4 text-xs text-muted-foreground">Product</span>
                  <span className="col-span-2 text-xs text-muted-foreground">Customer SKU</span>
                  <span className="col-span-2 text-xs text-muted-foreground">Unit Price</span>
                  <span className="col-span-1 text-xs text-muted-foreground">Qty</span>
                  <span className="col-span-2 text-xs text-muted-foreground">Total</span>
                  <span className="col-span-1" />
                </div>

                {items.map((item, i) => (
                  <div key={i} className="grid sm:grid-cols-12 gap-2 p-3 rounded-lg border border-border items-center">
                    <div className="sm:col-span-4 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product_name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{item.product_sku}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        value={item.customer_sku}
                        onChange={(e) => updateItem(i, "customer_sku", e.target.value)}
                        className="h-8 text-xs font-mono"
                        disabled={!editable}
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                        disabled={!editable}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                        className="h-8 text-xs"
                        disabled={!editable}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-sm font-medium">
                        {formatCurrency(item.unit_price * item.quantity, item.currency)}
                      </span>
                    </div>
                    {editable && (
                      <div className="sm:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t border-border">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                  <p className="text-xl font-semibold">{formatCurrency(total, currency)}</p>
                </div>
              </div>
            )}
          </div>

          {editable && (
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save changes" : "Create Quote"}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Status change confirmation */}
      <ConfirmDialog
        open={!!statusAction}
        onOpenChange={(o) => !o && setStatusAction(null)}
        title={`Update quote status?`}
        description={`Mark this quote as "${statusAction}"?`}
        confirmLabel="Confirm"
        variant="default"
        onConfirm={() => statusAction && handleStatusChange(statusAction)}
      />

      {/* Convert to order confirmation */}
      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to Order?"
        description={`Create an order from ${quote?.quote_number}? The quote will be marked as accepted.`}
        confirmLabel="Convert to Order"
        variant="default"
        onConfirm={handleConvertToOrder}
      />
    </>
  )
}
