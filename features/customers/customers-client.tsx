"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Customer } from "@/types"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { StatusFilter } from "@/components/shared/status-filter"
import { CustomerSheet } from "@/features/customers/customer-sheet"
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
import { Users, MoreHorizontal, Plus, Pencil, Archive, RotateCcw } from "lucide-react"
import { archiveCustomer, restoreCustomer } from "@/lib/actions/customers"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface CustomersClientProps {
  customers: Customer[]
}

export function CustomersClient({ customers }: CustomersClientProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Customer | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const canEdit = useCanEdit()

  const filtered = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  function handleArchiveToggle(customer: Customer) {
    startTransition(async () => {
      const result =
        customer.status === "archived"
          ? await restoreCustomer(customer.id)
          : await archiveCustomer(customer.id)

      if (result.success) {
        toast.success(customer.status === "archived" ? "Customer restored" : "Customer archived")
        router.refresh()
      } else {
        toast.error(result.error)
      }
      setArchiveTarget(null)
    })
  }

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.name}</p>
          {row.original.payment_terms && (
            <p className="text-xs text-muted-foreground">{row.original.payment_terms}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "currency",
      header: "Currency",
      size: 90,
      cell: ({ row }) => (
        <span className="text-sm font-mono text-muted-foreground">{row.original.currency}</span>
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
      header: "Added",
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</span>
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
                <DropdownMenuItem onClick={() => { setEditTarget(c); setSheetOpen(true) }}>
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
      <PageHeader title="Customers" description="Manage customer profiles, contacts, and addresses.">
        {canEdit && (
          <Button size="sm" onClick={() => { setEditTarget(null); setSheetOpen(true) }}>
            <Plus className="mr-1.5 h-4 w-4" /> New Customer
          </Button>
        )}
      </PageHeader>

      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <SearchInput value={search} onChange={setSearch} placeholder="Search customers..." className="w-64" />
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
          icon={Users}
          title="No customers yet"
          description="Add your first customer to start mapping products."
          action={canEdit ? { label: "New Customer", onClick: () => { setEditTarget(null); setSheetOpen(true) } } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(c) => router.push(`/customers/${c.id}`)}
        />
      )}

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditTarget(null) }}
        customer={editTarget}
        onSuccess={() => { setSheetOpen(false); router.refresh() }}
      />

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={archiveTarget?.status === "archived" ? "Restore customer?" : "Archive customer?"}
        description={
          archiveTarget?.status === "archived"
            ? `"${archiveTarget?.name}" will be restored.`
            : `"${archiveTarget?.name}" will be archived. Their mappings and orders are preserved.`
        }
        confirmLabel={archiveTarget?.status === "archived" ? "Restore" : "Archive"}
        variant={archiveTarget?.status === "archived" ? "default" : "destructive"}
        onConfirm={() => archiveTarget && handleArchiveToggle(archiveTarget)}
      />
    </>
  )
}
