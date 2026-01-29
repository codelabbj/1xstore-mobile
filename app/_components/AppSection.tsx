"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type AppSectionProps = {
  title?: string
  subtitle?: string
  description?: string
  badge?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'highlight' | 'default'
}

export function AppSection({
  title,
  subtitle,
  description,
  badge,
  action,
  children,
  className,
  variant = 'default',
}: AppSectionProps) {
  const isHighlight = variant === 'highlight'

  return (
    <section className={cn("space-y-4", isHighlight && "rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 p-6 dark:from-primary/20 dark:to-primary/10")}>
      {(title || subtitle || badge) && (
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {badge}
            {title ? <h2 className={cn("text-title", isHighlight && "text-foreground")}>{title}</h2> : null}
            {subtitle ? <p className={cn("text-sm font-medium text-muted-foreground", isHighlight && "text-muted-foreground")}>{subtitle}</p> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      <div className={cn(className)}>
        {children}
      </div>
    </section>
  )
}


