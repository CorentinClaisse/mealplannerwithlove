import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// DELETE /api/meal-plans/entries - Delete an entry
export async function DELETE(request: NextRequest) {
  const supabase = await createClient() as any
  const { searchParams } = new URL(request.url)
  const entryId = searchParams.get("entryId")

  if (!entryId) {
    return NextResponse.json({ error: "Entry ID required" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("meal_entries")
    .delete()
    .eq("id", entryId)

  if (error) {
    console.error("Error deleting entry:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/meal-plans/entries - Update an entry
export async function PATCH(request: NextRequest) {
  const supabase = await createClient() as any
  const body = await request.json()
  const { searchParams } = new URL(request.url)
  const entryId = searchParams.get("entryId")

  if (!entryId) {
    return NextResponse.json({ error: "Entry ID required" }, { status: 400 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const updateData: Record<string, any> = {}

  if (body.date !== undefined) updateData.date = body.date
  if (body.mealType !== undefined) updateData.meal_type = body.mealType
  if (body.recipeId !== undefined) updateData.recipe_id = body.recipeId
  if (body.customMealName !== undefined) updateData.custom_meal_name = body.customMealName
  if (body.servingsMultiplier !== undefined) updateData.servings_multiplier = body.servingsMultiplier
  if (body.isCompleted !== undefined) updateData.is_completed = body.isCompleted

  const { data: entry, error } = await supabase
    .from("meal_entries")
    .update(updateData)
    .eq("id", entryId)
    .select(`
      *,
      recipe:recipes(
        id,
        title,
        image_url,
        prep_time_minutes,
        cook_time_minutes,
        servings
      )
    `)
    .single()

  if (error) {
    console.error("Error updating entry:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry })
}
