"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Collection, ProductWithRelations } from "@/types"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { CollectionSheet } from "@/features/collections/collection-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { archiveCollection, restoreCollection } from "@/lib/actions/collections"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { Pencil, Archive, RotateCcw, Package } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface CollectionDetailClientProps {
  collection: Collection
  products: ProductWithRelations[]
}

export function CollectionDetailClient({ collection, products }: CollectionDetailClientProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleArchiveToggle() {
    startTransition(async () => {
      const result =
        collection.status === "archived"
          ? await restoreCollection(collection.id)
          : await archiveCollection(collection.id)

      if (result.success) {
        toast.success(collection.status === "archived" ? "Restored" : "Archived")
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setArchiveOpen(false)
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-semibold">{collection.name}</h1>
            <StatusBadge status={collection.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""} — Added {formatDate(collection.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={collection.status === "archived" ? "text-emerald-600 hover:text-emerald-600" : "text-muted-foreground"}
            onClick={() => setArchiveOpen(true)}
          >
            {collection.status === "archived" ? (
              <><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore</>
            ) : (
              <><Archive className="mr-1.5 h-3.5 w-3.5" /> Archive</>
            )}
          </Button>
        </div>
      </div>

      <div className="p-6">
        {/* Cover image */}
        {collection.cover_image_url && (
          <div className="mb-8 w-full max-w-xl aspect-video rounded-xl overflow-hidden border border-border">
            <Image
              src={collection.cover_image_url}
              alt={collection.name}
              width={700}
              height={394}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {collection.description && (
          <p className="text-sm text-muted-foreground mb-8 max-w-xl">{collection.description}</p>
        )}

        {/* Products grid */}
        <h2 className="text-sm font-medium mb-4">Products</h2>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products in this collection.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => {
              const thumb = p.images?.[0]?.url
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group rounded-xl border border-border overflow-hidden hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <div className="aspect-square bg-muted">
                    {thumb ? (
                      <Image src={thumb} alt={p.name} width={300} height={300} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate group-hover:text-foreground">{p.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{p.internal_sku}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <CollectionSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        collection={collection}
        onSuccess={() => { setEditOpen(false); router.refresh() }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={collection.status === "archived" ? "Restore collection?" : "Archive collection?"}
        description={
          collection.status === "archived"
            ? "This collection will be visible again."
            : "Products in this collection are not affected."
        }
        confirmLabel={collection.status === "archived" ? "Restore" : "Archive"}
        variant={collection.status === "archived" ? "default" : "destructive"}
        onConfirm={handleArchiveToggle}
      />
    </div>
  )
}
