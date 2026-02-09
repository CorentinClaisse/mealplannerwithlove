"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      {children}
    </div>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

export function DialogContent({
  children,
  className,
  onClose,
}: DialogContentProps) {
  return (
    <div
      className={cn(
        "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
        "w-[calc(100%-2rem)] max-w-lg max-h-[85vh] overflow-auto",
        "bg-background rounded-2xl shadow-lg",
        "animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  )
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-4 pt-4 pb-2", className)}>
      {children}
    </div>
  )
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={cn("text-lg font-semibold", className)}>
      {children}
    </h2>
  )
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("px-4 py-2", className)}>{children}</div>
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-4 py-4 flex gap-2 justify-end", className)}>
      {children}
    </div>
  )
}
