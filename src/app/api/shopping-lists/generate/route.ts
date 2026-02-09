import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { format, startOfWeek, addDays } from "date-fns"

// POST - Generate shopping list from meal plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    const body = await request.json()

    // weekStart is optional - defaults to current week
    const weekStart = body.weekStart
      ? new Date(body.weekStart)
      : startOfWeek(new Date(), { weekStartsOn: 1 })

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's household
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single()

    if (!profile?.household_id) {
      return NextResponse.json(
        { error: "No household found" },
        { status: 404 }
      )
    }

    // Get the meal plan for the week
    const weekStartStr = format(weekStart, "yyyy-MM-dd")

    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("household_id", profile.household_id)
      .eq("week_start", weekStartStr)
      .single()

    if (!mealPlan) {
      return NextResponse.json(
        { error: "No meal plan found for this week" },
        { status: 404 }
      )
    }

    // Get all meal entries with recipes and their ingredients
    const { data: mealEntries, error: entriesError } = await supabase
      .from("meal_entries")
      .select(
        `
        id,
        recipe_id,
        servings_multiplier,
        recipe:recipes(
          id,
          title,
          servings,
          ingredients:recipe_ingredients(
            id,
            quantity,
            unit,
            original_text,
            ingredient:ingredients(
              id,
              name,
              category
            )
          )
        )
      `
      )
      .eq("meal_plan_id", mealPlan.id)
      .not("recipe_id", "is", null)

    if (entriesError) {
      console.error("Error fetching meal entries:", entriesError)
      return NextResponse.json(
        { error: "Failed to fetch meal entries" },
        { status: 500 }
      )
    }

    if (!mealEntries || mealEntries.length === 0) {
      return NextResponse.json(
        { error: "No recipes in meal plan" },
        { status: 400 }
      )
    }

    // Aggregate ingredients
    const ingredientMap = new Map<
      string,
      {
        name: string
        quantity: number
        unit: string | null
        category: string | null
        sourceRecipeIds: string[]
      }
    >()

    for (const entry of mealEntries) {
      const recipe = entry.recipe
      if (!recipe?.ingredients) continue

      const multiplier = entry.servings_multiplier || 1

      for (const ing of recipe.ingredients) {
        const ingredientName = ing.ingredient?.name || ing.original_text || "Unknown"
        const key = ingredientName.toLowerCase()

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          // Add quantities if units match
          if (existing.unit === ing.unit && ing.quantity) {
            existing.quantity += ing.quantity * multiplier
          }
          if (!existing.sourceRecipeIds.includes(recipe.id)) {
            existing.sourceRecipeIds.push(recipe.id)
          }
        } else {
          ingredientMap.set(key, {
            name: ingredientName,
            quantity: (ing.quantity || 0) * multiplier,
            unit: ing.unit,
            category: ing.ingredient?.category || "Other",
            sourceRecipeIds: [recipe.id],
          })
        }
      }
    }

    // Get or create active shopping list
    let { data: shoppingList } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("household_id", profile.household_id)
      .eq("status", "active")
      .single()

    if (!shoppingList) {
      const { data: newList, error: createError } = await supabase
        .from("shopping_lists")
        .insert({
          household_id: profile.household_id,
          meal_plan_id: mealPlan.id,
          name: `Week of ${format(weekStart, "MMM d")}`,
          status: "active",
        })
        .select("id")
        .single()

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create shopping list" },
          { status: 500 }
        )
      }

      shoppingList = newList
    }

    // Add items to shopping list
    const itemsToInsert = Array.from(ingredientMap.values()).map((item) => ({
      shopping_list_id: shoppingList.id,
      name: item.name,
      quantity: item.quantity || null,
      unit: item.unit,
      category: item.category || "Other",
      source_recipe_ids: item.sourceRecipeIds,
      is_manual: false,
      is_checked: false,
    }))

    // Check for existing items and update or insert
    for (const item of itemsToInsert) {
      const { data: existing } = await supabase
        .from("shopping_list_items")
        .select("id, quantity, source_recipe_ids")
        .eq("shopping_list_id", shoppingList.id)
        .ilike("name", item.name)
        .single()

      if (existing) {
        // Update existing item
        const newQuantity = (existing.quantity || 0) + (item.quantity || 0)
        const newRecipeIds = [
          ...new Set([
            ...(existing.source_recipe_ids || []),
            ...item.source_recipe_ids,
          ]),
        ]

        await supabase
          .from("shopping_list_items")
          .update({
            quantity: newQuantity,
            source_recipe_ids: newRecipeIds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        // Insert new item
        await supabase.from("shopping_list_items").insert(item)
      }
    }

    // Fetch updated shopping list
    const { data: updatedList } = await supabase
      .from("shopping_lists")
      .select(
        `
        *,
        items:shopping_list_items(*)
      `
      )
      .eq("id", shoppingList.id)
      .single()

    return NextResponse.json({
      shoppingList: updatedList,
      itemsAdded: itemsToInsert.length,
    })
  } catch (error) {
    console.error("Error generating shopping list:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
