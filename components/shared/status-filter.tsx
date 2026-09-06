import { cn } from "@/lib/utils"

type FilterOption = { label: string; value: string }

interface StatusFilterProps {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  className?: string
}

export function StatusFilter({ value, onChange, options, className }: StatusFilterProps) {
  return (
    <div className={cn("flex items-center gap-0.5 bg-muted/60 rounded-full p-0.5 border border-border/40", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150",
            value === opt.value
              ? "bg-background text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
