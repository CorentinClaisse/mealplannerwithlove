"use client"

import { useState } from "react"
import { Check, ChefHat, Clock, MoreVertical, Trash2, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDeleteMealEntry, useToggleMealComplete } from "@/hooks/use-meal-plan"
import type { MealEntry } from "@/types/meal-plan"
import { cn } from "@/lib/utils/cn"

interface MealCardProps {
  entry: MealEntry
}

export function MealCard({ entry }: MealCardProps) {
  const [showActions, setShowActions] = useState(false)
  const deleteMealEntry = useDeleteMealEntry()
  const toggleComplete = useToggleMealComplete()

  const title = entry.recipe?.title || entry.custom_meal_name || "Meal"
  const isCompleted = entry.is_completed
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

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
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

          {/* Actions Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="w-3 h-3" />
            </Button>

            {showActions && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowActions(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg p-1 min-w-[120px]">
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
