"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Check, ChefHat, Clock, MoreVertical, Trash2, Minus, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDeleteMealEntry, useToggleMealComplete, useUpdateMealEntry } from "@/hooks/use-meal-plan"
import type { MealEntry } from "@/types/meal-plan"
import { cn } from "@/lib/utils/cn"

interface MealCardProps {
  entry: MealEntry
}

export function MealCard({ entry }: MealCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const deleteMealEntry = useDeleteMealEntry()
  const toggleComplete = useToggleMealComplete()
  const updateEntry = useUpdateMealEntry()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const title = entry.recipe?.title || entry.custom_meal_name || "Meal"
  const isCompleted = entry.is_completed
  const servings = entry.servings_multiplier || 1
  const totalTime = entry.recipe
    ? (entry.recipe.prep_time_minutes || 0) +
      (entry.recipe.cook_time_minutes || 0)
    : 0

  const handleToggleComplete = () => {
    toggleComplete.mutate({
      entryId: entry.id,
      isCompleted: !isCompleted,
    })
  }

  const handleDelete = () => {
    deleteMealEntry.mutate(entry.id)
    setShowActions(false)
  }

  const handleMenuClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 120), // menu width, with min left margin
      })
    }
    setShowActions(!showActions)
  }

  return (
    <Card
      className={cn(
        "relative transition-all",
        isCompleted && "opacity-60"
      )}
    >
      <CardContent className="p-2">
        <div className="flex items-start gap-2">
          {/* Completion Toggle */}
          <button
            onClick={handleToggleComplete}
            className={cn(
              "flex-shrink-0 w-5 h-5 rounded-full border-2 mt-0.5",
              "flex items-center justify-center transition-colors",
              isCompleted
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-primary"
            )}
          >
            {isCompleted && <Check className="w-3 h-3" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {entry.recipe?.image_url ? (
              <div className="flex gap-2">
                <img
                  src={entry.recipe.image_url}
                  alt={title}
                  className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium truncate",
                      isCompleted && "line-through"
                    )}
                  >
                    {title}
                  </p>
                  {totalTime > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {totalTime}m
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <ChefHat className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <p
                  className={cn(
                    "text-xs font-medium truncate",
                    isCompleted && "line-through"
                  )}
                >
                  {title}
                </p>
              </div>
            )}
          </div>

          {/* Actions Menu Button */}
          <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            className="w-6 h-6 flex-shrink-0"
            onClick={handleMenuClick}
          >
            <MoreVertical className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>

      {/* Portal Menu - renders at document body level to avoid overflow clipping */}
      {showActions && isMounted && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setShowActions(false)}
          />
          <div
            className="fixed z-[101] bg-background border rounded-lg shadow-lg p-1 min-w-[140px]"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {/* Servings multiplier */}
            <div className="px-3 py-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Servings</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newVal = Math.max(0.5, servings - 0.5)
                    updateEntry.mutate({ entryId: entry.id, data: { servingsMultiplier: newVal } })
                  }}
                  className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-sm font-bold w-8 text-center">{servings}x</span>
                <button
                  onClick={() => {
                    const newVal = servings + 0.5
                    updateEntry.mutate({ entryId: entry.id, data: { servingsMultiplier: newVal } })
                  }}
                  className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </button>
          </div>
        </>,
        document.body
      )}
    </Card>
  )
}
