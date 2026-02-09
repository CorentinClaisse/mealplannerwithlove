import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipeId, title } = await request.json()

    if (!title) {
      return NextResponse.json({ error: "Recipe title is required" }, { status: 400 })
    }

    if (!UNSPLASH_ACCESS_KEY) {
      return NextResponse.json({ error: "Unsplash API key not configured" }, { status: 500 })
    }

    // Search Unsplash for food photos matching the recipe title
    const searchQuery = encodeURIComponent(`${title} food dish meal`)
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=1&orientation=squarish&content_filter=high`

    const response = await fetch(unsplashUrl, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    })

    if (!response.ok) {
      console.error("Unsplash API error:", await response.text())
      return NextResponse.json({ error: "Failed to search for images" }, { status: 500 })
    }

    const data = await response.json()

    // Get the first result's regular-sized image
    const imageUrl = data.results?.[0]?.urls?.regular

    if (!imageUrl) {
      // Fallback: try a more generic food search
      const fallbackUrl = `https://api.unsplash.com/search/photos?query=delicious+food+plated&per_page=1&orientation=squarish`
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        const fallbackImageUrl = fallbackData.results?.[0]?.urls?.regular

        if (fallbackImageUrl) {
          return NextResponse.json({ imageUrl: fallbackImageUrl })
        }
      }

      return NextResponse.json({ error: "No images found" }, { status: 404 })
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
    console.error("Image search error:", error)
    return NextResponse.json(
      { error: "Failed to search for images" },
      { status: 500 }
    )
  }
}
