"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Artisan } from "@/types"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { StatusFilter } from "@/components/shared/status-filter"
import { ArtisanSheet } from "@/features/artisans/artisan-sheet"
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
import { Paintbrush, MoreHorizontal, Plus, Pencil, Archive, RotateCcw } from "lucide-react"
import { archiveArtisan, restoreArtisan } from "@/lib/actions/artisans"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface ArtisansClientProps {
  artisans: Artisan[]
}

export function ArtisansClient({ artisans }: ArtisansClientProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Artisan | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Artisan | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const canEdit = useCanEdit()

  const filtered = artisans.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.location ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.specializations ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  function handleArchiveToggle(artisan: Artisan) {
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
      setArchiveTarget(null)
    })
  }

  const columns: ColumnDef<Artisan>[] = [
    {
      accessorKey: "name",
      header: "Artisan",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          {row.original.location && (
            <p className="text-xs text-muted-foreground">{row.original.location}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "specializations",
      header: "Specializations",
      cell: ({ row }) => (
        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
          {row.original.specializations ?? "—"}
        </p>
      ),
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.phone && <p>{row.original.phone}</p>}
          {row.original.email && <p>{row.original.email}</p>}
          {!row.original.phone && !row.original.email && "—"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "created_at",
      header: "Added",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        if (!canEdit) return null
        const artisan = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  setEditTarget(artisan)
                  setSheetOpen(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={artisan.status === "archived" ? "text-foreground" : "text-destructive"}
                onClick={(e) => {
                  e.stopPropagation()
                  setArchiveTarget(artisan)
                }}
              >
                {artisan.status === "archived" ? (
                  <><RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-2" /> Archive</>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader title="Artisans" description="Manage your artisan network.">
        {canEdit && (
          <Button
            size="sm"
            onClick={() => {
              setEditTarget(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> New Artisan
          </Button>
        )}
      </PageHeader>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search artisans..."
            className="max-w-xs"
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
            icon={Paintbrush}
            title="No artisans found"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Add your first artisan to get started."
            }
            action={
              canEdit
                ? {
                    label: "New Artisan",
                    onClick: () => {
                      setEditTarget(null)
                      setSheetOpen(true)
                    },
                  }
                : undefined
            }
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            onRowClick={(row) => router.push(`/artisans/${row.id}`)}
          />
        )}
      </div>

      <ArtisanSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setEditTarget(null)
        }}
        artisan={editTarget}
        onSuccess={() => {
          setSheetOpen(false)
          setEditTarget(null)
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title={archiveTarget?.status === "archived" ? "Restore artisan?" : "Archive artisan?"}
        description={
          archiveTarget?.status === "archived"
            ? `Restore "${archiveTarget?.name}"?`
            : `Archive "${archiveTarget?.name}"? They will no longer appear in active lists.`
        }
        confirmLabel={archiveTarget?.status === "archived" ? "Restore" : "Archive"}
        variant={archiveTarget?.status === "archived" ? "default" : "destructive"}
        onConfirm={() => archiveTarget && handleArchiveToggle(archiveTarget)}
      />
    </>
  )
}
