"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Lightbulb,
  Clock,
  ChefHat,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  ShoppingCart,
  AlertCircle,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useSuggestions } from "@/hooks/use-suggestions"
import { useQueryClient } from "@tanstack/react-query"
import type { RecipeSuggestion } from "@/types/suggestions"
import { cn } from "@/lib/utils/cn"

const difficultyConfig = {
  easy: { label: "Easy", color: "bg-green-100 text-green-700" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  hard: { label: "Hard", color: "bg-red-100 text-red-700" },
}

const mealTypeConfig = {
  breakfast: { label: "Breakfast", color: "bg-orange-100 text-orange-700" },
  lunch: { label: "Lunch", color: "bg-blue-100 text-blue-700" },
  dinner: { label: "Dinner", color: "bg-purple-100 text-purple-700" },
  snack: { label: "Snack", color: "bg-pink-100 text-pink-700" },
}

export default function SuggestionsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch, isFetching } = useSuggestions()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["suggestions"] })
    refetch()
  }

  return (
    <div>
      <PageHeader
        title="Recipe Ideas"
        subtitle="Based on your inventory"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn("w-5 h-5", isFetching && "animate-spin")}
              />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 space-y-4 pb-24">
        {/* Loading state */}
        {isLoading && (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="font-medium">Analyzing your ingredients...</p>
            <p className="text-sm text-muted-foreground">
              Finding delicious recipes you can make
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
              <p className="font-medium text-destructive mb-1">
                Couldn't generate suggestions
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {error.message}
              </p>
              <div className="flex gap-2 justify-center">
                <Link href="/inventory">
                  <Button variant="outline" size="sm">
                    Add ingredients
                  </Button>
                </Link>
                <Button size="sm" onClick={handleRefresh}>
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions list */}
        {data?.suggestions && data.suggestions.length > 0 && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>
                {data.suggestions.length} recipes you can make with your
                ingredients
              </span>
            </div>

            {data.suggestions.map((suggestion, index) => (
              <SuggestionCard key={index} suggestion={suggestion} />
            ))}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!data?.suggestions || data.suggestions.length === 0) && (
          <div className="py-12 text-center">
            <Lightbulb className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No suggestions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add more items to your inventory to get recipe suggestions
            </p>
            <Link href="/inventory">
              <Button>Add ingredients</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: RecipeSuggestion }) {
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  const totalTime = suggestion.prepTime + suggestion.cookTime
  const matchPercent = Math.round(suggestion.matchScore * 100)

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  mealTypeConfig[suggestion.mealType].color
                )}
              >
                {mealTypeConfig[suggestion.mealType].label}
              </span>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  difficultyConfig[suggestion.difficulty].color
                )}
              >
                {difficultyConfig[suggestion.difficulty].label}
              </span>
            </div>

            <h3 className="font-semibold">{suggestion.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {suggestion.description}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {totalTime} min
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-green-600" />
                {matchPercent}% match
              </span>
            </div>
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 pt-3 border-t text-sm text-primary font-medium"
        >
          {expanded ? "Show less" : "Show ingredients"}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3">
            {/* Ingredients you have */}
            <div>
              <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                You have ({suggestion.usesIngredients.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestion.usesIngredients.map((ing, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>

            {/* Additional ingredients needed */}
            {suggestion.additionalNeeded.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  Need to buy ({suggestion.additionalNeeded.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.additionalNeeded.map((ing, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  // TODO: Add missing ingredients to shopping list
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                Add to list
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  // Navigate to create recipe with pre-filled data
                  const params = new URLSearchParams({
                    title: suggestion.title,
                    description: suggestion.description,
                    prepTime: suggestion.prepTime.toString(),
                    cookTime: suggestion.cookTime.toString(),
                    mealType: suggestion.mealType,
                  })
                  router.push(`/recipes/new?${params.toString()}`)
                }}
              >
                <ChefHat className="w-4 h-4 mr-1" />
                Cook this
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
