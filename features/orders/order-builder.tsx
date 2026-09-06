"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { OrderWithRelations, OrderStatus, CustomerProductMappingWithRelations, Artisan, ArtisanAssignmentWithRelations, Product } from "@/types"

type CustomerOption = { id: string; name: string; currency: string }
type ActiveProduct = Pick<Product, "id" | "internal_sku" | "name">

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/shared/status-badge"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { OrderAssignments } from "@/features/orders/order-assignments"
import { createOrder, updateOrder, updateOrderStatus } from "@/lib/actions/orders"
import { getMappingsByCustomer, upsertMapping } from "@/lib/actions/customers"
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
  activeProducts: ActiveProduct[]
  order?: OrderWithRelations | null
  artisans?: Artisan[]
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
}

export function OrderBuilder({ customers, activeProducts, order, artisans = [] }: OrderBuilderProps) {
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

  const [availableMappings, setAvailableMappings] = useState<CustomerProductMappingWithRelations[]>([])
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ActiveProduct | null>(null)
  const [inlineForm, setInlineForm] = useState({
    customer_sku: "",
    price: "",
    customer_description: "",
  })

  const [isPending, startTransition] = useTransition()
  const [statusAction, setStatusAction] = useState<OrderStatus | null>(null)

  const customer = customers.find((c) => c.id === customerId)

  async function handleCustomerChange(id: string) {
    setCustomerId(id)
    setItems([])
    setSelectedProduct(null)
    setInlineForm({ customer_sku: "", price: "", customer_description: "" })
    if (!id) {
      setAvailableMappings([])
      return
    }
    setLoadingMappings(true)
    const mappings = await getMappingsByCustomer(id)
    setLoadingMappings(false)
    setAvailableMappings(mappings)
  }

  function addMappedProduct(mapping: CustomerProductMappingWithRelations) {
    setItems((prev) => {
      if (prev.some((i) => i.product_id === mapping.product_id)) return prev
      return [...prev, {
        product_id: mapping.product_id,
        product_name: mapping.product.name,
        product_sku: mapping.product.internal_sku,
        customer_sku: mapping.customer_sku,
        customer_description: mapping.customer_description ?? "",
        quantity: 1,
        unit_price: mapping.price,
        currency: mapping.currency,
      }]
    })
    setCatalogOpen(false)
  }

  function addUnmappedProduct(product: ActiveProduct, form: typeof inlineForm) {
    setItems((prev) => [...prev, {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.internal_sku,
      customer_sku: form.customer_sku || product.internal_sku,
      customer_description: form.customer_description,
      quantity: 1,
      unit_price: parseFloat(form.price) || 0,
      currency: customer?.currency ?? "USD",
    }])
    setCatalogOpen(false)
    setSelectedProduct(null)
    setInlineForm({ customer_sku: "", price: "", customer_description: "" })
  }

  async function addAndSaveMapping(product: ActiveProduct, form: typeof inlineForm) {
    const fd = new FormData()
    fd.set("customer_sku", form.customer_sku || product.internal_sku)
    fd.set("customer_description", form.customer_description)
    fd.set("price", form.price || "0")
    fd.set("currency", customer?.currency ?? "USD")

    const result = await upsertMapping(customerId, product.id, null, fd)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    const mappings = await getMappingsByCustomer(customerId)
    setAvailableMappings(mappings)

    const newMapping = mappings.find((m) => m.product_id === product.id)
    if (newMapping) {
      addMappedProduct(newMapping)
    }

    setSelectedProduct(null)
    setInlineForm({ customer_sku: "", price: "", customer_description: "" })
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const currency = items[0]?.currency ?? customer?.currency ?? "USD"

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customerId) {
      toast.error("Select a customer")
      return
    }
    if (items.length === 0) {
      toast.error("Add at least one item")
      return
    }
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (isEditing) {
        const result = await updateOrder(order.id, {
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
          toast.success("Order saved")
          router.refresh()
        } else {
          toast.error(result.error)
        }
      } else {
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

  const existingAssignments = isEditing ? ((order as unknown as { assignments?: unknown[] }).assignments ?? []) : []
  const hasAssignments = (existingAssignments as { status: string }[]).filter((a) => a.status !== "cancelled").length > 0

  const nextStatuses = isEditing ? STATUS_FLOW[order.status].filter((s) => !(s === "in_production" && hasAssignments)) : []

  const addedProductIds = new Set(items.map((i) => i.product_id))

  return (
    <>
      <PageHeader
        title={isEditing ? order.order_number : "New Order"}
        description={isEditing ? order.customer.name : "Create a customer order."}
        back={{ href: "/orders", label: "Orders" }}
      >
        <div className="flex items-center gap-2">
          {isEditing && <StatusBadge status={order.status} />}
          {isEditing &&
            nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "cancelled" ? "ghost" : "outline"}
                className={s === "cancelled" ? "text-destructive hover:text-destructive" : ""}
                onClick={() => setStatusAction(s)}
              >
                {s === "confirmed"
                  ? "Confirm"
                  : s === "in_production"
                  ? "Start Production"
                  : s === "shipped"
                  ? "Mark Shipped"
                  : s === "delivered"
                  ? "Mark Delivered"
                  : s === "cancelled"
                  ? "Cancel Order"
                  : s}
              </Button>
            ))}
        </div>
      </PageHeader>

      {isEditing ? (
        <Tabs defaultValue="order" className="w-full">
          <div className="px-6 pt-4 border-b border-border">
            <TabsList className="h-9">
              <TabsTrigger value="order" className="text-xs">
                Order Details
              </TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs">
                Production Assignments
                {(order as unknown as { assignments?: unknown[] }).assignments &&
                  (order as unknown as { assignments?: unknown[] }).assignments!.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {(order as unknown as { assignments?: unknown[] }).assignments!.length}
                    </span>
                  )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="order" className="mt-0">
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
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
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

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium">Line Items</h2>
                  </div>

                  {items.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                      No items.
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

                {!readOnly && (
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-0">
            <OrderAssignments
              orderId={order.id}
              orderStatus={order.status}
              items={order.items}
              assignments={(existingAssignments as ArtisanAssignmentWithRelations[]) ?? []}
              artisans={artisans}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="p-6 max-w-4xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Customer *</Label>
                <Select value={customerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMappings ? "Loading..." : "Select customer..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue="" rows={1} className="resize-none" />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium">Line Items</h2>
                {customerId && (
                  <Popover
                    open={catalogOpen}
                    onOpenChange={(open) => {
                      setCatalogOpen(open)
                      if (!open) {
                        setSelectedProduct(null)
                        setInlineForm({ customer_sku: "", price: "", customer_description: "" })
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Plus className="h-3.5 w-3.5" /> Add product
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      {!selectedProduct ? (
                        <Command>
                          <CommandInput placeholder="Search products..." />
                          <CommandList>
                            <CommandEmpty>No products found.</CommandEmpty>
                            <CommandGroup>
                              {activeProducts.map((p) => {
                                const alreadyAdded = addedProductIds.has(p.id)
                                const existingMapping = availableMappings.find((m) => m.product_id === p.id)
                                return (
                                  <CommandItem
                                    key={p.id}
                                    value={p.name}
                                    onSelect={() => {
                                      if (existingMapping) {
                                        addMappedProduct(existingMapping)
                                      } else {
                                        setSelectedProduct(p)
                                        setInlineForm({
                                          customer_sku: p.internal_sku,
                                          price: "",
                                          customer_description: "",
                                        })
                                      }
                                    }}
                                    disabled={alreadyAdded}
                                    className="gap-2"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm truncate">{p.name}</p>
                                      <p className="text-xs font-mono text-muted-foreground">{p.internal_sku}</p>
                                    </div>
                                    {existingMapping && (
                                      <Badge variant="secondary" className="text-[10px]">
                                        Mapped
                                      </Badge>
                                    )}
                                    {alreadyAdded && (
                                      <span className="text-xs text-muted-foreground">Added</span>
                                    )}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      ) : (
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="text-sm font-medium">{selectedProduct.name}</p>
                            <p className="text-xs font-mono text-muted-foreground">{selectedProduct.internal_sku}</p>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Customer SKU</Label>
                              <Input
                                value={inlineForm.customer_sku}
                                onChange={(e) => setInlineForm((f) => ({ ...f, customer_sku: e.target.value }))}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Price (optional)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={inlineForm.price}
                                onChange={(e) => setInlineForm((f) => ({ ...f, price: e.target.value }))}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Description (optional)</Label>
                              <Input
                                value={inlineForm.customer_description}
                                onChange={(e) => setInlineForm((f) => ({ ...f, customer_description: e.target.value }))}
                                className="h-8 text-xs mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs"
                              onClick={() => addUnmappedProduct(selectedProduct, inlineForm)}
                            >
                              Add to order
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => addAndSaveMapping(selectedProduct, inlineForm)}
                            >
                              Add &amp; save mapping
                            </Button>
                          </div>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {items.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  {customerId ? 'No items added. Click "Add product" above.' : "Select a customer first."}
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
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatCurrency(item.unit_price * item.quantity, item.currency)}
                        </span>
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

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </div>
          </form>
        </div>
      )}

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
