import { cn } from "@/lib/utils"
import { QuoteStatus, OrderStatus, RecordStatus } from "@/types"

type StatusValue = RecordStatus | QuoteStatus | OrderStatus | string

const statusConfig: Record<string, { label: string; className: string }> = {
  // Record status
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  archived: { label: "Archived", className: "bg-zinc-100 text-zinc-500 border-zinc-200" },
  // Quote status
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  sent: { label: "Sent", className: "bg-blue-50 text-blue-700 border-blue-100" },
  accepted: { label: "Accepted", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  rejected: { label: "Rejected", className: "bg-red-50 text-red-600 border-red-100" },
  // Order status
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-100" },
  confirmed: { label: "Confirmed", className: "bg-blue-50 text-blue-700 border-blue-100" },
  in_production: { label: "In Production", className: "bg-violet-50 text-violet-700 border-violet-100" },
  shipped: { label: "Shipped", className: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  delivered: { label: "Delivered", className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-100" },
}

interface StatusBadgeProps {
  status: StatusValue
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
