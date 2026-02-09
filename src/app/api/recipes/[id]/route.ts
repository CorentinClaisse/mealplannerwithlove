import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/recipes/[id] - Get a single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      `
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      ),
      recipe_steps(*)
    `
    )
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching recipe:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
  }

  return NextResponse.json({ recipe })
}

// PUT /api/recipes/[id] - Update a recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient() as any
  const body = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Update the recipe
  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      title: body.title,
      description: body.description,
      prep_time_minutes: body.prepTime,
      cook_time_minutes: body.cookTime,
      servings: body.servings,
      cuisine: body.cuisine,
      meal_type: body.mealType || [],
      tags: body.tags || [],
      image_url: body.imageUrl,
    })
    .eq("id", id)

  if (recipeError) {
    console.error("Error updating recipe:", recipeError)
    return NextResponse.json({ error: recipeError.message }, { status: 500 })
  }

  // If ingredients provided, replace them
  if (body.ingredients) {
    // Delete existing ingredients
    await supabase.from("recipe_ingredients").delete().eq("recipe_id", id)

    // Insert new ingredients
    for (let i = 0; i < body.ingredients.length; i++) {
      const ing = body.ingredients[i]
      const normalizedName = ing.name.toLowerCase().trim()

      let { data: ingredient } = await supabase
        .from("ingredients")
        .select("id")
        .eq("normalized_name", normalizedName)
        .single()

      if (!ingredient) {
        const { data: newIng } = await supabase
          .from("ingredients")
          .insert({
            name: ing.name,
            normalized_name: normalizedName,
            category: ing.category,
          })
          .select("id")
          .single()
        ingredient = newIng
      }

      if (ingredient) {
        await supabase.from("recipe_ingredients").insert({
          recipe_id: id,
          ingredient_id: ingredient.id,
          quantity: ing.quantity,
          unit: ing.unit,
          preparation: ing.preparation,
          notes: ing.notes,
          is_optional: ing.isOptional || false,
          display_order: i,
          original_text: ing.originalText,
        })
      }
    }
  }

  // If steps provided, replace them
  if (body.steps) {
    await supabase.from("recipe_steps").delete().eq("recipe_id", id)

    const stepInserts = body.steps.map((step: any, index: number) => ({
      recipe_id: id,
      step_number: index + 1,
      instruction: step.instruction,
      duration_minutes: step.duration,
      image_url: step.imageUrl,
    }))

    await supabase.from("recipe_steps").insert(stepInserts)
  }

  // Fetch updated recipe
  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      `
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      ),
      recipe_steps(*)
    `
    )
    .eq("id", id)
    .single()

  return NextResponse.json({ recipe })
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase.from("recipes").delete().eq("id", id)

  if (error) {
    console.error("Error deleting recipe:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/recipes/[id] - Toggle favorite
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient() as any
  const body = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Handle favorite toggle
  if (body.is_favorite !== undefined) {
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: body.is_favorite })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Handle marking as cooked
  if (body.mark_cooked) {
    const { data: recipe } = await supabase
      .from("recipes")
      .select("times_cooked")
      .eq("id", id)
      .single()

    await supabase
      .from("recipes")
      .update({
        times_cooked: (recipe?.times_cooked || 0) + 1,
        last_cooked_at: new Date().toISOString(),
      })
      .eq("id", id)
  }

  const { data: updatedRecipe } = await supabase
    .from("recipes")
    .select("*")
    .eq("id", id)
    .single()

  return NextResponse.json({ recipe: updatedRecipe })
}
