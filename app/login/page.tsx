"use client"

import { useState } from "react"
import { login } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Loader2, AlertCircle } from "lucide-react"
import { MosaicLogo, MosaicWordmark } from "@/components/shared/mosaic-logo"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4"
      style={{
        backgroundImage:
          "radial-gradient(circle, hsl(var(--border) / 0.7) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Card */}
      <div className="w-full max-w-[400px] bg-card border border-border/50 rounded-2xl shadow-xl shadow-black/[0.06] p-10">

        {/* Branding — centred */}
        <div className="flex flex-col items-center text-center mb-8">
          <MosaicLogo size={68} />
          <div className="mt-3 mb-7">
            <MosaicWordmark height={47} />
          </div>
          <Separator className="w-full mb-7" />
          <p className="text-lg font-semibold tracking-tight">Sign in to Mosaic</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crafted product management
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
              autoFocus
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
            >
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="h-11"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11 mt-1" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in →
          </Button>
        </form>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground/50">
        © {new Date().getFullYear()} Mosaic
      </p>
    </div>
  )
}
