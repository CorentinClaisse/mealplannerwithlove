import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { startOfWeek, format } from "date-fns"

// GET /api/meal-plans - Get meal plan for a specific week
export async function GET(request: NextRequest) {
  const supabase = await createClient() as any
  const { searchParams } = new URL(request.url)

  const weekStart = searchParams.get("weekStart")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's household
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single()

  if (!profile?.household_id) {
    return NextResponse.json({ error: "No household found" }, { status: 400 })
  }

  // Default to current week if not specified
  const targetWeekStart = weekStart || format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  )

  // Get or create meal plan for the week
  let { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("household_id", profile.household_id)
    .eq("week_start", targetWeekStart)
    .single()

  // Create plan if it doesn't exist
  if (!mealPlan) {
    const { data: newPlan, error } = await supabase
      .from("meal_plans")
      .insert({
        household_id: profile.household_id,
        week_start: targetWeekStart,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating meal plan:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    mealPlan = newPlan
  }

  // Get entries for this meal plan with recipe details
  const { data: entries, error: entriesError } = await supabase
    .from("meal_entries")
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
    .eq("meal_plan_id", mealPlan.id)
    .order("date", { ascending: true })

  if (entriesError) {
    console.error("Error fetching entries:", entriesError)
    return NextResponse.json({ error: entriesError.message }, { status: 500 })
  }

  return NextResponse.json({
    mealPlan,
    entries: entries || [],
  })
}

// POST /api/meal-plans - Create entry in meal plan
export async function POST(request: NextRequest) {
  const supabase = await createClient() as any
  const body = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's household
  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single()

  if (!profile?.household_id) {
    return NextResponse.json({ error: "No household found" }, { status: 400 })
  }

  // Get the week start from the entry date
  const entryDate = new Date(body.date)
  const weekStart = format(
    startOfWeek(entryDate, { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  )

  // Get or create meal plan for the week
  let { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("household_id", profile.household_id)
    .eq("week_start", weekStart)
    .single()

  if (!mealPlan) {
    const { data: newPlan } = await supabase
      .from("meal_plans")
      .insert({
        household_id: profile.household_id,
        week_start: weekStart,
      })
      .select("id")
      .single()

    mealPlan = newPlan
  }

  // Create the entry
  const { data: entry, error } = await supabase
    .from("meal_entries")
    .insert({
      meal_plan_id: mealPlan.id,
      date: body.date,
      meal_type: body.mealType,
      recipe_id: body.recipeId || null,
      custom_meal_name: body.customMealName || null,
      servings_multiplier: body.servingsMultiplier || 1,
    })
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
    console.error("Error creating entry:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry }, { status: 201 })
}
