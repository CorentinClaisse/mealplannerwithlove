"use client"

import { useState } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAddMealEntry } from "@/hooks/use-meal-plan"
import type { Recipe } from "@/types/recipe"
import type { MealType } from "@/types/meal-plan"
import { Loader2, Check } from "lucide-react"
import { cn } from "@/lib/utils/cn"

interface AddToPlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: Recipe
}

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅" },
  { value: "lunch", label: "Lunch", emoji: "☀️" },
  { value: "dinner", label: "Dinner", emoji: "🌙" },
  { value: "snack", label: "Snack", emoji: "🍿" },
]

export function AddToPlanModal({
  open,
  onOpenChange,
  recipe,
}: AddToPlanModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedMealType, setSelectedMealType] = useState<MealType>("dinner")
  const [isAdded, setIsAdded] = useState(false)

  const addMealEntry = useAddMealEntry()

  // Generate next 7 days
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const handleAdd = async () => {
    try {
      await addMealEntry.mutateAsync({
        date: format(selectedDate, "yyyy-MM-dd"),
        mealType: selectedMealType,
        recipeId: recipe.id,
      })
      setIsAdded(true)
      setTimeout(() => {
        onOpenChange(false)
        setIsAdded(false)
      }, 1000)
    } catch (error) {
      console.error("Failed to add to plan:", error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Add to Meal Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipe preview */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                🍳
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{recipe.title}</p>
              <p className="text-xs text-muted-foreground">
                {recipe.servings} servings
              </p>
            </div>
          </div>

          {/* Day selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select day</label>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isSelected =
                  format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                const isToday =
                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-lg transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                      isToday && !isSelected && "ring-1 ring-primary"
                    )}
                  >
                    <span className="text-[10px] uppercase">
                      {format(day, "EEE")}
                    </span>
                    <span className="text-sm font-medium">
                      {format(day, "d")}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Meal type selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Meal type</label>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedMealType(type.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg transition-colors text-left",
                    selectedMealType === type.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <span>{type.emoji}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Add button */}
          <Button
            className="w-full"
            onClick={handleAdd}
            disabled={addMealEntry.isPending || isAdded}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Added!
              </>
            ) : addMealEntry.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                Add to {format(selectedDate, "EEE, MMM d")}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
