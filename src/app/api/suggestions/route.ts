import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedHousehold, handleAuthError } from "@/lib/supabase/auth-helpers"
import { anthropic } from "@/lib/ai/claude"
import { RECIPE_SUGGESTION_PROMPT } from "@/lib/ai/prompts"
import type { SuggestionsResponse } from "@/types/suggestions"

// GET - Get recipe suggestions based on inventory
export async function GET(request: NextRequest) {
  try {
    const { supabase, householdId } = await getAuthenticatedHousehold()

    // Fetch inventory items
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from("inventory_items")
      .select("name, quantity, unit, location")
      .eq("household_id", householdId)

    if (inventoryError) {
      console.error("Error fetching inventory:", inventoryError)
      return NextResponse.json(
        { error: "Failed to fetch inventory" },
        { status: 500 }
      )
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      return NextResponse.json(
        { error: "No inventory items found. Add some items first!" },
        { status: 400 }
      )
    }

    // Fetch user's existing recipes for context
    const { data: userRecipes } = await supabase
      .from("recipes")
      .select("title, meal_type, tags")
      .eq("household_id", householdId)
      .limit(20)

    // Generate the prompt
    const prompt = RECIPE_SUGGESTION_PROMPT(
      inventoryItems.map(item => ({
        name: item.name,
        quantity: item.quantity ?? undefined,
        unit: item.unit ?? undefined,
        location: item.location,
      })),
      userRecipes || []
    )

    // Call Claude for suggestions
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : ""

    // Parse the response
    let suggestions: SuggestionsResponse

    try {
      // Clean up response - remove any markdown formatting
      const cleanResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      suggestions = JSON.parse(cleanResponse)
    } catch (parseError) {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        console.error("Failed to parse AI response:", responseText)
        return NextResponse.json(
          { error: "Failed to parse suggestions" },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(suggestions)
  } catch (error) {
    return handleAuthError(error)
  }
}
