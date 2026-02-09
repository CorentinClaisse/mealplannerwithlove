import type { Tables } from "./database"

export type Recipe = Tables<"recipes"> & {
  recipe_ingredients?: (Tables<"recipe_ingredients"> & {
    ingredient: Tables<"ingredients"> | null
  })[]
  recipe_steps?: Tables<"recipe_steps">[]
}

export interface RecipeFormData {
  title: string
  description?: string
  prepTime?: number
  cookTime?: number
  servings: number
  cuisine?: string
  mealType: string[]
  tags: string[]
  imageUrl?: string
  sourceType?: "manual" | "url_import" | "ocr" | "ai_generated"
  sourceUrl?: string
  ingredients: IngredientInput[]
  steps: StepInput[]
}

export interface IngredientInput {
  name: string
  quantity?: number
  unit?: string
  preparation?: string
  notes?: string
  isOptional?: boolean
  category?: string
  originalText?: string
}

export interface StepInput {
  instruction: string
  duration?: number
  imageUrl?: string
}

export interface RecipesResponse {
  recipes: Recipe[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface RecipeFilters {
  search?: string
  mealType?: string
  favorite?: boolean
  page?: number
  limit?: number
}
