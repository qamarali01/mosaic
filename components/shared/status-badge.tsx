import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { QuoteStatus, OrderStatus, RecordStatus, AssignmentStatus } from "@/types"

type StatusValue = RecordStatus | QuoteStatus | OrderStatus | AssignmentStatus | string

const statusConfig: Record<string, { label: string; className: string }> = {
  // Record status
  active:        { label: "Active",        className: "bg-[#C8DDD0] text-[#2E5040] border-[#4A6B54] dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800" },
  archived:      { label: "Archived",      className: "bg-[#D8CCBC] text-[#4A4030] border-[#8A7A60] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
  // Quote status
  draft:         { label: "Draft",         className: "bg-[#D8CCBC] text-[#4A4030] border-[#8A7A60] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700" },
  sent:          { label: "Sent",          className: "bg-[#B8C8D8] text-[#1E2E3E] border-[#2C3E50] dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800" },
  accepted:      { label: "Accepted",      className: "bg-[#C8DDD0] text-[#2E5040] border-[#4A6B54] dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800" },
  rejected:      { label: "Rejected",      className: "bg-[#DDB8B0] text-[#5E2018] border-[#8B3A2F] dark:bg-red-900/40 dark:text-red-300 dark:border-red-800" },
  // Order status
  pending:       { label: "Pending",       className: "bg-[#E8D5A0] text-[#6B4A10] border-[#B08A3E] dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800" },
  confirmed:     { label: "Confirmed",     className: "bg-[#B8C8D8] text-[#1E2E3E] border-[#2C3E50] dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800" },
  in_production: { label: "In Production", className: "bg-[#CBBEDA] text-[#3A2850] border-[#5B4A6B] dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800" },
  shipped:       { label: "Shipped",       className: "bg-[#A8CCBA] text-[#1E3E2E] border-[#3A5A46] dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800" },
  delivered:     { label: "Delivered",     className: "bg-[#C8DDD0] text-[#2E5040] border-[#4A6B54] dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800" },
  cancelled:     { label: "Cancelled",     className: "bg-[#DDB8B0] text-[#5E2018] border-[#8B3A2F] dark:bg-red-900/40 dark:text-red-300 dark:border-red-800" },
  // Assignment status
  assigned:      { label: "Assigned",      className: "bg-[#B8C8D8] text-[#1E2E3E] border-[#2C3E50] dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800" },
  in_progress:   { label: "In Progress",   className: "bg-[#E8D5A0] text-[#6B4A10] border-[#B08A3E] dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800" },
  completed:     { label: "Completed",     className: "bg-[#C8DDD0] text-[#2E5040] border-[#4A6B54] dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800" },
}

interface StatusBadgeProps {
  status: StatusValue
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-[#D8CCBC] text-[#4A4030] border-[#8A7A60]",
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}
