import { NextRequest, NextResponse } from "next/server"
import { escapePostgrestSearch } from "@/lib/utils/sanitize"
import {
  getAuthenticatedHousehold,
  getAuthenticatedUser,
  handleAuthError,
} from "@/lib/supabase/auth-helpers"

// GET /api/recipes - List recipes
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthenticatedUser()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search")
    const mealType = searchParams.get("mealType")
    const favorite = searchParams.get("favorite")

    // Build query
    let query = supabase
      .from("recipes")
      .select(
        `
      *,
      recipe_ingredients(
        *,
        ingredient:ingredients(*)
      ),
      recipe_steps(*)
    `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (search) {
      const escaped = escapePostgrestSearch(search)
      query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
    }

    if (mealType) {
      query = query.contains("meal_type", [mealType])
    }

    if (favorite === "true") {
      query = query.eq("is_favorite", true)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching recipes:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      recipes: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    return handleAuthError(error)
  }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, householdId } = await getAuthenticatedHousehold()
    const body = await request.json()

    // Create the recipe
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        household_id: householdId,
        created_by: user.id,
        title: body.title,
        description: body.description,
        prep_time_minutes: body.prepTime,
        cook_time_minutes: body.cookTime,
        servings: body.servings || 2,
        cuisine: body.cuisine,
        meal_type: body.mealType || [],
        tags: body.tags || [],
        source_type: body.sourceType || "manual",
        source_url: body.sourceUrl,
        image_url: body.imageUrl,
      })
      .select()
      .single()

    if (recipeError) {
      console.error("Error creating recipe:", recipeError)
      return NextResponse.json({ error: recipeError.message }, { status: 500 })
    }

    // Process related data — clean up the recipe row if anything fails
    try {
      // Process and insert ingredients
      if (body.ingredients?.length > 0) {
        for (let i = 0; i < body.ingredients.length; i++) {
          const ing = body.ingredients[i]
          const normalizedName = ing.name.toLowerCase().trim()

          // Find or create ingredient
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
              recipe_id: recipe.id,
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

      // Insert steps
      if (body.steps?.length > 0) {
        const stepInserts = body.steps.map((step: any, index: number) => ({
          recipe_id: recipe.id,
          step_number: index + 1,
          instruction: step.instruction,
          duration_minutes: step.duration,
          image_url: step.imageUrl,
        }))

        await supabase.from("recipe_steps").insert(stepInserts)
      }
    } catch (relatedError) {
      // Clean up the orphan recipe row on failure
      console.error("Error inserting recipe relations, rolling back:", relatedError)
      await supabase.from("recipes").delete().eq("id", recipe.id)
      return NextResponse.json(
        { error: "Failed to save recipe ingredients/steps" },
        { status: 500 }
      )
    }

    // Fetch the complete recipe with relations
    const { data: completeRecipe } = await supabase
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
      .eq("id", recipe.id)
      .single()

    return NextResponse.json({ recipe: completeRecipe }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
