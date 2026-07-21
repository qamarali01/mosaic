"use client"

import { logout } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, LogOut, User } from "lucide-react"
import { UserProfile } from "@/types"
import { CommandPalette } from "@/components/shared/command-palette"
import { useState } from "react"

interface TopbarProps {
  user: UserProfile
}

export function Topbar({ user }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? "U"

  const roleColors: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700",
    sales: "bg-blue-100 text-blue-700",
    viewer: "bg-zinc-100 text-zinc-600",
  }

  return (
    <>
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
        {/* Search trigger */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-xs font-mono text-muted-foreground group-hover:border-foreground/30 transition-colors">
            ⌘K
          </kbd>
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-muted">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm">
                {user.full_name ?? user.email}
              </span>
              <span
                className={`hidden sm:inline-flex text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${roleColors[user.role] ?? ""}`}
              >
                {user.role}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium">{user.full_name ?? "User"}</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
