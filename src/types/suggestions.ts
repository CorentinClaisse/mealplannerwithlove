export interface RecipeSuggestion {
  title: string
  description: string
  usesIngredients: string[]
  additionalNeeded: string[]
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  prepTime: number
  cookTime: number
  difficulty: "easy" | "medium" | "hard"
  matchScore: number
}

export interface SuggestionsResponse {
  suggestions: RecipeSuggestion[]
}
