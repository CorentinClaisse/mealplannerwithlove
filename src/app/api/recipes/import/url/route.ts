import { createClient } from "@/lib/supabase/server"
import { extractRecipeFromText } from "@/lib/ai/claude"
import { URL_EXTRACT_PROMPT } from "@/lib/ai/prompts"
import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

export async function POST(request: NextRequest) {
  const supabase = await createClient() as any
  const { url } = await request.json()

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }

  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MealPrepBot/1.0; +https://mealprep.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Try to find JSON-LD structured data first
    let structuredData = null
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "")

        // Handle single recipe
        if (data["@type"] === "Recipe") {
          structuredData = data
        }

        // Handle @graph array
        if (Array.isArray(data["@graph"])) {
          const recipe = data["@graph"].find(
            (item: any) => item["@type"] === "Recipe"
          )
          if (recipe) structuredData = recipe
        }
      } catch {
        // Ignore parse errors
      }
    })

    // Extract metadata
    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      $("title").text().trim()

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content")

    // Remove non-content elements
    $(
      "script, style, nav, header, footer, aside, .sidebar, .comments, .advertisement, .ad"
    ).remove()

    // Try to find recipe-specific content
    const recipeContent =
      $('[itemtype*="Recipe"]').html() ||
      $(".recipe, .recipe-content, #recipe, article").first().html() ||
      $("main, .content, .post-content").first().html() ||
      $("body").html()

    // Convert to text and limit size
    const mainContent = cheerio
      .load(recipeContent || "")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 12000)

    // Build content for AI
    let contentForAI = ""

    if (structuredData) {
      contentForAI += `STRUCTURED DATA (JSON-LD):\n${JSON.stringify(structuredData, null, 2)}\n\n`
    }

    contentForAI += `PAGE TITLE: ${title}\n`
    if (description) contentForAI += `DESCRIPTION: ${description}\n`
    contentForAI += `\nPAGE CONTENT:\n${mainContent}`

    // Use Claude to extract and structure the recipe
    const parsedRecipe = await extractRecipeFromText(
      contentForAI,
      URL_EXTRACT_PROMPT
    )

    // Add source URL
    parsedRecipe.sourceUrl = url
    parsedRecipe.sourceType = "url_import"

    // Log the import
    const { data: profile } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single()

    if (profile?.household_id) {
      await supabase.from("recipe_imports").insert({
        household_id: profile.household_id,
        imported_by: user.id,
        import_type: "url",
        source_url: url,
        raw_ai_response: parsedRecipe,
        status: "completed",
        confidence_score: parsedRecipe.confidence || 0.9,
      })
    }

    return NextResponse.json({ recipe: parsedRecipe })
  } catch (error) {
    console.error("URL import error:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import recipe",
      },
      { status: 500 }
    )
  }
}
