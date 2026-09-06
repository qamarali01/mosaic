"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/settings/users", label: "Users" },
  { href: "/settings/api-keys", label: "API Keys" },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div>
      <div className="px-8 pt-8 pb-0 border-b border-border/50">
        <h1 className="text-xl font-semibold tracking-tight mb-4">Settings</h1>
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="px-8 py-6">{children}</div>
    </div>
  )
}
