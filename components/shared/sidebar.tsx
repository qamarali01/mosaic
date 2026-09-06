"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Package,
  Layers,
  Users,
  FileText,
  ShoppingCart,
  LayoutDashboard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserRole } from "@/types"
import { MosaicLogo, MosaicWordmark } from "@/components/shared/mosaic-logo"

// Multi-colour "Mosaic" wordmark — each letter gets its own mosaic tile colour
function MosaicWordmarkWrapper() {
  return <MosaicWordmark height={22} />
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "viewer"] },
  { href: "/products", label: "Products", icon: Package, roles: ["admin", "sales", "viewer"] },
  { href: "/collections", label: "Collections", icon: Layers, roles: ["admin", "sales", "viewer"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "sales", "viewer"] },
  { href: "/artisans", label: "Artisans", icon: Paintbrush, roles: ["admin", "sales", "viewer"] },
  { href: "/quotes", label: "Quotes", icon: FileText, roles: ["admin", "sales", "viewer"] },
  { href: "/orders", label: "Orders", icon: ShoppingCart, roles: ["admin", "sales", "viewer"] },
  { href: "/settings/users", label: "Settings", icon: Settings, roles: ["admin"] },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  role: UserRole
}

export function Sidebar({ collapsed, onToggle, role }: SidebarProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col h-full border-r border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-border/50 shrink-0",
            collapsed ? "px-[10px] justify-center" : "px-4 gap-2.5"
          )}
        >
          <MosaicLogo size={36} className="shrink-0" />
          {!collapsed && <MosaicWordmarkWrapper />}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            const item = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center w-full" : "",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return item
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-3 border-t border-border/50">
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200",
              collapsed ? "justify-center" : ""
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
