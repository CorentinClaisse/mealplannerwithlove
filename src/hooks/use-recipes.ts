"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Recipe, RecipeFormData, RecipesResponse, RecipeFilters } from "@/types/recipe"

// Fetch recipes list
async function fetchRecipes(filters: RecipeFilters): Promise<RecipesResponse> {
  const params = new URLSearchParams()

  if (filters.search) params.set("search", filters.search)
  if (filters.mealType) params.set("mealType", filters.mealType)
  if (filters.favorite) params.set("favorite", "true")
  if (filters.page) params.set("page", filters.page.toString())
  if (filters.limit) params.set("limit", filters.limit.toString())

  const response = await fetch(`/api/recipes?${params.toString()}`)

  if (!response.ok) {
    throw new Error("Failed to fetch recipes")
  }

  return response.json()
}

// Fetch single recipe
async function fetchRecipe(id: string): Promise<{ recipe: Recipe }> {
  const response = await fetch(`/api/recipes/${id}`)

  if (!response.ok) {
    throw new Error("Failed to fetch recipe")
  }

  return response.json()
}

// Create recipe
async function createRecipe(data: RecipeFormData): Promise<{ recipe: Recipe }> {
  const response = await fetch("/api/recipes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to create recipe")
  }

  return response.json()
}

// Update recipe
async function updateRecipe({ id, data }: { id: string; data: Partial<RecipeFormData> }): Promise<{ recipe: Recipe }> {
  const response = await fetch(`/api/recipes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to update recipe")
  }

  return response.json()
}

// Delete recipe
async function deleteRecipe(id: string): Promise<void> {
  const response = await fetch(`/api/recipes/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to delete recipe")
  }
}

// Toggle favorite
async function toggleFavorite({ id, isFavorite }: { id: string; isFavorite: boolean }): Promise<{ recipe: Recipe }> {
  const response = await fetch(`/api/recipes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_favorite: isFavorite }),
  })

  if (!response.ok) {
    throw new Error("Failed to toggle favorite")
  }

  return response.json()
}

// Hooks
export function useRecipes(filters: RecipeFilters = {}) {
  return useQuery({
    queryKey: ["recipes", filters],
    queryFn: () => fetchRecipes(filters),
  })
}

export function useRecipe(id: string | null) {
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => fetchRecipe(id!),
    enabled: !!id,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateRecipe,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] })
      queryClient.setQueryData(["recipe", data.recipe.id], data)
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] })
    },
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: toggleFavorite,
    onMutate: async ({ id, isFavorite }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["recipes"] })

      const previousRecipes = queryClient.getQueryData<RecipesResponse>(["recipes", {}])

      if (previousRecipes) {
        queryClient.setQueryData<RecipesResponse>(["recipes", {}], {
          ...previousRecipes,
          recipes: previousRecipes.recipes.map((r) =>
            r.id === id ? { ...r, is_favorite: isFavorite } : r
          ),
        })
      }

      return { previousRecipes }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousRecipes) {
        queryClient.setQueryData(["recipes", {}], context.previousRecipes)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] })
    },
  })
}
