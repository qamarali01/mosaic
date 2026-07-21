import { AuditLog } from "@/types"
import { formatDate } from "@/lib/utils"
import { Clock, Plus, Pencil, Archive, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const actionConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  create: { label: "Created", icon: Plus, className: "text-emerald-600 bg-emerald-50 border-emerald-100" },
  update: { label: "Updated", icon: Pencil, className: "text-blue-600 bg-blue-50 border-blue-100" },
  archive: { label: "Archived", icon: Archive, className: "text-amber-600 bg-amber-50 border-amber-100" },
  restore: { label: "Restored", icon: RotateCcw, className: "text-violet-600 bg-violet-50 border-violet-100" },
}

interface AuditLogPanelProps {
  logs: AuditLog[]
}

export function AuditLogPanel({ logs }: AuditLogPanelProps) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No history recorded yet.</p>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const config = actionConfig[log.action] ?? {
          label: log.action,
          icon: Clock,
          className: "text-zinc-600 bg-zinc-50 border-zinc-200",
        }
        const Icon = config.icon

        return (
          <div key={log.id} className="flex items-start gap-3">
            <div className={cn(
              "mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center shrink-0",
              config.className
            )}>
              <Icon className="h-3 w-3" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{config.label}</span>
                {log.performed_by_name && (
                  <span className="text-xs text-muted-foreground">by {log.performed_by_name}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(log.performed_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
