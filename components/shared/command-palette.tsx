"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Package, Layers, Users, FileText, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SearchResult {
  id: string
  label: string
  sublabel?: string
  href: string
  type: "product" | "collection" | "customer" | "quote" | "order"
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const typeIcon = {
  product: Package,
  collection: Layers,
  customer: Users,
  quote: FileText,
  order: ShoppingCart,
}

const typeLabel = {
  product: "Products",
  collection: "Collections",
  customer: "Customers",
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
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([])
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      const q = `%${query}%`
      const all: SearchResult[] = []

      const [products, collections, customers, quotes, orders] = await Promise.all([
        supabase.from("products").select("id, internal_sku, name").or(`name.ilike.${q},internal_sku.ilike.${q}`).eq("status", "active").limit(5),
        supabase.from("collections").select("id, name").ilike("name", q).eq("status", "active").limit(5),
        supabase.from("customers").select("id, name").ilike("name", q).eq("status", "active").limit(5),
        supabase.from("quotes").select("id, quote_number, status").ilike("quote_number", q).limit(5),
        supabase.from("orders").select("id, order_number, status").ilike("order_number", q).limit(5),
      ])

      products.data?.forEach((p) =>
        all.push({ id: p.id, label: p.name, sublabel: p.internal_sku, href: `/products/${p.id}`, type: "product" })
      )
      collections.data?.forEach((c) =>
        all.push({ id: c.id, label: c.name, href: `/collections/${c.id}`, type: "collection" })
      )
      customers.data?.forEach((c) =>
        all.push({ id: c.id, label: c.name, href: `/customers/${c.id}`, type: "customer" })
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
    setQuery("")
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search products, customers, quotes..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!loading && query.length >= 2 && results.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {query.length < 2 && (
          <CommandEmpty className="py-6 text-sm text-muted-foreground">
            Type at least 2 characters to search...
          </CommandEmpty>
        )}
        {(Object.entries(grouped) as [keyof typeof typeLabel, SearchResult[]][]).map(
          ([type, items], i) => {
            const Icon = typeIcon[type]
            return (
              <CommandGroup key={type} heading={typeLabel[type]}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
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
    </CommandDialog>
  )
}
