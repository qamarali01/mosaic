"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ProductWithRelations } from "@/types"

type CollectionOption = { id: string; name: string }
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { ProductSheet } from "@/features/products/product-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import {
  Package,
  MoreHorizontal,
  Plus,
  Pencil,
  Archive,
  RotateCcw,
} from "lucide-react"
import { archiveProduct, restoreProduct } from "@/lib/actions/products"
import { toast } from "sonner"
import Image from "next/image"
import { formatDate } from "@/lib/utils"

interface ProductsClientProps {
  products: ProductWithRelations[]
  collections: CollectionOption[]
}

export function ProductsClient({ products, collections }: ProductsClientProps) {
  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductWithRelations | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ProductWithRelations | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.internal_sku.toLowerCase().includes(search.toLowerCase())
  )

  function handleEdit(product: ProductWithRelations) {
    setEditTarget(product)
    setSheetOpen(true)
  }

  function handleArchiveToggle(product: ProductWithRelations) {
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
      setArchiveTarget(null)
    })
  }

  const columns: ColumnDef<ProductWithRelations>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const p = row.original
        const thumb = p.images?.[0]?.url
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
              {thumb ? (
                <Image src={thumb} alt={p.name} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{p.internal_sku}</p>
            </div>
          </div>
        )
      },
    },
    {
      id: "collection",
      header: "Collection",
      size: 140,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.collection?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 100,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Created",
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(p)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={p.status === "archived" ? "text-emerald-600" : "text-destructive"}
                  onClick={() => setArchiveTarget(p)}
                >
                  {p.status === "archived" ? (
                    <><RotateCcw className="mr-2 h-3.5 w-3.5" /> Restore</>
                  ) : (
                    <><Archive className="mr-2 h-3.5 w-3.5" /> Archive</>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Products"
        description="Your complete product master — one product, one record."
      >
        <Button
          size="sm"
          onClick={() => { setEditTarget(null); setSheetOpen(true) }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> New Product
        </Button>
      </PageHeader>

      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or SKU..."
          className="w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={search ? "No products match your search" : "No products yet"}
          description={
            search
              ? "Try a different search term."
              : "Add your first product to get started."
          }
          action={
            !search
              ? { label: "New Product", onClick: () => { setEditTarget(null); setSheetOpen(true) } }
              : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(p) => router.push(`/products/${p.id}`)}
        />
      )}

      <ProductSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditTarget(null) }}
        product={editTarget}
        collections={collections}
        onSuccess={() => { setSheetOpen(false); router.refresh() }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={archiveTarget?.status === "archived" ? "Restore product?" : "Archive product?"}
        description={
          archiveTarget?.status === "archived"
            ? `"${archiveTarget?.name}" will be restored and visible again.`
            : `"${archiveTarget?.name}" will be archived. Existing quotes and orders are not affected.`
        }
        confirmLabel={archiveTarget?.status === "archived" ? "Restore" : "Archive"}
        variant={archiveTarget?.status === "archived" ? "default" : "destructive"}
        onConfirm={() => archiveTarget && handleArchiveToggle(archiveTarget)}
      />
    </>
  )
}
