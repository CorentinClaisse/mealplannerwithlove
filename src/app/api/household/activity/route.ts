import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedHousehold, handleAuthError } from "@/lib/supabase/auth-helpers"

export async function GET(request: NextRequest) {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()

    const { data: mealEntries } = await supabase
      .from("meal_entries")
      .select("id, created_at, meal_type, date, custom_meal_name, recipe:recipes(title), meal_plan:meal_plans!inner(household_id)")
      .eq("meal_plan.household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: recipes } = await supabase
      .from("recipes")
      .select("id, title, created_at, source_type")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: shoppingItems } = await supabase
      .from("shopping_list_items")
      .select("id, name, created_at, is_checked, checked_at, shopping_list:shopping_lists!inner(household_id)")
      .eq("shopping_list.household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(10)

    const { data: inventoryItems } = await supabase
      .from("inventory_items")
      .select("id, name, created_at, location, source")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(10)

    type ActivityItem = {
      id: string
      type: string
      title: string
      subtitle?: string
      timestamp: string
      icon: string
    }

    const activities: ActivityItem[] = []

    mealEntries?.forEach((e) => {
      const recipeName = (e.recipe as { title: string } | null)?.title || e.custom_meal_name || "a meal"
      activities.push({
        id: `meal-${e.id}`,
        type: "meal_added",
        title: `Added ${recipeName} to ${e.meal_type}`,
        subtitle: e.date,
        timestamp: e.created_at,
        icon: "🍽️",
      })
    })

    recipes?.forEach((r) => {
      activities.push({
        id: `recipe-${r.id}`,
        type: "recipe_created",
        title: `Created recipe "${r.title}"`,
        subtitle: r.source_type === "url_import" ? "Imported from URL" : r.source_type === "ocr" ? "Scanned from photo" : undefined,
        timestamp: r.created_at,
        icon: "📖",
      })
    })

    shoppingItems?.forEach((s) => {
      if (s.is_checked && s.checked_at) {
        activities.push({
          id: `shop-check-${s.id}`,
          type: "shopping_checked",
          title: `Checked off "${s.name}"`,
          timestamp: s.checked_at,
          icon: "✅",
        })
      }
      activities.push({
        id: `shop-${s.id}`,
        type: "shopping_added",
        title: `Added "${s.name}" to shopping list`,
        timestamp: s.created_at,
        icon: "🛒",
      })
    })

    inventoryItems?.forEach((i) => {
      activities.push({
        id: `inv-${i.id}`,
        type: "inventory_added",
        title: `Added ${i.name} to ${i.location}`,
        subtitle: i.source === "ai_scan" ? "Via AI scan" : undefined,
        timestamp: i.created_at,
        icon: "📦",
      })
    })

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ activities: activities.slice(0, 20) })
  } catch (error) {
    return handleAuthError(error)
  }
}
