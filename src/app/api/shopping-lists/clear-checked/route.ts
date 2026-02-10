import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedHousehold, handleAuthError } from "@/lib/supabase/auth-helpers"

// POST - Clear all checked items from active shopping list
export async function POST(request: NextRequest) {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()

    // Get active shopping list
    const { data: shoppingList } = await supabase
      .from("shopping_lists")
      .select("id")
      .eq("household_id", householdId)
      .eq("status", "active")
      .single()

    if (!shoppingList) {
      return NextResponse.json(
        { error: "No active shopping list" },
        { status: 404 }
      )
    }

    // Delete all checked items
    const { error: deleteError, count } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("shopping_list_id", shoppingList.id)
      .eq("is_checked", true)

    if (deleteError) {
      console.error("Error deleting checked items:", deleteError)
      return NextResponse.json(
        { error: "Failed to clear checked items" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      itemsRemoved: count || 0
    })
  } catch (error) {
    return handleAuthError(error)
  }
}
