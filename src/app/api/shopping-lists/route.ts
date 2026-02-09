import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET - Fetch active shopping list (or create one if none exists)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as any

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

    // Try to get active shopping list
    let { data: shoppingList, error: listError } = await supabase
      .from("shopping_lists")
      .select(
        `
        *,
        items:shopping_list_items(*)
      `
      )
      .eq("household_id", profile.household_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // If no active list, create one
    if (listError?.code === "PGRST116" || !shoppingList) {
      const { data: newList, error: createError } = await supabase
        .from("shopping_lists")
        .insert({
          household_id: profile.household_id,
          name: "Shopping List",
          status: "active",
        })
        .select()
        .single()

      if (createError) {
        console.error("Error creating shopping list:", createError)
        return NextResponse.json(
          { error: "Failed to create shopping list" },
          { status: 500 }
        )
      }

      shoppingList = { ...newList, items: [] }
    }

    // Sort items: unchecked first, then by category, then by name
    if (shoppingList.items) {
      shoppingList.items.sort((a: any, b: any) => {
        // Unchecked items first
        if (a.is_checked !== b.is_checked) {
          return a.is_checked ? 1 : -1
        }
        // Then by category
        const categoryA = a.category || "Other"
        const categoryB = b.category || "Other"
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB)
        }
        // Then by name
        return a.name.localeCompare(b.name)
      })
    }

    return NextResponse.json({ shoppingList })
  } catch (error) {
    console.error("Error fetching shopping list:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Add item to active shopping list
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    const body = await request.json()

    const { name, quantity, unit, category, notes } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

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
          name: "Shopping List",
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

    // Check if item with same name exists (case-insensitive)
    const { data: existingItem } = await supabase
      .from("shopping_list_items")
      .select("id, quantity")
      .eq("shopping_list_id", shoppingList.id)
      .ilike("name", name)
      .single()

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = (existingItem.quantity || 0) + (quantity || 1)
      const { data: updatedItem, error: updateError } = await supabase
        .from("shopping_list_items")
        .update({ quantity: newQuantity })
        .eq("id", existingItem.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update item" },
          { status: 500 }
        )
      }

      return NextResponse.json({ item: updatedItem })
    }

    // Create new item
    const { data: item, error: itemError } = await supabase
      .from("shopping_list_items")
      .insert({
        shopping_list_id: shoppingList.id,
        name,
        quantity: quantity || null,
        unit: unit || null,
        category: category || "Other",
        notes: notes || null,
        is_manual: true,
        is_checked: false,
      })
      .select()
      .single()

    if (itemError) {
      console.error("Error creating item:", itemError)
      return NextResponse.json(
        { error: "Failed to create item" },
        { status: 500 }
      )
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error("Error adding shopping item:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
