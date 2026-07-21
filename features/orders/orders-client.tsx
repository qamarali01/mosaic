"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { OrderWithRelations, OrderStatus } from "@/types"
import { DataTable } from "@/components/shared/data-table"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"
import { ShoppingCart, Plus } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface OrdersClientProps {
  orders: OrderWithRelations[]
}

export function OrdersClient({ orders }: OrdersClientProps) {
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filtered = orders.filter((o) =>
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.name.toLowerCase().includes(search.toLowerCase())
  )

  const columns: ColumnDef<OrderWithRelations>[] = [
    {
      accessorKey: "order_number",
      header: "Order",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.original.order_number}</span>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => <span className="text-sm">{row.original.customer.name}</span>,
    },
    {
      id: "quote",
      header: "From Quote",
      size: 130,
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.original.quote?.quote_number ?? "—"}
        </span>
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
      size: 130,
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
      <PageHeader title="Orders" description="Track customer orders from confirmation to delivery.">
        <Button size="sm" onClick={() => router.push("/orders/new")}>
          <Plus className="mr-1.5 h-4 w-4" /> New Order
        </Button>
      </PageHeader>

      <div className="px-6 py-4 flex items-center gap-3 border-b border-border">
        <SearchInput value={search} onChange={setSearch} placeholder="Search orders or customers..." className="w-72" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No orders yet"
          description="Orders are created from accepted quotes or manually."
          action={{ label: "New Order", onClick: () => router.push("/orders/new") }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(o) => router.push(`/orders/${o.id}`)}
        />
      )}
    </>
  )
}
