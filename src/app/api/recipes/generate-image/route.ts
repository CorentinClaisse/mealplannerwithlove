import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipeId, title, description, ingredients } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Recipe title is required" }, { status: 400 })
    }

    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // Build a prompt for the image
    const ingredientList = ingredients?.slice(0, 5).join(", ") || ""
    const prompt = `A beautiful, appetizing food photography of ${title}. ${description ? description + "." : ""} ${ingredientList ? `Made with ${ingredientList}.` : ""} Professional lighting, styled on a rustic wooden table, top-down view, warm colors, high resolution, food magazine style.`

    // Generate image with DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    })

    const imageUrl = response.data && response.data[0] ? response.data[0].url : null

    if (!imageUrl) {
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
    }

    // If recipeId is provided, update the recipe with the new image URL
    if (recipeId) {
      const { error: updateError } = await supabase
        .from("recipes")
        .update({ image_url: imageUrl })
        .eq("id", recipeId)

      if (updateError) {
        console.error("Failed to update recipe image:", updateError)
      }
    }

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error("Image generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    )
  }
}
