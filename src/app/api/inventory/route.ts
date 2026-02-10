import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedHousehold,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// GET - Fetch inventory items, optionally filtered by location
export async function GET(request: NextRequest) {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()
    const { searchParams } = new URL(request.url)
    const location = searchParams.get("location")

    // Build query
    let query = supabase
      .from("inventory_items")
      .select("*")
      .eq("household_id", householdId)
      .order("name", { ascending: true })

    if (location) {
      query = query.eq("location", location as "fridge" | "freezer" | "pantry")
    }

    const { data: items, error } = await query

    if (error) {
      console.error("Error fetching inventory:", error)
      return NextResponse.json(
        { error: "Failed to fetch inventory" },
        { status: 500 }
      )
    }

    // Group by location
    const grouped = {
      fridge: items.filter((i: any) => i.location === "fridge"),
      freezer: items.filter((i: any) => i.location === "freezer"),
      pantry: items.filter((i: any) => i.location === "pantry"),
    }

    return NextResponse.json({ items, grouped })
  } catch (error) {
    return handleAuthError(error)
  }
}

// POST - Add item to inventory
export async function POST(request: NextRequest) {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()
    const body = await request.json()

    const { name, quantity, unit, location, expiry_date } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!location || !["fridge", "freezer", "pantry"].includes(location)) {
      return NextResponse.json(
        { error: "Valid location is required" },
        { status: 400 }
      )
    }

    // Check if item with same name exists in same location
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id, quantity")
      .eq("household_id", householdId)
      .eq("location", location)
      .ilike("name", name)
      .single()

    if (existing) {
      // Update quantity
      const newQuantity = (existing.quantity || 0) + (quantity || 1)
      const { data: updated, error: updateError } = await supabase
        .from("inventory_items")
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to update item" },
          { status: 500 }
        )
      }

      return NextResponse.json({ item: updated })
    }

    // Create new item
    const { data: item, error: createError } = await supabase
      .from("inventory_items")
      .insert({
        household_id: householdId,
        name,
        quantity: quantity || null,
        unit: unit || null,
        location,
        expiry_date: expiry_date || null,
        source: "manual",
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating inventory item:", createError)
      return NextResponse.json(
        { error: "Failed to create item" },
        { status: 500 }
      )
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
