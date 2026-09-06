import { cn } from "@/lib/utils"
import { BackButton } from "@/components/shared/back-button"

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  back?: { href: string; label: string }
}

export function PageHeader({ title, description, children, className, back }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-8 pt-8 pb-6", className)}>
      <div>
        {back && <BackButton href={back.href} label={back.label} />}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}
