"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Package, Layers, Users, FileText, ShoppingCart, Paintbrush } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SearchResult {
  id: string
  label: string
  sublabel?: string
  href: string
  type: "product" | "collection" | "customer" | "artisan" | "quote" | "order"
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const typeIcon = {
  product: Package,
  collection: Layers,
  customer: Users,
  artisan: Paintbrush,
  quote: FileText,
  order: ShoppingCart,
}

const typeLabel = {
  product: "Products",
  collection: "Collections",
  customer: "Customers",
  artisan: "Artisans",
  quote: "Quotes",
  order: "Orders",
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  // Clear state when dialog closes
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => {
      setQuery("")
      setResults([])
    }, 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      const t = setTimeout(() => setResults([]), 0)
      return () => clearTimeout(t)
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      const q = `%${query}%`
      const all: SearchResult[] = []

      const [products, collections, customers, artisans, quotes, orders, mappings] = await Promise.all([
        supabase.from("products").select("id, internal_sku, name").or(`name.ilike.${q},internal_sku.ilike.${q}`).eq("status", "active").limit(5),
        supabase.from("collections").select("id, name").ilike("name", q).eq("status", "active").limit(5),
        supabase.from("customers").select("id, name").ilike("name", q).eq("status", "active").limit(5),
        supabase.from("artisans").select("id, name, location").ilike("name", q).eq("status", "active").limit(5),
        supabase.from("quotes").select("id, quote_number, status").ilike("quote_number", q).limit(5),
        supabase.from("orders").select("id, order_number, status").ilike("order_number", q).limit(5),
        supabase.from("customer_product_mappings").select("id, customer_sku, product:products(id, name), customer:customers(name)").ilike("customer_sku", q).limit(5),
      ])

      products.data?.forEach((p) =>
        all.push({ id: p.id, label: p.name, sublabel: p.internal_sku, href: `/products/${p.id}`, type: "product" })
      )
      mappings.data?.forEach((m) => {
        if (!m.product) return
        const product = (Array.isArray(m.product) ? m.product[0] : m.product) as { id: string; name: string } | null
        const customer = (Array.isArray(m.customer) ? m.customer[0] : m.customer) as { name: string } | null
        if (!product) return
        // Skip if this product already appeared from a name/sku match
        if (all.find((r) => r.id === product.id && r.type === "product")) return
        all.push({
          id: product.id,
          label: product.name,
          sublabel: `${m.customer_sku}${customer ? ` · ${customer.name}` : ""}`,
          href: `/products/${product.id}`,
          type: "product",
        })
      })
      collections.data?.forEach((c) =>
        all.push({ id: c.id, label: c.name, href: `/collections/${c.id}`, type: "collection" })
      )
      customers.data?.forEach((c) =>
        all.push({ id: c.id, label: c.name, href: `/customers/${c.id}`, type: "customer" })
      )
      artisans.data?.forEach((a) =>
        all.push({ id: a.id, label: a.name, sublabel: a.location ?? undefined, href: `/artisans/${a.id}`, type: "artisan" })
      )
      quotes.data?.forEach((q) =>
        all.push({ id: q.id, label: q.quote_number, sublabel: q.status, href: `/quotes/${q.id}`, type: "quote" })
      )
      orders.data?.forEach((o) =>
        all.push({ id: o.id, label: o.order_number, sublabel: o.status, href: `/orders/${o.id}`, type: "order" })
      )

      setResults(all)
      setLoading(false)
    }, 200)

    return () => clearTimeout(timeout)
  }, [query])

  function handleSelect(href: string) {
    router.push(href)
    onOpenChange(false)
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 shadow-lg">
        {/* shouldFilter={false} disables cmdk's built-in fuzzy filter — we handle filtering via Supabase */}
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search products, customers, artisans, quotes..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.length < 2 && (
              <CommandEmpty className="py-6 px-4 text-sm text-muted-foreground text-left">
                Type at least 2 characters to search...
              </CommandEmpty>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {(Object.entries(grouped) as [keyof typeof typeLabel, SearchResult[]][]).map(
              ([type, items], i) => {
                const Icon = typeIcon[type]
                return (
                  <CommandGroup key={type} heading={typeLabel[type]}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => handleSelect(item.href)}
                        className="gap-2"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span>{item.label}</span>
                        {item.sublabel && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {item.sublabel}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              }
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
