import type { Tables } from "./database"

export type InventoryItem = Tables<"inventory_items">

export type InventoryLocation = "fridge" | "freezer" | "pantry"

export interface InventoryItemInput {
  name: string
  quantity?: number | null
  unit?: string | null
  location: InventoryLocation
  expiry_date?: string | null
}

export interface ScannedItem {
  name: string
  quantity: number | null
  unit: string | null
  confidence: number
}

export interface FridgeScanResult {
  items: ScannedItem[]
  notes?: string
}

export const LOCATION_CONFIG = {
  fridge: { label: "Fridge", icon: "Refrigerator" },
  freezer: { label: "Freezer", icon: "Snowflake" },
  pantry: { label: "Pantry", icon: "Package" },
} as const
