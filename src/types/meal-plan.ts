import type { Tables } from "./database"
import type { Recipe } from "./recipe"

export type MealPlan = Tables<"meal_plans"> & {
  entries?: MealEntry[]
}

export type MealEntry = Tables<"meal_entries"> & {
  recipe?: Recipe | null
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack"

export interface MealEntryInput {
  date: string // ISO date string YYYY-MM-DD
  mealType: MealType
  recipeId?: string
  customMealName?: string
  servingsMultiplier?: number
}

export interface WeekPlanData {
  mealPlan: MealPlan | null
  entries: MealEntry[]
}
