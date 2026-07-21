import { createClient } from "@/lib/supabase/server"
import { Package, Layers, Users, FileText, ShoppingCart } from "lucide-react"
import Link from "next/link"

async function getStats() {
  const supabase = await createClient()

  const [products, collections, customers, quotes, orders] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("collections").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("quotes").select("id", { count: "exact", head: true }).in("status", ["draft", "sent"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["pending", "confirmed", "in_production", "shipped"]),
  ])

  return {
    products: products.count ?? 0,
    collections: collections.count ?? 0,
    customers: customers.count ?? 0,
    quotes: quotes.count ?? 0,
    orders: orders.count ?? 0,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    { label: "Active Products", value: stats.products, icon: Package, href: "/products" },
    { label: "Collections", value: stats.collections, icon: Layers, href: "/collections" },
    { label: "Active Customers", value: stats.customers, icon: Users, href: "/customers" },
    { label: "Open Quotes", value: stats.quotes, icon: FileText, href: "/quotes" },
    { label: "Active Orders", value: stats.orders, icon: ShoppingCart, href: "/orders" },
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of your catalog and sales activity.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group p-4 rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
