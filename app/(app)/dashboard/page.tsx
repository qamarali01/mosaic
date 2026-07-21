import { createClient } from "@/lib/supabase/server"
import { Package, Layers, Users, FileText, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency, formatDate } from "@/lib/utils"

async function getDashboardData() {
  const supabase = await createClient()

  const [products, collections, customers, quotes, orders, recentQuotes, recentOrders] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("collections").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
      supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "in_production", "shipped"]),
      supabase
        .from("quotes")
        .select("id, quote_number, status, created_at, customer:customers(name), items:quote_items(unit_price, quantity, currency)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("id, order_number, status, created_at, customer:customers(name), items:order_items(unit_price, quantity, currency)")
        .order("created_at", { ascending: false })
        .limit(5),
    ])

  return {
    stats: {
      products: products.count ?? 0,
      collections: collections.count ?? 0,
      customers: customers.count ?? 0,
      quotes: quotes.count ?? 0,
      orders: orders.count ?? 0,
    },
    recentQuotes: (recentQuotes.data ?? []) as any[],
    recentOrders: (recentOrders.data ?? []) as any[],
  }
}

export default async function DashboardPage() {
  const { stats, recentQuotes, recentOrders } = await getDashboardData()

  const statCards = [
    { label: "Active Products", value: stats.products, icon: Package, href: "/products" },
    { label: "Collections", value: stats.collections, icon: Layers, href: "/collections" },
    { label: "Active Customers", value: stats.customers, icon: Users, href: "/customers" },
    { label: "Open Quotes", value: stats.quotes, icon: FileText, href: "/quotes" },
    { label: "Active Orders", value: stats.orders, icon: ShoppingCart, href: "/orders" },
  ]

  return (
    <div className="p-6 max-w-5xl space-y-8">
      {/* Stat cards */}
      <div>
        <h1 className="text-lg font-semibold mb-4">Dashboard</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group p-4 rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors mb-3" />
                <p className="text-2xl font-semibold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Recent quotes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Recent Quotes</h2>
            <Link href="/quotes" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No quotes yet.</p>
          ) : (
            <div className="space-y-1">
              {recentQuotes.map((q) => {
                const items = q.items ?? []
                const total = items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0)
                const currency = items[0]?.currency ?? "USD"
                return (
                  <Link
                    key={q.id}
                    href={`/quotes/${q.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/40 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium">{q.quote_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{q.customer?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {items.length > 0 && (
                        <span className="text-xs text-muted-foreground">{formatCurrency(total, currency)}</span>
                      )}
                      <StatusBadge status={q.status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Recent Orders</h2>
            <Link href="/orders" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              View all →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No orders yet.</p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((o) => {
                const items = o.items ?? []
                const total = items.reduce((s: number, i: any) => s + i.unit_price * i.quantity, 0)
                const currency = items[0]?.currency ?? "USD"
                return (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono font-medium">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{o.customer?.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {items.length > 0 && (
                        <span className="text-xs text-muted-foreground">{formatCurrency(total, currency)}</span>
                      )}
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
