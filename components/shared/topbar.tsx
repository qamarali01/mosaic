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
import { Search, LogOut, Moon, Sun } from "lucide-react"
import { UserProfile } from "@/types"
import { CommandPalette } from "@/components/shared/command-palette"
import { useState } from "react"
import { useTheme } from "next-themes"

interface TopbarProps {
  user: UserProfile
}

export function Topbar({ user }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const initials = user.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() ?? "U"

  const roleColors: Record<string, string> = {
    admin: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    sales: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    viewer: "bg-muted text-muted-foreground",
  }

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 bg-background/80 backdrop-blur-lg border-b border-border/50 shrink-0">
        {/* Search pill */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors group rounded-full bg-muted/50 hover:bg-muted px-4 py-2 border border-border/40 hover:border-border"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground group-hover:border-border transition-colors">
            ⌘K
          </kbd>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 rounded-full hover:bg-accent/50">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">
                  {user.full_name ?? user.email}
                </span>
                <span
                  className={`hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${roleColors[user.role] ?? ""}`}
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
        </div>
      </header>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
