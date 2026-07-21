"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Collection } from "@/types"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { StatusFilter } from "@/components/shared/status-filter"
import { CollectionSheet } from "@/features/collections/collection-sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { useCanEdit } from "@/components/shared/user-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ColumnDef } from "@tanstack/react-table"
import { Layers, MoreHorizontal, Plus, Pencil, Archive, RotateCcw } from "lucide-react"
import { archiveCollection, restoreCollection } from "@/lib/actions/collections"
import { toast } from "sonner"
import Image from "next/image"
import { formatDate } from "@/lib/utils"

interface CollectionsClientProps {
  collections: Collection[]
}

export function CollectionsClient({ collections }: CollectionsClientProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Collection | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Collection | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const canEdit = useCanEdit()

  const filtered = collections.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  function handleEdit(collection: Collection) {
    setEditTarget(collection)
    setSheetOpen(true)
  }

  function handleArchive(collection: Collection) {
    startTransition(async () => {
      const result =
        collection.status === "archived"
          ? await restoreCollection(collection.id)
          : await archiveCollection(collection.id)

      if (result.success) {
        toast.success(
          collection.status === "archived"
            ? "Collection restored"
            : "Collection archived"
        )
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setArchiveTarget(null)
    })
  }

  const columns: ColumnDef<Collection>[] = [
    {
      accessorKey: "name",
      header: "Collection",
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
              {c.cover_image_url ? (
                <Image src={c.cover_image_url} alt={c.name} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              {c.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{c.description}</p>
              )}
            </div>
          </div>
        )
      },
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
      size: 120,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: "actions",
      size: 50,
      cell: ({ row }) => {
        if (!canEdit) return null
        const c = row.original
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(c)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={c.status === "archived" ? "text-emerald-600" : "text-destructive"}
                  onClick={() => setArchiveTarget(c)}
                >
                  {c.status === "archived" ? (
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
        title="Collections"
        description="Group products into collections for easy browsing."
      >
        {canEdit && (
          <Button
            size="sm"
            onClick={() => { setEditTarget(null); setSheetOpen(true) }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Collection
          </Button>
        )}
      </PageHeader>

      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search collections..."
          className="w-64"
        />
        <StatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "Active", value: "active" },
            { label: "Archived", value: "archived" },
            { label: "All", value: "all" },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No collections yet"
          description="Create a collection to group your products."
          action={canEdit ? { label: "New Collection", onClick: () => { setEditTarget(null); setSheetOpen(true) } } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(c) => router.push(`/collections/${c.id}`)}
        />
      )}

      <CollectionSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditTarget(null) }}
        collection={editTarget}
        onSuccess={() => { setSheetOpen(false); router.refresh() }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={archiveTarget?.status === "archived" ? "Restore collection?" : "Archive collection?"}
        description={
          archiveTarget?.status === "archived"
            ? `"${archiveTarget?.name}" will be restored and visible again.`
            : `"${archiveTarget?.name}" will be archived. Products in this collection are not affected.`
        }
        confirmLabel={archiveTarget?.status === "archived" ? "Restore" : "Archive"}
        variant={archiveTarget?.status === "archived" ? "default" : "destructive"}
        onConfirm={() => archiveTarget && handleArchive(archiveTarget)}
      />
    </>
  )
}
