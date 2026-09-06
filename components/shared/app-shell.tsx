"use client"

import { useState } from "react"
import { Sidebar } from "@/components/shared/sidebar"
import { Topbar } from "@/components/shared/topbar"
import { UserProvider } from "@/components/shared/user-context"
import { UserProfile } from "@/types"

interface AppShellProps {
  children: React.ReactNode
  user: UserProfile
}

export function AppShell({ children, user }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <UserProvider user={user}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} role={user.role} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar user={user} />
          <main className="flex-1 overflow-y-auto bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
