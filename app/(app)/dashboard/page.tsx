import { createClient } from "@/lib/supabase/server"
import { Package, Layers, Users, FileText, ShoppingCart, Paintbrush } from "lucide-react"
import Link from "next/link"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatCurrency } from "@/lib/utils"

type QuoteWithItems = {
  id: string
  quote_number: string
  status: string
  created_at: string
  customer: { name: string } | null
  items: Array<{ unit_price: number; quantity: number; currency: string }>
}

type OrderWithItems = {
  id: string
  order_number: string
  status: string
  created_at: string
  customer: { name: string } | null
  items: Array<{ unit_price: number; quantity: number; currency: string }>
}

async function getDashboardData() {
  const supabase = await createClient()

  const [
    products,
    collections,
    customers,
    artisans,
    quotes,
    orders,
    activeAssignments,
    overdueAssignments,
    recentQuotes,
    recentOrders,
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("collections").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("artisans").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "in_production", "shipped"]),
    supabase
      .from("artisan_assignments")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "assigned", "in_progress"]),
    supabase
      .from("artisan_assignments")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "assigned", "in_progress"])
      .lt("expected_delivery_date", new Date().toISOString().split("T")[0]),
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
      artisans: artisans.count ?? 0,
      quotes: quotes.count ?? 0,
      orders: orders.count ?? 0,
      activeAssignments: activeAssignments.count ?? 0,
      overdueAssignments: overdueAssignments.count ?? 0,
    },
    recentQuotes: (recentQuotes.data ?? []) as unknown as QuoteWithItems[],
    recentOrders: (recentOrders.data ?? []) as unknown as OrderWithItems[],
  }
}

export default async function DashboardPage() {
  const { stats, recentQuotes, recentOrders } = await getDashboardData()

  const statCards = [
    { label: "Active Products", value: stats.products, icon: Package, href: "/products" },
    { label: "Collections", value: stats.collections, icon: Layers, href: "/collections" },
    { label: "Active Customers", value: stats.customers, icon: Users, href: "/customers" },
    { label: "Active Artisans", value: stats.artisans, icon: Paintbrush, href: "/artisans" },
    { label: "Open Quotes", value: stats.quotes, icon: FileText, href: "/quotes" },
    { label: "Active Orders", value: stats.orders, icon: ShoppingCart, href: "/orders" },
  ]

  return (
    <div className="space-y-8">
      <div className="px-8 pt-8 pb-2">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      </div>

      <div className="px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <p className="text-2xl font-semibold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {(stats.activeAssignments > 0 || stats.overdueAssignments > 0) && (
        <div className="px-8">
          <h2 className="text-sm font-medium mb-3">Production</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/artisans"
              className="group flex items-center gap-4 p-5 rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                <Paintbrush className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{stats.activeAssignments}</p>
                <p className="text-xs text-muted-foreground">Assignments in progress</p>
              </div>
            </Link>
            {stats.overdueAssignments > 0 && (
              <Link
                href="/artisans"
                className="group flex items-center gap-4 p-5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 backdrop-blur-sm hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Paintbrush className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-amber-700 dark:text-amber-400">{stats.overdueAssignments}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">Overdue assignments</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="px-8 grid sm:grid-cols-2 gap-6">
        {/* Recent quotes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Recent Quotes</h2>
            <Link href="/quotes" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View all →
            </Link>
          </div>

          {recentQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No quotes yet.</p>
          ) : (
            <div className="space-y-1">
              {recentQuotes.map((q) => {
                const items = q.items ?? []
                const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
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
            <Link href="/orders" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              View all →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No orders yet.</p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((o) => {
                const items = o.items ?? []
                const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
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
