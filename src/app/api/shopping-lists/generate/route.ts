import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedHousehold, handleAuthError } from "@/lib/supabase/auth-helpers"
import { format, startOfWeek } from "date-fns"

// POST - Generate shopping list from meal plan
export async function POST(request: NextRequest) {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()
    const body = await request.json()

    // weekStart is optional - defaults to current week
    const weekStart = body.weekStart
      ? new Date(body.weekStart)
      : startOfWeek(new Date(), { weekStartsOn: 1 })

    const deductInventory = body.deductInventory ?? false

    // Get the meal plan for the week
    const weekStartStr = format(weekStart, "yyyy-MM-dd")

    const { data: mealPlan } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("household_id", householdId)
      .eq("week_start", weekStartStr)
      .single()

    if (!mealPlan) {
      return NextResponse.json(
        { error: "No meal plan found for this week" },
        { status: 404 }
      )
    }

    // Use the server-side RPC function for atomic generation + optional inventory deduction
    const { data: shoppingListId, error: rpcError } = await supabase.rpc(
      "generate_shopping_list",
      {
        p_meal_plan_id: mealPlan.id,
        p_deduct_inventory: deductInventory,
      }
    )

    if (rpcError) {
      console.error("Error generating shopping list:", rpcError)
      return NextResponse.json(
        { error: "Failed to generate shopping list" },
        { status: 500 }
      )
    }

    // Fetch the complete shopping list with items
    const { data: updatedList } = await supabase
      .from("shopping_lists")
      .select(
        `
        *,
        items:shopping_list_items(*)
      `
      )
      .eq("id", shoppingListId)
      .single()

    return NextResponse.json({
      shoppingList: updatedList,
      itemsAdded: updatedList?.items?.length ?? 0,
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
