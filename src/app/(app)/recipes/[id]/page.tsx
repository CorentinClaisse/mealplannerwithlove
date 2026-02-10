"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRecipe, useToggleFavorite, useDeleteRecipe, useUpdateRecipeTags } from "@/hooks/use-recipes"
import { AddToPlanModal } from "@/components/planner/add-to-plan-modal"
import {
  ChevronLeft,
  Heart,
  Clock,
  Users,
  Edit,
  Trash2,
  Check,
  Loader2,
  CalendarPlus,
  X,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils/cn"

export default function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data, isLoading, error } = useRecipe(id)
  const toggleFavorite = useToggleFavorite()
  const deleteRecipe = useDeleteRecipe()
  const updateTags = useUpdateRecipeTags()

  const recipe = data?.recipe
  const [showAddToPlan, setShowAddToPlan] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [showTagInput, setShowTagInput] = useState(false)

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this recipe?")) {
      await deleteRecipe.mutateAsync(id)
      router.push("/recipes")
    }
  }

  const handleToggleFavorite = () => {
    if (recipe) {
      toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite })
    }
  }

  const handleToggleMealType = (type: string) => {
    if (!recipe) return
    const current = recipe.meal_type || []
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type]
    updateTags.mutate({ id: recipe.id, mealType: updated })
  }

  const handleRemoveTag = (tag: string) => {
    if (!recipe) return
    const updated = (recipe.tags || []).filter((t) => t !== tag)
    updateTags.mutate({ id: recipe.id, tags: updated })
  }

  const handleAddTag = () => {
    if (!recipe) return
    const tag = tagInput.trim().toLowerCase()
    if (tag && !(recipe.tags || []).includes(tag)) {
      updateTags.mutate({ id: recipe.id, tags: [...(recipe.tags || []), tag] })
      setTagInput("")
      setShowTagInput(false)
    }
  }

  const allMealTypes = ["breakfast", "lunch", "dinner", "snack"]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Recipe not found</p>
        <Link href="/recipes">
          <Button variant="link">Back to recipes</Button>
        </Link>
      </div>
    )
  }

  const totalTime =
    (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)

  const ingredients = recipe.recipe_ingredients || []
  const steps = recipe.recipe_steps?.sort((a, b) => a.step_number - b.step_number) || []

  return (
    <div className="pb-24">
      <PageHeader
        title=""
        action={
          <div className="flex gap-2">
            <Link href="/recipes">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Image Placeholder */}
      <div className="aspect-video bg-muted relative">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm"
        >
          <Heart
            className={cn(
              "w-6 h-6",
              recipe.is_favorite
                ? "fill-red-500 text-red-500"
                : "text-gray-600"
            )}
          />
        </button>
      </div>

      <div className="px-4 -mt-6 relative">
        {/* Title Card */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h1 className="text-xl font-bold mb-2">{recipe.title}</h1>

            {recipe.description && (
              <p className="text-muted-foreground text-sm mb-3">
                {recipe.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              {totalTime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {totalTime} min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {recipe.servings} servings
              </span>
            </div>

            {/* Meal Type — toggleable */}
            <div className="flex flex-wrap gap-2 mb-2">
              {allMealTypes.map((type) => {
                const active = recipe.meal_type?.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleToggleMealType(type)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {type}
                  </button>
                )
              })}
            </div>

            {/* Tags — tap to remove, + to add */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(recipe.tags || []).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddTag()
                      }
                      if (e.key === "Escape") {
                        setShowTagInput(false)
                        setTagInput("")
                      }
                    }}
                    onBlur={() => {
                      if (tagInput.trim()) {
                        handleAddTag()
                      } else {
                        setShowTagInput(false)
                      }
                    }}
                    placeholder="New tag..."
                    className="h-6 px-2 text-xs rounded-full border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/30 w-24"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTagInput(true)}
                  className="h-6 px-2 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Tag
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t">
              <Button
                variant="outline"
                className="flex-1 h-10"
                onClick={() => setShowAddToPlan(true)}
              >
                <CalendarPlus className="w-4 h-4 mr-2" />
                Add to plan
              </Button>
              <Link href={`/recipes/${id}/edit`}>
                <Button variant="outline" size="icon" className="h-10 w-10">
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={handleDelete}
                disabled={deleteRecipe.isPending}
              >
                {deleteRecipe.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">
              Ingredients ({ingredients.length})
            </h2>
            <ul className="space-y-2">
              {ingredients.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2 text-sm"
                >
                  <Check className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                  <span>
                    {item.quantity && (
                      <span className="font-medium">
                        {item.quantity} {item.unit}{" "}
                      </span>
                    )}
                    {item.ingredient?.name || "Unknown ingredient"}
                    {item.preparation && (
                      <span className="text-muted-foreground">
                        , {item.preparation}
                      </span>
                    )}
                    {item.is_optional && (
                      <span className="text-muted-foreground"> (optional)</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold mb-3">Instructions</h2>
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{step.instruction}</p>
                    {step.duration_minutes && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {step.duration_minutes} min
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Cooked info */}
        {recipe.times_cooked > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Cooked {recipe.times_cooked} time
            {recipe.times_cooked > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Add to Plan Modal */}
      <AddToPlanModal
        open={showAddToPlan}
        onOpenChange={setShowAddToPlan}
        recipe={recipe}
      />
    </div>
  )
}
