"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Search, Clock, Users, ChefHat, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRecipes } from "@/hooks/use-recipes"
import { useAddMealEntry } from "@/hooks/use-meal-plan"
import type { MealType } from "@/types/meal-plan"
import type { Recipe } from "@/types/recipe"
import { cn } from "@/lib/utils/cn"

interface AddMealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
  mealType: MealType
}

export function AddMealModal({
  open,
  onOpenChange,
  date,
  mealType,
}: AddMealModalProps) {
  const [search, setSearch] = useState("")
  const [customMealName, setCustomMealName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const { data, isLoading } = useRecipes({ search, limit: 20 })
  const addMealEntry = useAddMealEntry()

  const handleSelectRecipe = async (recipe: Recipe) => {
    try {
      await addMealEntry.mutateAsync({
        date: format(date, "yyyy-MM-dd"),
        mealType,
        recipeId: recipe.id,
      })
      onOpenChange(false)
      setSearch("")
    } catch (error) {
      console.error("Failed to add meal:", error)
    }
  }

  const handleAddCustomMeal = async () => {
    if (!customMealName.trim()) return

    try {
      await addMealEntry.mutateAsync({
        date: format(date, "yyyy-MM-dd"),
        mealType,
        customMealName: customMealName.trim(),
      })
      onOpenChange(false)
      setCustomMealName("")
      setShowCustomInput(false)
    } catch (error) {
      console.error("Failed to add custom meal:", error)
    }
  }

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[80vh]"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>
            Add {mealTypeLabel} for {format(date, "EEEE, MMM d")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Custom Meal Option */}
          {showCustomInput ? (
            <div className="flex gap-2">
              <Input
                placeholder="Enter meal name..."
                value={customMealName}
                onChange={(e) => setCustomMealName(e.target.value)}
                autoFocus
              />
              <Button
                onClick={handleAddCustomMeal}
                disabled={!customMealName.trim() || addMealEntry.isPending}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCustomInput(false)
                  setCustomMealName("")
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowCustomInput(true)}
            >
              <ChefHat className="w-4 h-4 mr-2" />
              Add custom meal
            </Button>
          )}

          {/* Recipe List */}
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading recipes...
              </div>
            ) : data?.recipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {search
                  ? "No recipes found"
                  : "No recipes yet. Add some recipes first!"}
              </div>
            ) : (
              data?.recipes.map((recipe) => (
                <RecipeOption
                  key={recipe.id}
                  recipe={recipe}
                  onSelect={() => handleSelectRecipe(recipe)}
                  isLoading={addMealEntry.isPending}
                />
              ))
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

function RecipeOption({
  recipe,
  onSelect,
  isLoading,
}: {
  recipe: Recipe
  onSelect: () => void
  isLoading: boolean
}) {
  const totalTime =
    (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={cn(
        "w-full text-left p-3 rounded-xl border",
        "hover:bg-muted/50 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <div className="flex gap-3">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{recipe.title}</h4>

          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {totalTime} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {recipe.servings} servings
              </span>
            )}
          </div>

          {recipe.meal_type && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-muted rounded-full">
              {recipe.meal_type}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
