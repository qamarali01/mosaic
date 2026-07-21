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
    <div className={cn("flex items-center gap-0.5 bg-muted rounded-md p-0.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-2.5 py-1 rounded text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
