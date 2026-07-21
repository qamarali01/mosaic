"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ProductWithRelations,
  CustomerProductMappingWithRelations,
} from "@/types"

type CollectionOption = { id: string; name: string }
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { ProductSheet } from "@/features/products/product-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { archiveProduct, restoreProduct } from "@/lib/actions/products"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { Pencil, Archive, RotateCcw, FileText, File } from "lucide-react"
import Image from "next/image"

interface ProductDetailClientProps {
  product: ProductWithRelations
  mappings: CustomerProductMappingWithRelations[]
  collections: CollectionOption[]
}

export function ProductDetailClient({ product, mappings, collections }: ProductDetailClientProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedImageIdx, setSelectedImageIdx] = useState(0)
  const [isPending, startTransition] = useTransition()

  function handleArchiveToggle() {
    startTransition(async () => {
      const result =
        product.status === "archived"
          ? await restoreProduct(product.id)
          : await archiveProduct(product.id)

      if (result.success) {
        toast.success(product.status === "archived" ? "Product restored" : "Product archived")
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setArchiveOpen(false)
    })
  }

  const images = product.images?.sort((a, b) => a.sort_order - b.sort_order) ?? []
  const selectedImage = images[selectedImageIdx]

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-semibold">{product.name}</h1>
            <StatusBadge status={product.status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-mono">{product.internal_sku}</span>
            {product.collection && (
              <span>{product.collection.name}</span>
            )}
            <span>Added {formatDate(product.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={product.status === "archived" ? "text-emerald-600 hover:text-emerald-600" : "text-muted-foreground"}
            onClick={() => setArchiveOpen(true)}
          >
            {product.status === "archived" ? (
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Archive className="mr-1.5 h-3.5 w-3.5" />
            )}
            {product.status === "archived" ? "Restore" : "Archive"}
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Image gallery */}
          <div>
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border">
                  <Image
                    src={selectedImage.url}
                    alt={product.name}
                    width={600}
                    height={600}
                    className="w-full h-full object-contain"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImageIdx(i)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                          i === selectedImageIdx ? "border-foreground" : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <Image src={img.url} alt="" width={64} height={64} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square rounded-xl bg-muted border border-dashed border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No images</p>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-6">
            {product.description && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Description</h3>
                <p className="text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Documents */}
            {product.documents && product.documents.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Attachments</h3>
                <div className="space-y-1.5">
                  {product.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                    >
                      <File className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">{doc.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer mappings tab */}
        <div className="mt-10">
          <h2 className="text-sm font-medium mb-4">Customer Mappings ({mappings.length})</h2>

          {mappings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No customers have mapped this product yet.</p>
          ) : (
            <div className="space-y-2">
              {mappings.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium">{m.customer.name}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{m.customer_sku}</span>
                      <span>{formatCurrency(m.price, m.currency)}</span>
                      {m.moq && <span>MOQ: {m.moq}</span>}
                      {m.lead_time && <span>{m.lead_time}</span>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => router.push(`/customers/${m.customer_id}`)}
                  >
                    View Customer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        product={product}
        collections={collections}
        onSuccess={() => { setEditOpen(false); router.refresh() }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={product.status === "archived" ? "Restore product?" : "Archive product?"}
        description={
          product.status === "archived"
            ? "This product will be visible again."
            : "This product will be archived but existing quotes/orders are preserved."
        }
        confirmLabel={product.status === "archived" ? "Restore" : "Archive"}
        variant={product.status === "archived" ? "default" : "destructive"}
        onConfirm={handleArchiveToggle}
      />
    </div>
  )
}
