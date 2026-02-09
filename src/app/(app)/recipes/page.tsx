"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { useRecipes, useToggleFavorite, useDeleteRecipe } from "@/hooks/use-recipes"
import { useAddShoppingItem } from "@/hooks/use-shopping-list"
import type { Recipe } from "@/types/recipe"
import { Plus, Search, Clock, Heart, Import, Loader2, MoreVertical, Edit, Trash2, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils/cn"
import { useDebouncedCallback } from "@/hooks/use-debounce"

const filters = ["All", "Favorites", "Breakfast", "Lunch", "Dinner", "Snack"]

export default function RecipesPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("All")

  const { data, isLoading, error } = useRecipes({
    search: debouncedSearch || undefined,
  })

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value)
  }, 300)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    debouncedSetSearch(e.target.value)
  }

  const allRecipes = data?.recipes || []
  const totalRecipes = data?.pagination?.total || 0

  // Client-side filtering for favorites and meal type
  const recipes = allRecipes.filter((r) => {
    if (activeFilter === "All") return true
    if (activeFilter === "Favorites") return r.is_favorite
    // Filter by meal type tag
    return r.tags?.some(tag => tag.toLowerCase() === activeFilter.toLowerCase())
  })

  return (
    <div className="pb-20">
      <PageHeader
        title="Recipes"
        subtitle={
          isLoading
            ? "Loading..."
            : `${totalRecipes} recipe${totalRecipes !== 1 ? "s" : ""}`
        }
        action={
          <div className="flex gap-2">
            <Link href="/recipes/import">
              <button className="w-10 h-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-colors">
                <Import className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/recipes/new">
              <button className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
                <Plus className="w-5 h-5" />
              </button>
            </Link>
          </div>
        }
      />

      <div className="px-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200",
                activeFilter === f
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-12 text-center">
            <p className="text-4xl mb-2">😕</p>
            <p className="font-semibold text-foreground">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Failed to load recipes"}
            </p>
            <Link href="/login">
              <Button variant="link" className="mt-2">Sign in</Button>
            </Link>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && recipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🔍</p>
            <p className="font-semibold text-foreground">No recipes found</p>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || activeFilter !== "All"
                ? "Try a different search or filter"
                : "Add your first recipe to get started"}
            </p>
            {!debouncedSearch && activeFilter === "All" && (
              <div className="flex gap-2 justify-center mt-4">
                <Link href="/recipes/import">
                  <Button variant="outline" size="sm">
                    <Import className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </Link>
                <Link href="/recipes/new">
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add recipe
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Recipe Grid */}
        {!isLoading && !error && recipes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const router = useRouter()
  const toggleFavorite = useToggleFavorite()
  const deleteRecipe = useDeleteRecipe()
  const addShoppingItem = useAddShoppingItem()
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [isMounted, setIsMounted] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  // Set mounted for portal
  useState(() => {
    setIsMounted(true)
  })

  const totalTime =
    (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite.mutate({ id: recipe.id, isFavorite: !recipe.is_favorite })
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 4,
      left: Math.max(8, rect.left - 100),
    })
    setShowMenu(!showMenu)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    router.push(`/recipes/${recipe.id}/edit`)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    if (confirm("Are you sure you want to delete this recipe?")) {
      await deleteRecipe.mutateAsync(recipe.id)
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowMenu(false)
    setIsAddingToCart(true)

    try {
      // Get the full recipe with ingredients
      const response = await fetch(`/api/recipes/${recipe.id}`)
      const data = await response.json()
      const ingredients = data.recipe?.recipe_ingredients || []

      // Add each ingredient to shopping list
      for (const ing of ingredients) {
        const name = ing.ingredient?.name || ing.original_text
        if (name) {
          await addShoppingItem.mutateAsync({
            name,
            quantity: ing.quantity || null,
            unit: ing.unit || null,
            category: ing.ingredient?.category || "Other",
          })
        }
      }
      alert(`Added ${ingredients.length} items to shopping list!`)
    } catch (error) {
      console.error("Failed to add ingredients:", error)
      alert("Failed to add ingredients to shopping list")
    } finally {
      setIsAddingToCart(false)
    }
  }

  // Get emoji based on first tag or default
  const getMealEmoji = () => {
    const mealType = recipe.tags?.[0]?.toLowerCase()
    switch (mealType) {
      case "breakfast": return "🍳"
      case "lunch": return "🥗"
      case "dinner": return "🍝"
      case "snack": return "🥜"
      default: return "🍽️"
    }
  }

  return (
    <>
      <Link href={`/recipes/${recipe.id}`}>
        <div className="bg-card rounded-2xl overflow-hidden border border-border text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 animate-fade-in">
          {/* Image */}
          <div className="aspect-[4/3] bg-primary/10 flex items-center justify-center relative">
            {recipe.image_url ? (
              <img
                src={recipe.image_url}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">{getMealEmoji()}</span>
            )}

            {/* Favorite button */}
            <button
              onClick={handleFavoriteClick}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <Heart
                className={cn(
                  "w-4 h-4 transition-colors",
                  recipe.is_favorite
                    ? "fill-primary text-primary"
                    : "text-muted-foreground"
                )}
              />
            </button>

            {/* Menu button */}
            <button
              onClick={handleMenuClick}
              className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Loading overlay */}
            {isAddingToCart && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="p-3">
            <p className="font-bold text-sm text-foreground truncate">
              {recipe.title}
            </p>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{totalTime || "?"} min</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Portal Menu */}
      {showMenu && typeof document !== "undefined" && createPortal(
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(false)
            }}
          />
          <div
            className="fixed z-[101] bg-card border border-border rounded-xl shadow-lg p-1 min-w-[160px]"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button
              onClick={handleEdit}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit recipe
            </button>
            <button
              onClick={handleAddToCart}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted rounded-lg transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to shopping list
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-muted rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete recipe
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
