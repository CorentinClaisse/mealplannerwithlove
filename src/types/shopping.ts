import type { Tables } from "./database"

export type ShoppingList = Tables<"shopping_lists"> & {
  items?: ShoppingListItem[]
}

export type ShoppingListItem = Tables<"shopping_list_items">

export interface ShoppingListItemInput {
  name: string
  quantity?: number | null
  unit?: string | null
  category?: string | null
  notes?: string | null
}

export interface ShoppingListWithProgress extends ShoppingList {
  totalItems: number
  checkedItems: number
}

// Group items by category for display
export interface GroupedShoppingItems {
  [category: string]: ShoppingListItem[]
}

// Default categories for organization
export const ITEM_CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat & Seafood",
  "Bakery",
  "Frozen",
  "Pantry",
  "Beverages",
  "Snacks",
  "Other",
] as const

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]
