import React from "react"
import { PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: EmptyStateAction | React.ReactNode
}

function isActionObject(action: unknown): action is EmptyStateAction {
  return (
    typeof action === "object" &&
    action !== null &&
    "label" in action &&
    "onClick" in action
  )
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
        {Icon ? (
          <Icon className="h-7 w-7 text-muted-foreground" />
        ) : (
          <PackageOpen className="h-7 w-7 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      )}
      {action && isActionObject(action) ? (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : (
        action as React.ReactNode
      )}
    </div>
  )
}
