"use client"

import { cn } from "@/lib/utils/cn"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-40 bg-background/80 backdrop-blur-lg px-4 pt-3 pb-2 safe-top", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </header>
  )
}
