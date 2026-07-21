"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  CustomerWithRelations,
  CustomerContact,
  CustomerAddress,
  CustomerProductMappingWithRelations,
  Product,
} from "@/types"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  createContact, updateContact, deleteContact,
  upsertAddress, deleteAddress,
  upsertMapping, deleteMapping,
} from "@/lib/actions/customers"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { StatusBadge } from "@/components/shared/status-badge"
import { BackButton } from "@/components/shared/back-button"
import { formatCurrency, formatDate } from "@/lib/utils"
import { CustomerSheet } from "@/features/customers/customer-sheet"
import {
  Plus, MoreHorizontal, Pencil, Trash2, Loader2,
  Phone, Mail, MapPin, Star, Package,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "JPY", "CNY", "SGD"]

interface CustomerDetailClientProps {
  customer: CustomerWithRelations
  mappings: CustomerProductMappingWithRelations[]
  products: Product[]
}

export function CustomerDetailClient({ customer, mappings, products }: CustomerDetailClientProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)

  // Contact state
  const [contactSheetOpen, setContactSheetOpen] = useState(false)
  const [editContact, setEditContact] = useState<CustomerContact | null>(null)
  const [deleteContactTarget, setDeleteContactTarget] = useState<CustomerContact | null>(null)

  // Address state
  const [addressSheetOpen, setAddressSheetOpen] = useState(false)
  const [editAddress, setEditAddress] = useState<CustomerAddress | null>(null)
  const [deleteAddressTarget, setDeleteAddressTarget] = useState<CustomerAddress | null>(null)

  // Mapping state
  const [mappingSheetOpen, setMappingSheetOpen] = useState(false)
  const [editMapping, setEditMapping] = useState<CustomerProductMappingWithRelations | null>(null)
  const [deleteMappingTarget, setDeleteMappingTarget] = useState<CustomerProductMappingWithRelations | null>(null)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [mappingCurrency, setMappingCurrency] = useState(customer.currency)

  const [isPending, startTransition] = useTransition()

  // ── Contacts ─────────────────────────────────────────────────────────────
  function handleContactSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = editContact
        ? await updateContact(editContact.id, customer.id, formData)
        : await createContact(customer.id, formData)
      if (result.success) { toast.success(editContact ? "Contact updated" : "Contact added"); setContactSheetOpen(false); router.refresh() }
      else toast.error(result.error)
    })
  }

  function handleDeleteContact() {
    if (!deleteContactTarget) return
    startTransition(async () => {
      const result = await deleteContact(deleteContactTarget.id, customer.id)
      if (result.success) { toast.success("Contact removed"); router.refresh() }
      else toast.error(result.error)
      setDeleteContactTarget(null)
    })
  }

  // ── Addresses ─────────────────────────────────────────────────────────────
  const [addressType, setAddressType] = useState<"billing" | "shipping">("billing")

  function handleAddressSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("type", addressType)
    startTransition(async () => {
      const result = await upsertAddress(customer.id, editAddress?.id ?? null, formData)
      if (result.success) { toast.success(editAddress ? "Address updated" : "Address added"); setAddressSheetOpen(false); router.refresh() }
      else toast.error(result.error)
    })
  }

  function handleDeleteAddress() {
    if (!deleteAddressTarget) return
    startTransition(async () => {
      const result = await deleteAddress(deleteAddressTarget.id, customer.id)
      if (result.success) { toast.success("Address removed"); router.refresh() }
      else toast.error(result.error)
      setDeleteAddressTarget(null)
    })
  }

  // ── Mappings ──────────────────────────────────────────────────────────────
  function handleMappingSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("currency", mappingCurrency)
    const productId = editMapping ? editMapping.product_id : selectedProductId
    startTransition(async () => {
      const result = await upsertMapping(customer.id, productId, editMapping?.id ?? null, formData)
      if (result.success) { toast.success(editMapping ? "Mapping updated" : "Product mapped"); setMappingSheetOpen(false); router.refresh() }
      else toast.error(result.error)
    })
  }

  function handleDeleteMapping() {
    if (!deleteMappingTarget) return
    startTransition(async () => {
      const result = await deleteMapping(deleteMappingTarget.id, customer.id, deleteMappingTarget.product_id)
      if (result.success) { toast.success("Mapping removed"); router.refresh() }
      else toast.error(result.error)
      setDeleteMappingTarget(null)
    })
  }

  // Unmapped products (not yet mapped for this customer)
  const mappedProductIds = new Set(mappings.map((m) => m.product_id))
  const unmappedProducts = products.filter((p) => !mappedProductIds.has(p.id))

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <BackButton href="/customers" label="Customers" />
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-semibold">{customer.name}</h1>
            <StatusBadge status={customer.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-mono">{customer.currency}</span>
            {customer.payment_terms && <span>{customer.payment_terms}</span>}
            <span>Added {formatDate(customer.created_at)}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="px-6 pt-4">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Products ({mappings.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({customer.contacts.length})</TabsTrigger>
          <TabsTrigger value="addresses">Addresses ({customer.addresses.length})</TabsTrigger>
        </TabsList>

        {/* ── Products Tab ───────────────────────────────────────────── */}
        <TabsContent value="products">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Customer-specific SKUs, pricing, and terms.</p>
            <Button size="sm" variant="outline" onClick={() => { setEditMapping(null); setSelectedProductId(""); setMappingCurrency(customer.currency); setMappingSheetOpen(true) }}>
              <Plus className="mr-1.5 h-4 w-4" /> Map Product
            </Button>
          </div>

          {mappings.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No products mapped yet.</div>
          ) : (
            <div className="space-y-2">
              {mappings.map((m) => (
                <div key={m.id} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-accent/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{m.product.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{m.product.internal_sku}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Customer SKU: <span className="font-mono text-foreground">{m.customer_sku}</span></span>
                      <span>{formatCurrency(m.price, m.currency)}</span>
                      {m.moq && <span>MOQ: {m.moq}</span>}
                      {m.lead_time && <span>Lead time: {m.lead_time}</span>}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditMapping(m); setMappingCurrency(m.currency); setMappingSheetOpen(true) }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteMappingTarget(m)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Contacts Tab ───────────────────────────────────────────── */}
        <TabsContent value="contacts">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">People at this company.</p>
            <Button size="sm" variant="outline" onClick={() => { setEditContact(null); setContactSheetOpen(true) }}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Contact
            </Button>
          </div>

          {customer.contacts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No contacts yet.</div>
          ) : (
            <div className="space-y-2">
              {customer.contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between p-4 rounded-lg border border-border">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm">{contact.name}</span>
                      {contact.is_primary && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                          <Star className="h-2.5 w-2.5" /> Primary
                        </span>
                      )}
                    </div>
                    {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
                    <div className="flex items-center gap-3 mt-1">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                          <Mail className="h-3 w-3" /> {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {contact.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditContact(contact); setContactSheetOpen(true) }}>
                        <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteContactTarget(contact)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Addresses Tab ──────────────────────────────────────────── */}
        <TabsContent value="addresses">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Billing and shipping addresses.</p>
            <Button size="sm" variant="outline" onClick={() => { setEditAddress(null); setAddressType("billing"); setAddressSheetOpen(true) }}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Address
            </Button>
          </div>

          {customer.addresses.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No addresses yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {customer.addresses.map((addr) => (
                <div key={addr.id} className="p-4 rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${addr.type === "billing" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                      {addr.type === "billing" ? "Billing" : "Shipping"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditAddress(addr); setAddressType(addr.type); setAddressSheetOpen(true) }}>
                          <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAddressTarget(addr)}>
                          <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p>{addr.address_line1}</p>
                    {addr.address_line2 && <p>{addr.address_line2}</p>}
                    <p>{[addr.city, addr.state, addr.postal_code].filter(Boolean).join(", ")}</p>
                    <p className="text-muted-foreground">{addr.country}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Customer Edit Sheet ──────────────────────────────────────── */}
      <CustomerSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
        onSuccess={() => { setEditOpen(false); router.refresh() }}
      />

      {/* ── Contact Sheet ─────────────────────────────────────────────── */}
      <Sheet open={contactSheetOpen} onOpenChange={(o) => { setContactSheetOpen(o); if (!o) setEditContact(null) }}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader className="mb-6">
            <SheetTitle>{editContact ? "Edit Contact" : "Add Contact"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name *</Label>
              <Input id="c-name" name="name" defaultValue={editContact?.name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-title">Title</Label>
              <Input id="c-title" name="title" defaultValue={editContact?.title ?? ""} placeholder="e.g. Purchasing Manager" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" name="email" type="email" defaultValue={editContact?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" name="phone" defaultValue={editContact?.phone ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c-primary" name="is_primary" value="true" defaultChecked={editContact?.is_primary ?? false} className="rounded border-border" />
              <Label htmlFor="c-primary" className="font-normal">Primary contact</Label>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setContactSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editContact ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Address Sheet ─────────────────────────────────────────────── */}
      <Sheet open={addressSheetOpen} onOpenChange={(o) => { setAddressSheetOpen(o); if (!o) setEditAddress(null) }}>
        <SheetContent className="sm:max-w-sm overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editAddress ? "Edit Address" : "Add Address"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={addressType} onValueChange={(v) => setAddressType(v as "billing" | "shipping")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="shipping">Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-line1">Address Line 1 *</Label>
              <Input id="a-line1" name="address_line1" defaultValue={editAddress?.address_line1 ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-line2">Address Line 2</Label>
              <Input id="a-line2" name="address_line2" defaultValue={editAddress?.address_line2 ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-city">City *</Label>
                <Input id="a-city" name="city" defaultValue={editAddress?.city ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-state">State</Label>
                <Input id="a-state" name="state" defaultValue={editAddress?.state ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="a-postal">Postal Code</Label>
                <Input id="a-postal" name="postal_code" defaultValue={editAddress?.postal_code ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-country">Country *</Label>
                <Input id="a-country" name="country" defaultValue={editAddress?.country ?? ""} required />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddressSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editAddress ? "Save" : "Add"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ── Mapping Sheet ─────────────────────────────────────────────── */}
      <Sheet open={mappingSheetOpen} onOpenChange={(o) => { setMappingSheetOpen(o); if (!o) setEditMapping(null) }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>{editMapping ? "Edit Product Mapping" : "Map Product"}</SheetTitle>
            <SheetDescription>
              {editMapping
                ? `${editMapping.product.name} — ${editMapping.product.internal_sku}`
                : "Link a product with customer-specific details."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleMappingSubmit} className="space-y-4">
            {!editMapping && (
              <div className="space-y-1.5">
                <Label>Product *</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unmappedProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-xs mr-2 text-muted-foreground">{p.internal_sku}</span>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-sku">Customer SKU *</Label>
                <Input id="m-sku" name="customer_sku" defaultValue={editMapping?.customer_sku ?? ""} className="font-mono" required />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={mappingCurrency} onValueChange={setMappingCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-desc">Customer Description</Label>
              <Input id="m-desc" name="customer_description" defaultValue={editMapping?.customer_description ?? ""} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-price">Unit Price *</Label>
                <Input id="m-price" name="price" type="number" step="0.01" min="0" defaultValue={editMapping?.price ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-moq">MOQ</Label>
                <Input id="m-moq" name="moq" type="number" min="0" defaultValue={editMapping?.moq ?? ""} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-leadtime">Lead Time</Label>
              <Input id="m-leadtime" name="lead_time" defaultValue={editMapping?.lead_time ?? ""} placeholder="e.g. 4-6 weeks" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-packaging">Packaging Notes</Label>
              <Textarea id="m-packaging" name="packaging_notes" defaultValue={editMapping?.packaging_notes ?? ""} rows={2} className="resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setMappingSheetOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isPending || (!editMapping && !selectedProductId)}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editMapping ? "Save changes" : "Map Product"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirm dialogs */}
      <ConfirmDialog open={!!deleteContactTarget} onOpenChange={(o) => !o && setDeleteContactTarget(null)}
        title="Delete contact?" description={`Remove ${deleteContactTarget?.name}?`}
        confirmLabel="Delete" onConfirm={handleDeleteContact} />

      <ConfirmDialog open={!!deleteAddressTarget} onOpenChange={(o) => !o && setDeleteAddressTarget(null)}
        title="Delete address?" description="This address will be permanently removed."
        confirmLabel="Delete" onConfirm={handleDeleteAddress} />

      <ConfirmDialog open={!!deleteMappingTarget} onOpenChange={(o) => !o && setDeleteMappingTarget(null)}
        title="Remove product mapping?" description={`Remove mapping for ${deleteMappingTarget?.product.name}? This won't affect existing quotes.`}
        confirmLabel="Remove" onConfirm={handleDeleteMapping} />
    </div>
  )
}
