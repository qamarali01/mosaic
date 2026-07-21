"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <h2 className="text-sm font-medium mb-1">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        An unexpected error occurred. Try refreshing or clicking the button below.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
