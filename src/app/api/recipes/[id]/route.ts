import { NextRequest, NextResponse } from "next/server"
import {
  getAuthenticatedUser,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// GET /api/recipes/[id] - Get a single recipe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()

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
  } catch (error) {
    return handleAuthError(error)
  }
}

// PUT /api/recipes/[id] - Update a recipe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()
    const body = await request.json()

    // Snapshot current relations so we can restore on failure
    const { data: prevIngredients } = body.ingredients
      ? await supabase.from("recipe_ingredients").select("*").eq("recipe_id", id)
      : { data: null }
    const { data: prevSteps } = body.steps
      ? await supabase.from("recipe_steps").select("*").eq("recipe_id", id)
      : { data: null }

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

    // Replace relations — roll back on failure
    try {
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
    } catch (relatedError) {
      // Attempt to restore previous relations
      console.error("Error updating recipe relations, rolling back:", relatedError)
      if (prevIngredients) {
        await supabase.from("recipe_ingredients").delete().eq("recipe_id", id)
        await supabase.from("recipe_ingredients").insert(prevIngredients)
      }
      if (prevSteps) {
        await supabase.from("recipe_steps").delete().eq("recipe_id", id)
        await supabase.from("recipe_steps").insert(prevSteps)
      }
      return NextResponse.json(
        { error: "Failed to update recipe ingredients/steps" },
        { status: 500 }
      )
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
  } catch (error) {
    return handleAuthError(error)
  }
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()

    const { error } = await supabase.from("recipes").delete().eq("id", id)

    if (error) {
      console.error("Error deleting recipe:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}

// PATCH /api/recipes/[id] - Partial updates (favorite, cooked, tags, meal_type)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { supabase } = await getAuthenticatedUser()
    const body = await request.json()

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

    // Handle meal_type update
    if (body.meal_type !== undefined) {
      const { error } = await supabase
        .from("recipes")
        .update({ meal_type: body.meal_type })
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Handle tags update
    if (body.tags !== undefined) {
      const { error } = await supabase
        .from("recipes")
        .update({ tags: body.tags })
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
  } catch (error) {
    return handleAuthError(error)
  }
}
