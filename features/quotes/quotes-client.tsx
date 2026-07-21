"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { QuoteWithRelations } from "@/types"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { FileText, Plus } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface QuotesClientProps {
  quotes: QuoteWithRelations[]
}

export function QuotesClient({ quotes }: QuotesClientProps) {
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filtered = quotes.filter((q) =>
    q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    q.customer.name.toLowerCase().includes(search.toLowerCase())
  )

  const columns: ColumnDef<QuoteWithRelations>[] = [
    {
      accessorKey: "quote_number",
      header: "Quote",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.quote_number}</span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.customer.name}</span>
      ),
    },
    {
      id: "total",
      header: "Total",
      size: 120,
      cell: ({ row }) => {
        const items = row.original.items
        if (!items?.length) return <span className="text-muted-foreground text-sm">—</span>
        const currency = items[0].currency
        const total = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
        return <span className="text-sm font-medium">{formatCurrency(total, currency)}</span>
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
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
  ]

  return (
    <>
      <PageHeader title="Quotes" description="Build and track customer quotations.">
        <Button size="sm" onClick={() => router.push("/quotes/new")}>
          <Plus className="mr-1.5 h-4 w-4" /> New Quote
        </Button>
      </PageHeader>

      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <SearchInput value={search} onChange={setSearch} placeholder="Search quotes or customers..." className="w-72" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotes yet"
          description="Create your first quote to start the sales process."
          action={{ label: "New Quote", onClick: () => router.push("/quotes/new") }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(q) => router.push(`/quotes/${q.id}`)}
        />
      )}
    </>
  )
}
