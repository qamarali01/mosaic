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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserRole } from "@/types"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "sales", "viewer"] },
  { href: "/products", label: "Products", icon: Package, roles: ["admin", "sales", "viewer"] },
  { href: "/collections", label: "Collections", icon: Layers, roles: ["admin", "sales", "viewer"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["admin", "sales", "viewer"] },
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
          "flex flex-col h-full border-r border-border bg-background transition-all duration-200 ease-in-out",
          collapsed ? "w-14" : "w-52"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-14 border-b border-border shrink-0",
          collapsed ? "px-3 justify-center" : "px-4 gap-2.5"
        )}>
          <div className="w-6 h-6 bg-foreground rounded-md shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight truncate">PIM</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            const item = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                  collapsed ? "justify-center w-full" : "",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{item}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              )
            }

            return item
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-border">
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 w-full rounded-md px-2 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors",
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
